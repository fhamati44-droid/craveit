import { base44 } from '@/api/base44Client';

export async function getHomepageSection() {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'getHomepageSection' });
  return res?.data ?? res;
}

export async function getConfig() {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'getConfig' });
  return res?.data ?? res;
}

export async function getPublishedProposals(filter = 'new', limit = 20, extra = {}) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'getPublishedProposals', payload: { filter, limit, ...extra } });
  return res?.data ?? res;
}

export async function getProposalDetail(proposalId) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'getProposalDetail', payload: { proposal_id: proposalId } });
  return res?.data ?? res;
}

export async function toggleLike(proposalId) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'toggleLike', payload: { proposal_id: proposalId } });
  return res?.data ?? res;
}

export async function addComment(proposalId, body) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'addComment', payload: { proposal_id: proposalId, body } });
  return res?.data ?? res;
}

export async function deleteComment(commentId) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'deleteComment', payload: { comment_id: commentId } });
  return res?.data ?? res;
}

export async function recordShare(proposalId, channel) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'recordShare', payload: { proposal_id: proposalId, channel } });
  return res?.data ?? res;
}

export async function submitProposal(data) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'submitProposal', payload: data });
  return res?.data ?? res;
}

export async function saveDraft(data) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'saveDraft', payload: data });
  return res?.data ?? res;
}

export async function loadDraft() {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'loadDraft' });
  return res?.data ?? res;
}

export async function deleteDraft() {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'deleteDraft' });
  return res?.data ?? res;
}

export async function getMyProposals() {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'getMyProposals' });
  return res?.data ?? res;
}

export async function adminTestPublishFlow(proposalId) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminTestPublishFlow', payload: { proposal_id: proposalId } });
  return res?.data ?? res;
}

export async function reportProposal(proposalId, reason, details) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'reportProposal', payload: { proposal_id: proposalId, reason, details } });
  return res?.data ?? res;
}

export async function updateMyAvatar(avatarType, avatarKey, avatarUrl, displayName) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'updateMyAvatar', payload: { avatar_type: avatarType, avatar_key: avatarKey, avatar_url: avatarUrl, display_name: displayName } });
  return res?.data ?? res;
}

// Admin functions
export async function adminGetProposals(status = 'pending_review') {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminGetProposals', payload: { status } });
  return res?.data ?? res;
}

export async function adminGetReports() {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminGetReports' });
  return res?.data ?? res;
}

export async function adminGetComments() {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminGetComments' });
  return res?.data ?? res;
}

export async function adminGetAuditLog() {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminGetAuditLog' });
  return res?.data ?? res;
}

export async function adminApproveProposal(proposalId, note) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminApproveProposal', payload: { proposal_id: proposalId, note } });
  return res?.data ?? res;
}

export async function adminRejectProposal(proposalId, note) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminRejectProposal', payload: { proposal_id: proposalId, note } });
  return res?.data ?? res;
}

export async function adminPauseProposal(proposalId) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminPauseProposal', payload: { proposal_id: proposalId } });
  return res?.data ?? res;
}

export async function adminFeatureProposal(proposalId, featuredOrder) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminFeatureProposal', payload: { proposal_id: proposalId, featured_order: featuredOrder } });
  return res?.data ?? res;
}

export async function adminSetTarget(proposalId, target, currentTarget) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminSetTarget', payload: { proposal_id: proposalId, target, current_target: currentTarget } });
  return res?.data ?? res;
}

export async function adminModerateComment(commentId, status) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminModerateComment', payload: { comment_id: commentId, status } });
  return res?.data ?? res;
}

export async function adminInvalidateLikes(proposalId) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminInvalidateLikes', payload: { proposal_id: proposalId } });
  return res?.data ?? res;
}

export async function adminApproveReward(proposalId, rewardType) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminApproveReward', payload: { proposal_id: proposalId, reward_type: rewardType } });
  return res?.data ?? res;
}

export async function adminRejectReward(proposalId) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminRejectReward', payload: { proposal_id: proposalId } });
  return res?.data ?? res;
}

export async function adminArchiveProposal(proposalId) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminArchiveProposal', payload: { proposal_id: proposalId } });
  return res?.data ?? res;
}

export async function adminTestProposalVisibility(proposalId) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminTestProposalVisibility', payload: { proposal_id: proposalId } });
  return res?.data ?? res;
}

export async function adminSaveConfig(config) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminSaveConfig', payload: config });
  return res?.data ?? res;
}

export async function adminListReferences() {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminListReferences' });
  return res?.data ?? res;
}

export async function adminAddReference(data) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminAddReference', payload: data });
  return res?.data ?? res;
}

export async function adminUpdateReference(data) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminUpdateReference', payload: data });
  return res?.data ?? res;
}

export async function adminDeleteReference(id) {
  const res = await base44.functions.invoke('communityMoodEngine', { action: 'adminDeleteReference', payload: { id } });
  return res?.data ?? res;
}