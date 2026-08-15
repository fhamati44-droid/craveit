import { base44 } from '@/api/base44Client';

function invoke(action, payload = {}) {
  return base44.functions
    .invoke('partnerAccessAdmin', { action, payload })
    .then((r) => r?.data?.data ?? r?.data ?? r);
}

// Restaurants are read-open (RLS read = {}), so the client can list directly.
export const listRestaurantsForAccess = () =>
  base44.entities.Restaurant.list('-name', 300).then((l) => l || []);

export const createInvite = (payload) => invoke('create_invite', payload);
export const listInvites = () => invoke('list_invites', {});
export const resendInvite = (id) => invoke('resend_invite', { id });
export const revokeInvite = (id) => invoke('revoke_invite', { id });
export const grantExisting = (payload) => invoke('grant_existing_user', payload);
export const listMembers = (restaurant_id) => invoke('list_restaurant_members', { restaurant_id });
export const revokeMembership = (id) => invoke('revoke_membership', { id });