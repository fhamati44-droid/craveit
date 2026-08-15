// Shared auth/membership helpers for backend functions (campaignEngine, partnerEngine, …).
// Plain module — no Deno.serve. Import with: import { requireAdmin, currentUser, ensureMembership } from "../../shared/partnerShared.ts";

export async function requireAdmin(base44) {
  let user = null;
  try { user = await base44.auth.me(); } catch {}
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function currentUser(base44) {
  try { return await base44.auth.me(); } catch { return null; }
}

// Returns the active membership for the user on this restaurant, or null.
// Admins bypass with a synthetic membership object (is_demo:false).
export async function ensureMembership(SR, user, restaurant_id) {
  if (!user) return null;
  if (user.role === 'admin') return { is_demo: false };
  const m = await SR.entities.RestaurantMembership.filter({ user_id: user.id, restaurant_id, status: 'active' }).catch(() => []);
  return (m || [])[0] || null;
}