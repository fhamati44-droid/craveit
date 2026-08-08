import { base44 } from '@/api/base44Client';

function invoke(action, payload = {}) {
  return base44.functions.invoke('communityMoodEngine', { action, payload }).then((r) => r?.data ?? r);
}

// ===== Admin: Posts =====
export const adminGetMoodGamePosts = (status = 'all', review_status = 'all') =>
  invoke('adminGetMoodGamePosts', { status, review_status });

export const adminGetMoodGamePostDetail = (post_id) =>
  invoke('adminGetMoodGamePostDetail', { post_id });

export const adminStartReview = (post_id) =>
  invoke('adminStartReview', { post_id });

export const adminSaveReviewDecision = (post_id, decision) =>
  invoke('adminSaveReviewDecision', { post_id, ...decision });

export const adminHidePost = (post_id) =>
  invoke('adminHidePost', { post_id });

export const adminUnhidePost = (post_id) =>
  invoke('adminUnhidePost', { post_id });

// ===== Admin: Comments =====
export const adminGetMoodGameComments = () =>
  invoke('adminGetMoodGameComments');

export const adminModerateComment = (comment_id, status) =>
  invoke('adminModerateComment', { comment_id, status });

// ===== Admin: Test tool =====
export const adminSimulate100Likes = (post_id) =>
  invoke('adminSimulate100Likes', { post_id });

// ===== Shared review-status labels =====
export const REVIEW_STATUS_META = {
  normal:        { label: 'منشور',            tone: 'text-on-surface-variant bg-surface-container-high' },
  qualified:     { label: 'وصل 100 لايك',      tone: 'text-tertiary bg-tertiary/15' },
  under_review:  { label: 'قيد مراجعة TAMAM',  tone: 'text-primary bg-primary/15' },
  approved:      { label: 'تم اعتماد الفكرة',   tone: 'text-primary bg-primary-container' },
  rejected:      { label: 'ما قدرنا ننفذها',    tone: 'text-error bg-error/15' },
  converted:     { label: 'صار عرض حقيقي',     tone: 'text-primary bg-primary/20' },
};

export const PUBLISH_STATUS_META = {
  draft:           { label: 'مسودة',        tone: 'text-on-surface-variant bg-surface-container-high' },
  pending_review:  { label: 'بانتظار النشر',  tone: 'text-tertiary bg-tertiary/15' },
  published:       { label: 'منشور',         tone: 'text-primary bg-primary/15' },
  rejected:        { label: 'مرفوض',         tone: 'text-error bg-error/15' },
  paused:          { label: 'موقوف',         tone: 'text-on-surface-variant bg-surface-container-high' },
  archived:        { label: 'مؤرشف',         tone: 'text-on-surface-variant bg-surface-container-high' },
  hidden:          { label: 'مخفي',          tone: 'text-error bg-error/15' },
};