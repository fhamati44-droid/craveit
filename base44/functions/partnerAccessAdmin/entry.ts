import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import { json, errRes } from '../../shared/httpHelpers.ts';
import { OWNER_PERMISSIONS, authError, logAudit } from '../../shared/partnerAuth.ts';

// ============================================================================
// partnerAccessAdmin — admin-only Restaurant Access Management.
//
// Admin actions (requireAdmin): create_invite, list_invites, resend_invite,
// revoke_invite, grant_existing_user, list_restaurant_members, revoke_membership.
//
// Authenticated action (any logged-in user, email-bound): claim_my_partner_invites.
//
// Security:
// - Every admin action verifies base44.auth.me().role === 'admin' server-side.
// - claim matches the authenticated user's email exactly (case-insensitive).
// - Claimed memberships are scoped to invite.restaurant_id only and copy only
//   the permissions configured on the invitation.
// - Revoked / expired invitations cannot be claimed.
// - The invited user is never given the global admin role (invited as 'user').
// - Duplicate active invites and duplicate active memberships are prevented.
// - Existing real memberships are never overwritten.
// ============================================================================

const BATCH_ID = 'tamam-demo-partner-v1';

const MANAGER_PERMISSIONS = [
  'view_dashboard', 'manage_menu', 'import_menu', 'manage_availability',
  'manage_operational_status', 'request_offers', 'view_offers',
  'manage_orders', 'view_performance', 'manage_demand_schedule',
];
const EMPLOYEE_PERMISSIONS = ['view_dashboard', 'manage_orders', 'manage_availability'];
const DEMO_REVIEWER_PERMISSIONS = [
  'view_dashboard', 'view_offers', 'view_performance',
  'manage_menu', 'manage_demand_schedule',
];

function permsFor(role) {
  if (role === 'owner') return OWNER_PERMISSIONS.slice();
  if (role === 'manager') return MANAGER_PERMISSIONS.slice();
  if (role === 'employee') return EMPLOYEE_PERMISSIONS.slice();
  if (role === 'demo_reviewer') return DEMO_REVIEWER_PERMISSIONS.slice();
  return [];
}

function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function expiryToDate(expiry) {
  if (!expiry || expiry === 'none') return null;
  const now = Date.now();
  if (expiry === '24h') return new Date(now + 24 * 3600 * 1000).toISOString();
  if (expiry === '7d') return new Date(now + 7 * 24 * 3600 * 1000).toISOString();
  if (expiry === '30d') return new Date(now + 30 * 24 * 3600 * 1000).toISOString();
  return null;
}

async function requireAdmin(base44) {
  const user = await base44.auth.me();
  if (!user) throw { status: 401, message: 'auth_required' };
  if (user.role !== 'admin') throw { status: 403, message: 'admin_only' };
  return user;
}

async function requireAuth(base44) {
  const user = await base44.auth.me();
  if (!user) throw { status: 401, message: 'auth_required' };
  return user;
}

async function getRestaurant(base44, id) {
  const list = await base44.asServiceRole.entities.Restaurant.filter({ id }, '-created_date', 5).catch(() => []);
  return (list || [])[0] || null;
}

async function findUserByEmail(base44, email) {
  const list = await base44.asServiceRole.entities.User.filter({ email }, '-created_date', 10).catch(() => []);
  return (list || [])[0] || null;
}

async function findActiveInvite(base44, email, restaurantId) {
  const list = await base44.asServiceRole.entities.RestaurantPartnerInvite
    .filter({ email, restaurant_id: restaurantId }, '-created_date', 50).catch(() => []);
  return (list || []).find((i) => i.status === 'pending' || i.status === 'accepted') || null;
}

export default async function partnerAccessAdmin(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const payload = body?.payload || {};

    switch (action) {
      case 'claim_my_partner_invites': return json({ data: await claimInvites(base44) });
      case 'create_invite': return json({ data: await createInvite(base44, payload) });
      case 'list_invites': return json({ data: await listInvites(base44) });
      case 'resend_invite': return json({ data: await resendInvite(base44, payload) });
      case 'revoke_invite': return json({ data: await revokeInvite(base44, payload) });
      case 'grant_existing_user': return json({ data: await grantExisting(base44, payload) });
      case 'list_restaurant_members': return json({ data: await listMembers(base44, payload) });
      case 'revoke_membership': return json({ data: await revokeMembership(base44, payload) });
      default: return json({ error: 'unknown_action' }, 400);
    }
  } catch (e) { return errRes(e); }
}

// ---------------------------------------------------------------------------
// create_invite
// ---------------------------------------------------------------------------
async function createInvite(base44, payload) {
  const admin = await requireAdmin(base44);
  const email = normEmail(payload.email);
  const restaurantId = payload.restaurant_id;
  const role = payload.partner_role;
  const expiry = payload.expiry || 'none';
  if (!email || !restaurantId || !role) throw { status: 400, message: 'missing_fields' };

  const restaurant = await getRestaurant(base44, restaurantId);
  if (!restaurant) throw { status: 404, message: 'restaurant_not_found' };
  if (role === 'demo_reviewer' && !restaurant.is_demo) {
    throw { status: 400, message: 'demo_reviewer_requires_demo_restaurant' };
  }

  const existing = await findActiveInvite(base44, email, restaurantId);
  if (existing) throw { status: 409, message: 'duplicate_invite' };

  const expiresAt = expiryToDate(expiry);
  const invite = await base44.asServiceRole.entities.RestaurantPartnerInvite.create({
    email, restaurant_id: restaurantId, partner_role: role, permissions: permsFor(role),
    status: 'pending', expires_at: expiresAt, invited_by_user_id: admin.id,
    is_demo: !!restaurant.is_demo,
  });

  // Invite the person to the app as a regular user (never admin). If the user
  // already exists, the platform rejects the duplicate — that's fine, the
  // invite record still lets them claim access on next login.
  const existingUser = await findUserByEmail(base44, email);
  if (!existingUser) {
    try { await base44.users.inviteUser(email, 'user'); } catch { /* already invited / exists */ }
  }

  await logAudit(base44, restaurantId, admin.id, admin.full_name || 'admin',
    'partner_invite', invite.id, 'invite_created', null, JSON.stringify({ email, role, expiry }));

  return { ok: true, invite_id: invite.id, already_user: !!existingUser };
}

// ---------------------------------------------------------------------------
// list_invites
// ---------------------------------------------------------------------------
async function listInvites(base44) {
  await requireAdmin(base44);
  const list = await base44.asServiceRole.entities.RestaurantPartnerInvite
    .list('-created_date', 200).catch(() => []);
  const restaurants = await base44.asServiceRole.entities.Restaurant.list('name', 300).catch(() => []);
  const rMap = {};
  (restaurants || []).forEach((r) => { rMap[r.id] = r; });
  // Resolve accepted user emails in one pass
  const userIds = [...new Set((list || []).map((i) => i.accepted_user_id).filter(Boolean))];
  const users = {};
  for (const uid of userIds) {
    const u = await base44.asServiceRole.entities.User.filter({ id: uid }, '-created_date', 3).catch(() => []);
    if (u && u[0]) users[uid] = u[0];
  }
  return (list || []).map((i) => ({
    id: i.id, email: i.email, restaurant_id: i.restaurant_id,
    restaurant_name: rMap[i.restaurant_id]?.name_ar || rMap[i.restaurant_id]?.name || '—',
    restaurant_is_demo: !!rMap[i.restaurant_id]?.is_demo,
    partner_role: i.partner_role, permissions: i.permissions || [],
    status: i.status, expires_at: i.expires_at, accepted_at: i.accepted_at,
    accepted_user_id: i.accepted_user_id, accepted_user_email: users[i.accepted_user_id]?.email || '',
    invited_by_user_id: i.invited_by_user_id, is_demo: !!i.is_demo, created_date: i.created_date,
  }));
}

// ---------------------------------------------------------------------------
// resend_invite
// ---------------------------------------------------------------------------
async function resendInvite(base44, payload) {
  const admin = await requireAdmin(base44);
  const id = payload.id;
  if (!id) throw { status: 400, message: 'missing_id' };
  const list = await base44.asServiceRole.entities.RestaurantPartnerInvite.filter({ id }, '-created_date', 5).catch(() => []);
  const inv = (list || [])[0];
  if (!inv) throw { status: 404, message: 'invite_not_found' };
  if (inv.status === 'revoked' || inv.status === 'accepted') throw { status: 409, message: 'invite_not_resendable' };
  const existingUser = await findUserByEmail(base44, inv.email);
  if (!existingUser) {
    try { await base44.users.inviteUser(inv.email, 'user'); } catch { /* ignore */ }
  }
  await base44.asServiceRole.entities.RestaurantPartnerInvite.update(id, { updated_date: new Date().toISOString() }).catch(() => {});
  await logAudit(base44, inv.restaurant_id, admin.id, admin.full_name || 'admin', 'partner_invite', id, 'invite_resent', null, null);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// revoke_invite
// ---------------------------------------------------------------------------
async function revokeInvite(base44, payload) {
  const admin = await requireAdmin(base44);
  const id = payload.id;
  if (!id) throw { status: 400, message: 'missing_id' };
  const list = await base44.asServiceRole.entities.RestaurantPartnerInvite.filter({ id }, '-created_date', 5).catch(() => []);
  const inv = (list || [])[0];
  if (!inv) throw { status: 404, message: 'invite_not_found' };
  await base44.asServiceRole.entities.RestaurantPartnerInvite.update(id, { status: 'revoked' });
  await logAudit(base44, inv.restaurant_id, admin.id, admin.full_name || 'admin', 'partner_invite', id, 'invite_revoked', inv.status, 'revoked');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// grant_existing_user — grant membership now to an already-registered user
// ---------------------------------------------------------------------------
async function grantExisting(base44, payload) {
  const admin = await requireAdmin(base44);
  const email = normEmail(payload.email);
  const restaurantId = payload.restaurant_id;
  const role = payload.partner_role;
  if (!email || !restaurantId || !role) throw { status: 400, message: 'missing_fields' };

  const restaurant = await getRestaurant(base44, restaurantId);
  if (!restaurant) throw { status: 404, message: 'restaurant_not_found' };
  if (role === 'demo_reviewer' && !restaurant.is_demo) {
    throw { status: 400, message: 'demo_reviewer_requires_demo_restaurant' };
  }

  const user = await findUserByEmail(base44, email);
  if (!user) throw { status: 404, message: 'user_not_found' };

  const existingM = await base44.asServiceRole.entities.RestaurantMembership
    .filter({ user_id: user.id, restaurant_id: restaurantId, status: 'active' }, '-created_date', 10).catch(() => []);
  if (existingM && existingM.length) throw { status: 409, message: 'already_member' };

  const membership = await base44.asServiceRole.entities.RestaurantMembership.create({
    user_id: user.id, restaurant_id: restaurantId, partner_role: role, status: 'active',
    permissions: permsFor(role), activated_at: new Date().toISOString(),
    is_demo: !!restaurant.is_demo, demo_batch_id: restaurant.demo_batch_id || '',
  });

  // Mark any matching pending invite accepted
  const inv = await findActiveInvite(base44, email, restaurantId);
  if (inv) {
    await base44.asServiceRole.entities.RestaurantPartnerInvite.update(inv.id, {
      status: 'accepted', accepted_at: new Date().toISOString(), accepted_user_id: user.id,
    }).catch(() => {});
  }

  await logAudit(base44, restaurantId, admin.id, admin.full_name || 'admin', 'partner_membership', membership.id, 'membership_granted', null, JSON.stringify({ email, role }));
  return { ok: true, membership_id: membership.id };
}

// ---------------------------------------------------------------------------
// list_restaurant_members
// ---------------------------------------------------------------------------
async function listMembers(base44, payload) {
  await requireAdmin(base44);
  const restaurantId = payload.restaurant_id;
  if (!restaurantId) throw { status: 400, message: 'missing_restaurant_id' };
  const list = await base44.asServiceRole.entities.RestaurantMembership
    .filter({ restaurant_id: restaurantId }, '-created_date', 200).catch(() => []);
  const userIds = [...new Set((list || []).map((m) => m.user_id).filter(Boolean))];
  const users = {};
  for (const uid of userIds) {
    const u = await base44.asServiceRole.entities.User.filter({ id: uid }, '-created_date', 3).catch(() => []);
    if (u && u[0]) users[uid] = u[0];
  }
  return (list || []).map((m) => ({
    id: m.id, user_id: m.user_id, user_email: users[m.user_id]?.email || '', user_name: users[m.user_id]?.full_name || '',
    partner_role: m.partner_role, status: m.status, permissions: m.permissions || [],
    is_demo: !!m.is_demo, created_date: m.created_date,
  }));
}

// ---------------------------------------------------------------------------
// revoke_membership
// ---------------------------------------------------------------------------
async function revokeMembership(base44, payload) {
  const admin = await requireAdmin(base44);
  const id = payload.id;
  if (!id) throw { status: 400, message: 'missing_id' };
  const list = await base44.asServiceRole.entities.RestaurantMembership.filter({ id }, '-created_date', 5).catch(() => []);
  const m = (list || [])[0];
  if (!m) throw { status: 404, message: 'membership_not_found' };
  await base44.asServiceRole.entities.RestaurantMembership.update(id, { status: 'revoked' });
  await logAudit(base44, m.restaurant_id, admin.id, admin.full_name || 'admin', 'partner_membership', id, 'membership_revoked', m.status, 'revoked');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// claim_my_partner_invites — authenticated, email-bound
// ---------------------------------------------------------------------------
async function claimInvites(base44) {
  const user = await requireAuth(base44);
  const email = normEmail(user.email);
  if (!email) return { claimed: [] };

  const invites = await base44.asServiceRole.entities.RestaurantPartnerInvite
    .filter({ email, status: 'pending' }, '-created_date', 100).catch(() => []);
  const now = new Date();
  const claimed = [];

  for (const inv of (invites || [])) {
    // Expired → mark expired, skip
    if (inv.expires_at && new Date(inv.expires_at) < now) {
      await base44.asServiceRole.entities.RestaurantPartnerInvite.update(inv.id, { status: 'expired' }).catch(() => {});
      continue;
    }
    // Revoked can't reach here (status filter = pending), but guard anyway
    if (inv.status !== 'pending') continue;

    const restaurant = await getRestaurant(base44, inv.restaurant_id);
    // Demo reviewer may only claim against a demo restaurant
    if (inv.partner_role === 'demo_reviewer' && restaurant && !restaurant.is_demo) {
      await base44.asServiceRole.entities.RestaurantPartnerInvite.update(inv.id, { status: 'revoked' }).catch(() => {});
      continue;
    }

    // Never overwrite an existing real membership — if one exists, just mark accepted
    const existing = await base44.asServiceRole.entities.RestaurantMembership
      .filter({ user_id: user.id, restaurant_id: inv.restaurant_id, status: 'active' }, '-created_date', 5).catch(() => []);
    if (existing && existing.length) {
      await base44.asServiceRole.entities.RestaurantPartnerInvite.update(inv.id, {
        status: 'accepted', accepted_at: now.toISOString(), accepted_user_id: user.id,
      }).catch(() => {});
      continue;
    }

    await base44.asServiceRole.entities.RestaurantMembership.create({
      user_id: user.id, restaurant_id: inv.restaurant_id, partner_role: inv.partner_role,
      status: 'active', permissions: inv.permissions || [], activated_at: now.toISOString(),
      is_demo: !!restaurant?.is_demo, demo_batch_id: restaurant?.demo_batch_id || '',
    });
    await base44.asServiceRole.entities.RestaurantPartnerInvite.update(inv.id, {
      status: 'accepted', accepted_at: now.toISOString(), accepted_user_id: user.id,
    });
    await logAudit(base44, inv.restaurant_id, user.id, user.email || '', 'partner_invite', inv.id, 'invite_claimed', null, JSON.stringify({ email, role: inv.partner_role }));
    claimed.push(inv.restaurant_id);
  }

  return { claimed };
}