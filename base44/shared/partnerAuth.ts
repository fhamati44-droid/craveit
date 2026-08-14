// Server-side membership + permission enforcement for the Restaurant Partner OS.
// Every partner action in partnerEngine MUST call resolveMembership() before
// reading or writing any restaurant-owned record. Base44 RLS cannot express a
// cross-entity "user has an active membership for this restaurant" check, so
// this module is the authoritative access control layer.

export const PERMISSIONS = [
  "view_dashboard",
  "manage_menu",
  "import_menu",
  "manage_availability",
  "manage_operational_status",
  "manage_guardrails",
  "request_offers",
  "view_offers",
  "manage_orders",
  "view_performance",
  "manage_staff",
  "manage_restaurant_settings",
  "manage_demand_schedule",
];

export const OWNER_PERMISSIONS = PERMISSIONS.slice();

export function authError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// All active memberships for a user (service-role read; RLS would self-scope
// but we run asServiceRole in the engine to also return restaurant snapshots).
export async function getMemberships(base44, userId) {
  const list = await base44.asServiceRole.entities.RestaurantMembership.filter({
    user_id: userId,
    status: "active",
  });
  return list || [];
}

// Resolve the authenticated user + their active membership for a restaurant.
// TAMAM admins bypass the membership requirement (isAdmin=true).
// Throws an authError (401/403) if access is not allowed.
export async function resolveMembership(base44, restaurantId, permission) {
  const user = await base44.auth.me();
  if (!user) throw authError(401, "auth_required");
  if (user.role === "admin") {
    return { user, membership: null, isAdmin: true };
  }
  const memberships = await getMemberships(base44, user.id);
  const membership = memberships.find((m) => m.restaurant_id === restaurantId);
  if (!membership) throw authError(403, "no_membership");
  // Owners always hold every permission (prevents lock-out when new
  // permissions are added after a membership was created).
  if (permission && membership.partner_role !== "owner" && !(membership.permissions || []).includes(permission)) {
    throw authError(403, "no_permission");
  }
  return { user, membership, isAdmin: false };
}

// Load restaurant snapshots for a list of membership restaurant ids.
export async function loadRestaurantsForMemberships(base44, memberships) {
  const ids = [...new Set((memberships || []).map((m) => m.restaurant_id).filter(Boolean))];
  if (!ids.length) return [];
  const all = await base44.asServiceRole.entities.Restaurant.list("name", 200);
  return (all || []).filter((r) => ids.includes(r.id));
}

export async function logAudit(base44, restaurantId, actorId, actorName, entityType, entityId, action, prev, next, reason) {
  try {
    await base44.asServiceRole.entities.RestaurantAuditLog.create({
      restaurant_id: restaurantId,
      actor_id: actorId || "",
      actor_name: actorName || "",
      entity_type: entityType,
      entity_id: entityId || "",
      action,
      previous_value: prev != null ? (typeof prev === "string" ? prev : JSON.stringify(prev)) : "",
      new_value: next != null ? (typeof next === "string" ? next : JSON.stringify(next)) : "",
      reason: reason || "",
    });
  } catch {
    // audit is best-effort; never block the action
  }
}