import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const ADMIN = (user) => user?.role === 'admin';
const parseJSON = (str, fallback) => { try { return JSON.parse(str) } catch { return fallback } };

function sanitizeText(text, maxLen = 300) {
  if (!text) return '';
  return String(text).replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
}

function getAvatarInfo(user) {
  return {
    display_name: user.display_name || user.full_name || (user.email ? user.email.split('@')[0] : 'مستخدم TAMAM'),
    avatar_type: user.avatar_type || 'tamam',
    avatar_key: user.avatar_key || 'n1',
    avatar_url: user.avatar_url || null,
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { action, payload = {} } = await req.json();

    // ===== PUBLIC ACTIONS =====

    if (action === 'getConfig') {
      let configs = await base44.asServiceRole.entities.CommunityMoodConfig.list('-created_date', 5).catch(() => []);
      let config = (configs && configs[0]) || null;
      if (!config) {
        config = await base44.asServiceRole.entities.CommunityMoodConfig.create({
          is_enabled: true,
          section_title_ar: 'اصنع مودك على طاولة TAMAM',
          section_title_he: 'צרו את המוד שלכם על שולחן TAMAM',
          selection_mode: 'automatic',
          max_cards: 6,
          default_target_likes: 100,
        });
      }
      return Response.json({ data: config });
    }

    if (action === 'getHomepageSection') {
      let configs = await base44.asServiceRole.entities.CommunityMoodConfig.list('-created_date', 5).catch(() => []);
      let config = (configs && configs[0]) || null;
      if (!config) {
        config = await base44.asServiceRole.entities.CommunityMoodConfig.create({
          is_enabled: true, section_title_ar: 'اصنع مودك على طاولة TAMAM', selection_mode: 'automatic', max_cards: 6, default_target_likes: 100,
        });
      }
      if (!config.is_enabled) return Response.json({ data: { enabled: false, config, proposals: [] } });

      let proposals = [];
      const maxCards = config.max_cards || 6;

      if (config.selection_mode === 'manual' && config.manual_proposal_ids?.length) {
        const ids = config.manual_proposal_ids.slice(0, maxCards);
        const all = await base44.asServiceRole.entities.CommunityMoodProposal.list('-created_date', 200).catch(() => []);
        proposals = (all || []).filter((p) => ids.includes(p.id) && p.status === 'published')
          .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      } else {
        // automatic: featured first, then near target, then newest
        const all = await base44.asServiceRole.entities.CommunityMoodProposal.filter({ status: 'published' }, '-created_date', 100).catch(() => []);
        const featured = (all || []).filter((p) => p.is_featured).sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
        const nearTarget = (all || []).filter((p) => !p.is_featured && p.valid_likes_count >= (p.target_likes || 100) * 0.7)
          .sort((a, b) => b.valid_likes_count - a.valid_likes_count);
        const rest = (all || []).filter((p) => !p.is_featured && p.valid_likes_count < (p.target_likes || 100) * 0.7);
        proposals = [...featured, ...nearTarget, ...rest].slice(0, maxCards);
      }

      // Get latest comment preview + supporter avatars for each proposal
      const proposalIds = proposals.map((p) => p.id);
      let commentsMap = {};
      let likesMap = {};
      if (proposalIds.length) {
        const [allComments, allLikes] = await Promise.all([
          base44.asServiceRole.entities.CommunityMoodComment.list('-created_date', 500).catch(() => []),
          base44.asServiceRole.entities.CommunityMoodLike.filter({ status: 'active' }, '-created_date', 500).catch(() => []),
        ]);
        (allComments || []).forEach((c) => {
          if (c.status === 'active' && proposalIds.includes(c.proposal_id)) {
            if (!commentsMap[c.proposal_id]) commentsMap[c.proposal_id] = c;
          }
        });
        (allLikes || []).forEach((l) => {
          if (l.is_valid !== false && proposalIds.includes(l.proposal_id)) {
            (likesMap[l.proposal_id] = likesMap[l.proposal_id] || []).push(l);
          }
        });
      }

      const result = proposals.map((p) => ({
        ...p,
        meal_snapshots: parseJSON(p.meal_snapshots, []),
        restaurant_snapshots: parseJSON(p.restaurant_snapshots, []),
        table_layout: parseJSON(p.table_layout_json, {}),
        latest_comment: commentsMap[p.id] || null,
        supporters: (likesMap[p.id] || []).slice(0, 5),
      }));

      return Response.json({ data: { enabled: true, config, proposals: result } });
    }

    if (action === 'getPublishedProposals') {
      const filter = payload.filter || 'new';
      const limit = payload.limit || 20;
      let proposals = await base44.asServiceRole.entities.CommunityMoodProposal.filter({ status: 'published' }, '-created_date', 100).catch(() => []);
      proposals = proposals || [];

      if (filter === 'near_target') {
        proposals = proposals.filter((p) => p.valid_likes_count >= (p.target_likes || 100) * 0.5)
          .sort((a, b) => (b.valid_likes_count / (b.target_likes || 100)) - (a.valid_likes_count / (a.target_likes || 100)));
      } else if (filter === 'tamam_picks') {
        proposals = proposals.filter((p) => p.is_featured).sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
      } else if (filter === 'reached_target') {
        proposals = proposals.filter((p) => p.valid_likes_count >= (p.target_likes || 100));
      } else if (filter === 'by_restaurant' && payload.restaurant_id) {
        proposals = proposals.filter((p) => (p.restaurant_ids || []).includes(Number(payload.restaurant_id)));
      } else if (filter === 'by_category' && payload.category) {
        proposals = proposals.filter((p) => {
          const meals = parseJSON(p.meal_snapshots, []);
          return meals.some((m) => m.category === payload.category);
        });
      }

      proposals = proposals.slice(0, limit).map((p) => ({
        ...p,
        meal_snapshots: parseJSON(p.meal_snapshots, []),
        restaurant_snapshots: parseJSON(p.restaurant_snapshots, []),
        table_layout: parseJSON(p.table_layout_json, {}),
      }));

      return Response.json({ data: proposals });
    }

    if (action === 'getProposalDetail') {
      const proposal = await base44.asServiceRole.entities.CommunityMoodProposal.get(payload.proposal_id).catch(() => null);
      if (!proposal) return Response.json({ error: 'not_found' }, { status: 404 });
      if (proposal.status !== 'published' && proposal.status !== 'pending_review') {
        // Only admin can see non-published
        const user = await base44.auth.me().catch(() => null);
        if (!ADMIN(user)) return Response.json({ error: 'not_found' }, { status: 404 });
      }

      // Increment views
      await base44.asServiceRole.entities.CommunityMoodProposal.update(proposal.id, { views_count: (proposal.views_count || 0) + 1 }).catch(() => {});

      // Check if current user liked
      let userLiked = false;
      let currentUser = null;
      try { currentUser = await base44.auth.me(); } catch {}
      if (currentUser) {
        const existing = await base44.asServiceRole.entities.CommunityMoodLike.filter({ proposal_id: proposal.id, user_id: currentUser.id, status: 'active' }).catch(() => []);
        userLiked = (existing || []).some((l) => l.is_valid !== false);
      }

      // Get comments (active)
      const comments = await base44.asServiceRole.entities.CommunityMoodComment.filter({ proposal_id: proposal.id, status: 'active' }, '-created_date', 100).catch(() => []);

      // Get supporter avatars (active valid likes, max 5)
      const likes = await base44.asServiceRole.entities.CommunityMoodLike.filter({ proposal_id: proposal.id, status: 'active' }, '-created_date', 50).catch(() => []);
      const supporters = (likes || []).filter((l) => l.is_valid !== false).slice(0, 5);

      return Response.json({
        data: {
          ...proposal,
          meal_snapshots: parseJSON(proposal.meal_snapshots, []),
          restaurant_snapshots: parseJSON(proposal.restaurant_snapshots, []),
          table_layout: parseJSON(proposal.table_layout_json, {}),
          user_liked: userLiked,
          comments: (comments || []).reverse(),
          supporters,
          total_supporters: (likes || []).filter((l) => l.is_valid !== false).length,
        },
      });
    }

    // ===== AUTH-REQUIRED ACTIONS =====

    if (action === 'toggleLike') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });

      const proposalId = payload.proposal_id;
      if (!proposalId) return Response.json({ error: 'proposal_id required' }, { status: 400 });

      const proposal = await base44.asServiceRole.entities.CommunityMoodProposal.get(proposalId).catch(() => null);
      if (!proposal || proposal.status !== 'published') return Response.json({ error: 'not_found' }, { status: 404 });

      const existing = await base44.asServiceRole.entities.CommunityMoodLike.filter({ proposal_id: proposalId, user_id: user.id, status: 'active' }).catch(() => []);
      const activeLike = (existing || []).find((l) => l.is_valid !== false);

      const avatar = getAvatarInfo(user);

      if (activeLike) {
        // Unlike
        await base44.asServiceRole.entities.CommunityMoodLike.update(activeLike.id, { status: 'revoked', revoked_at: new Date().toISOString() });
        const newCount = Math.max(0, (proposal.valid_likes_count || 0) - 1);
        await base44.asServiceRole.entities.CommunityMoodProposal.update(proposalId, { valid_likes_count: newCount });
        return Response.json({ data: { liked: false, count: newCount } });
      } else {
        // Like
        await base44.asServiceRole.entities.CommunityMoodLike.create({
          proposal_id: proposalId,
          user_id: user.id,
          user_display_name: avatar.display_name,
          user_avatar_type: avatar.avatar_type,
          user_avatar_key: avatar.avatar_key,
          user_avatar_url: avatar.avatar_url,
          status: 'active',
          is_valid: true,
        });
        const newCount = (proposal.valid_likes_count || 0) + 1;
        const update = { valid_likes_count: newCount };
        if (newCount >= (proposal.target_likes || 100) && !proposal.reached_target_at) {
          update.reached_target_at = new Date().toISOString();
          update.reward_status = 'pending';
        }
        await base44.asServiceRole.entities.CommunityMoodProposal.update(proposalId, update);
        return Response.json({ data: { liked: true, count: newCount, reached_target: !!update.reached_target_at } });
      }
    }

    if (action === 'addComment') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });

      const proposalId = payload.proposal_id;
      const body = sanitizeText(payload.body, 300);
      if (!body) return Response.json({ error: 'body required' }, { status: 400 });
      if (!proposalId) return Response.json({ error: 'proposal_id required' }, { status: 400 });

      const proposal = await base44.asServiceRole.entities.CommunityMoodProposal.get(proposalId).catch(() => null);
      if (!proposal || proposal.status !== 'published') return Response.json({ error: 'not_found' }, { status: 404 });

      const avatar = getAvatarInfo(user);
      const comment = await base44.asServiceRole.entities.CommunityMoodComment.create({
        proposal_id: proposalId,
        user_id: user.id,
        user_display_name: avatar.display_name,
        user_avatar_type: avatar.avatar_type,
        user_avatar_key: avatar.avatar_key,
        user_avatar_url: avatar.avatar_url,
        body,
        status: 'active',
      });

      await base44.asServiceRole.entities.CommunityMoodProposal.update(proposalId, { comments_count: (proposal.comments_count || 0) + 1 });

      return Response.json({ data: comment });
    }

    if (action === 'deleteComment') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });

      const comment = await base44.asServiceRole.entities.CommunityMoodComment.get(payload.comment_id).catch(() => null);
      if (!comment) return Response.json({ error: 'not_found' }, { status: 404 });
      if (comment.user_id !== user.id && !ADMIN(user)) return Response.json({ error: 'forbidden' }, { status: 403 });

      await base44.asServiceRole.entities.CommunityMoodComment.update(comment.id, { status: 'deleted' });
      const proposal = await base44.asServiceRole.entities.CommunityMoodProposal.get(comment.proposal_id).catch(() => null);
      if (proposal) await base44.asServiceRole.entities.CommunityMoodProposal.update(proposal.id, { comments_count: Math.max(0, (proposal.comments_count || 0) - 1) });

      return Response.json({ data: { deleted: true } });
    }

    if (action === 'recordShare') {
      const proposalId = payload.proposal_id;
      const channel = payload.channel;
      if (!proposalId || !channel) return Response.json({ error: 'missing params' }, { status: 400 });

      let userId = null;
      try { const user = await base44.auth.me(); userId = user.id; } catch {}

      await base44.asServiceRole.entities.CommunityMoodShare.create({ proposal_id: proposalId, user_id: userId, channel });
      const proposal = await base44.asServiceRole.entities.CommunityMoodProposal.get(proposalId).catch(() => null);
      if (proposal) await base44.asServiceRole.entities.CommunityMoodProposal.update(proposalId, { shares_count: (proposal.shares_count || 0) + 1 });

      return Response.json({ data: { shared: true } });
    }

    if (action === 'submitProposal') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });

      const config = (await base44.asServiceRole.entities.CommunityMoodConfig.list('-created_date', 5).catch(() => []))?.[0] || {};
      const avatar = getAvatarInfo(user);

      const titleAr = sanitizeText(payload.mood_title_ar, 80);
      if (!titleAr) return Response.json({ error: 'mood_title_ar required' }, { status: 400 });
      if (!payload.meal_ids?.length) return Response.json({ error: 'meals required' }, { status: 400 });
      if (!payload.restaurant_ids?.length) return Response.json({ error: 'restaurant required' }, { status: 400 });

      const status = config.trusted_user_auto_publish ? 'published' : 'pending_review';
      const moderationStatus = config.trusted_user_auto_publish ? 'approved' : 'pending';

      const proposal = await base44.asServiceRole.entities.CommunityMoodProposal.create({
        creator_user_id: user.id,
        creator_display_name: avatar.display_name,
        creator_phone: user.phone || null,
        creator_avatar_type: avatar.avatar_type,
        creator_avatar_key: avatar.avatar_key,
        creator_avatar_url: avatar.avatar_url,
        mood_title_ar: titleAr,
        mood_title_he: sanitizeText(payload.mood_title_he, 80) || null,
        description_ar: sanitizeText(payload.description_ar, 300) || null,
        description_he: sanitizeText(payload.description_he, 300) || null,
        existing_mood_id: payload.existing_mood_id || null,
        occasion_key: payload.occasion_key || null,
        num_people: payload.num_people || null,
        restaurant_ids: payload.restaurant_ids,
        meal_ids: payload.meal_ids,
        table_layout_json: JSON.stringify(payload.table_layout || {}),
        package_type: payload.package_type || 'classic',
        cover_layout: payload.cover_layout || 'table_top',
        cover_image_url: payload.cover_image_url || null,
        meal_snapshots: JSON.stringify(payload.meal_snapshots || []),
        restaurant_snapshots: JSON.stringify(payload.restaurant_snapshots || []),
        status,
        moderation_status: moderationStatus,
        target_likes: config.default_target_likes || 100,
        valid_likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        views_count: 0,
        reward_status: 'none',
        is_featured: false,
      });

      // Delete the user's draft
      const drafts = await base44.asServiceRole.entities.CommunityMoodGameDraft.filter({ user_id: user.id }).catch(() => []);
      if (drafts?.length) await base44.asServiceRole.entities.CommunityMoodGameDraft.delete(drafts[0].id).catch(() => {});

      await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
        proposal_id: proposal.id,
        action: 'submitted',
        admin_name: avatar.display_name,
        new_value: status,
      });

      return Response.json({ data: { id: proposal.id, status } });
    }

    if (action === 'saveDraft') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });

      const existing = await base44.asServiceRole.entities.CommunityMoodGameDraft.filter({ user_id: user.id }).catch(() => []);
      const draftData = {
        user_id: user.id,
        current_stage: payload.current_stage || 'intro',
        selected_mood_id: payload.selected_mood_id || null,
        custom_mood_data: payload.custom_mood_data ? JSON.stringify(payload.custom_mood_data) : null,
        selected_restaurant_ids: payload.selected_restaurant_ids || [],
        selected_meal_ids: payload.selected_meal_ids || [],
        table_layout_json: payload.table_layout ? JSON.stringify(payload.table_layout) : null,
        package_type: payload.package_type || 'classic',
        quality_mode: payload.quality_mode || 'auto',
      };

      if (existing?.length) {
        await base44.asServiceRole.entities.CommunityMoodGameDraft.update(existing[0].id, draftData);
        return Response.json({ data: { saved: true, draft_id: existing[0].id } });
      } else {
        const draft = await base44.asServiceRole.entities.CommunityMoodGameDraft.create(draftData);
        return Response.json({ data: { saved: true, draft_id: draft.id } });
      }
    }

    if (action === 'loadDraft') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });

      const drafts = await base44.asServiceRole.entities.CommunityMoodGameDraft.filter({ user_id: user.id }).catch(() => []);
      if (!drafts?.length) return Response.json({ data: null });
      const d = drafts[0];
      return Response.json({
        data: {
          ...d,
          custom_mood_data: d.custom_mood_data ? parseJSON(d.custom_mood_data, null) : null,
          table_layout: d.table_layout_json ? parseJSON(d.table_layout_json, {}) : {},
        },
      });
    }

    if (action === 'deleteDraft') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });
      const drafts = await base44.asServiceRole.entities.CommunityMoodGameDraft.filter({ user_id: user.id }).catch(() => []);
      if (drafts?.length) await base44.asServiceRole.entities.CommunityMoodGameDraft.delete(drafts[0].id).catch(() => {});
      return Response.json({ data: { deleted: true } });
    }

    if (action === 'reportProposal') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });
      const report = await base44.asServiceRole.entities.CommunityMoodReport.create({
        proposal_id: payload.proposal_id,
        reporter_user_id: user.id,
        reason: payload.reason || 'other',
        details: sanitizeText(payload.details, 500) || null,
        status: 'pending',
      });
      return Response.json({ data: report });
    }

    if (action === 'updateMyAvatar') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });
      await base44.auth.updateMe({
        avatar_type: payload.avatar_type || 'tamam',
        avatar_key: payload.avatar_key || 'n1',
        avatar_url: payload.avatar_url || null,
        display_name: payload.display_name || undefined,
      });
      return Response.json({ data: { updated: true } });
    }

    // ===== ADMIN ACTIONS =====

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    switch (action) {
      case 'adminGetProposals': {
        const statusFilter = payload.status || 'pending_review';
        const proposals = await base44.asServiceRole.entities.CommunityMoodProposal.filter(
          statusFilter === 'all' ? {} : { status: statusFilter },
          '-created_date', 200
        ).catch(() => []);
        return Response.json({ data: (proposals || []).map((p) => ({
          ...p,
          meal_snapshots: parseJSON(p.meal_snapshots, []),
          restaurant_snapshots: parseJSON(p.restaurant_snapshots, []),
        })) });
      }

      case 'adminGetReports': {
        const reports = await base44.asServiceRole.entities.CommunityMoodReport.filter({ status: 'pending' }, '-created_date', 100).catch(() => []);
        return Response.json({ data: reports || [] });
      }

      case 'adminGetComments': {
        const comments = await base44.asServiceRole.entities.CommunityMoodComment.list('-created_date', 200).catch(() => []);
        return Response.json({ data: (comments || []).filter((c) => c.status !== 'deleted') });
      }

      case 'adminGetAuditLog': {
        const logs = await base44.asServiceRole.entities.CommunityMoodAuditLog.list('-created_date', 100).catch(() => []);
        return Response.json({ data: logs || [] });
      }

      case 'adminApproveProposal': {
        const p = await base44.asServiceRole.entities.CommunityMoodProposal.get(payload.proposal_id).catch(() => null);
        if (!p) return Response.json({ error: 'not_found' }, { status: 404 });
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, {
          status: 'published', moderation_status: 'approved', moderation_note: payload.note || null,
          starts_at: new Date().toISOString(),
        });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'approved', admin_id: user.id, admin_name: user.full_name, new_value: 'published',
        });
        return Response.json({ data: { approved: true } });
      }

      case 'adminRejectProposal': {
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, {
          status: 'rejected', moderation_status: 'rejected', moderation_note: payload.note || null,
        });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'rejected', admin_id: user.id, admin_name: user.full_name, reason: payload.note,
        });
        return Response.json({ data: { rejected: true } });
      }

      case 'adminRequestEdit': {
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, {
          status: 'pending_review', moderation_status: 'edit_requested', moderation_note: payload.note || null,
        });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'edit_requested', admin_id: user.id, admin_name: user.full_name, reason: payload.note,
        });
        return Response.json({ data: { edit_requested: true } });
      }

      case 'adminPauseProposal': {
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, { status: 'paused' });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'paused', admin_id: user.id, admin_name: user.full_name,
        });
        return Response.json({ data: { paused: true } });
      }

      case 'adminUnpublishProposal': {
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, { status: 'archived' });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'unpublished', admin_id: user.id, admin_name: user.full_name,
        });
        return Response.json({ data: { unpublished: true } });
      }

      case 'adminFeatureProposal': {
        const p = await base44.asServiceRole.entities.CommunityMoodProposal.get(payload.proposal_id).catch(() => null);
        if (!p) return Response.json({ error: 'not_found' }, { status: 404 });
        const newVal = !p.is_featured;
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, {
          is_featured: newVal, featured_order: newVal ? (payload.featured_order || 0) : 0,
        });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: newVal ? 'featured' : 'unfeatured', admin_id: user.id, admin_name: user.full_name,
        });
        return Response.json({ data: { featured: newVal } });
      }

      case 'adminSetTarget': {
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, { target_likes: Number(payload.target) || 100 });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'target_changed', admin_id: user.id, admin_name: user.full_name,
          previous_value: String(payload.current_target), new_value: String(payload.target),
        });
        return Response.json({ data: { updated: true } });
      }

      case 'adminModerateComment': {
        await base44.asServiceRole.entities.CommunityMoodComment.update(payload.comment_id, { status: payload.status || 'hidden' });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          action: 'comment_moderated', admin_id: user.id, admin_name: user.full_name, new_value: payload.comment_id,
        });
        return Response.json({ data: { moderated: true } });
      }

      case 'adminInvalidateLikes': {
        const likes = await base44.asServiceRole.entities.CommunityMoodLike.filter({ proposal_id: payload.proposal_id, status: 'active' }).catch(() => []);
        if (likes?.length) await base44.asServiceRole.entities.CommunityMoodLike.bulkUpdate(likes.map((l) => ({ id: l.id, is_valid: false })));
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, { valid_likes_count: 0 });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'likes_invalidated', admin_id: user.id, admin_name: user.full_name,
        });
        return Response.json({ data: { invalidated: likes?.length || 0 } });
      }

      case 'adminApproveReward': {
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, {
          reward_status: 'approved', reward_type: payload.reward_type || 'coupon',
        });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'reward_approved', admin_id: user.id, admin_name: user.full_name,
        });
        return Response.json({ data: { approved: true } });
      }

      case 'adminRejectReward': {
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, { reward_status: 'rejected' });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'reward_rejected', admin_id: user.id, admin_name: user.full_name,
        });
        return Response.json({ data: { rejected: true } });
      }

      case 'adminArchiveProposal': {
        await base44.asServiceRole.entities.CommunityMoodProposal.update(payload.proposal_id, { status: 'archived' });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({
          proposal_id: payload.proposal_id, action: 'archived', admin_id: user.id, admin_name: user.full_name,
        });
        return Response.json({ data: { archived: true } });
      }

      case 'adminSaveConfig': {
        let configs = await base44.asServiceRole.entities.CommunityMoodConfig.list('-created_date', 5).catch(() => []);
        const configData = { ...payload };
        delete configData.id; delete configData.created_date; delete configData.updated_date; delete configData.created_by_id;
        if (configs?.length) {
          await base44.asServiceRole.entities.CommunityMoodConfig.update(configs[0].id, configData);
        } else {
          await base44.asServiceRole.entities.CommunityMoodConfig.create(configData);
        }
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({ action: 'config_saved', admin_id: user.id, admin_name: user.full_name });
        return Response.json({ data: { saved: true } });
      }

      case 'adminListReferences': {
        const refs = await base44.asServiceRole.entities.GameReferenceVideo.list('-priority', 100).catch(() => []);
        return Response.json({ data: refs || [] });
      }

      case 'adminAddReference': {
        const ref = await base44.asServiceRole.entities.GameReferenceVideo.create({
          title: payload.title || 'Reference',
          internal_notes: payload.internal_notes || null,
          reference_type: payload.reference_type || 'camera',
          file_url: payload.file_url,
          poster_image_url: payload.poster_image_url || null,
          is_enabled: payload.is_enabled !== false,
          priority: payload.priority || 0,
          is_public_preview: payload.is_public_preview || false,
          public_preview_url: payload.public_preview_url || null,
          public_poster_url: payload.public_poster_url || null,
        });
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({ action: 'reference_added', admin_id: user.id, admin_name: user.full_name, new_value: ref.id });
        return Response.json({ data: ref });
      }

      case 'adminUpdateReference': {
        const update = { ...payload };
        delete update.id; delete update.created_date; delete update.updated_date; delete update.created_by_id;
        await base44.asServiceRole.entities.GameReferenceVideo.update(payload.id, update);
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({ action: 'reference_updated', admin_id: user.id, admin_name: user.full_name, new_value: payload.id });
        return Response.json({ data: { updated: true } });
      }

      case 'adminDeleteReference': {
        await base44.asServiceRole.entities.GameReferenceVideo.delete(payload.id);
        await base44.asServiceRole.entities.CommunityMoodAuditLog.create({ action: 'reference_deleted', admin_id: user.id, admin_name: user.full_name, new_value: payload.id });
        return Response.json({ data: { deleted: true } });
      }

      case 'adminGetReferenceVideos': {
        // Get public-approved references for homepage preview
        const refs = await base44.asServiceRole.entities.GameReferenceVideo.filter({ is_public_preview: true, is_enabled: true }, '-priority', 5).catch(() => []);
        return Response.json({ data: refs || [] });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('communityMoodEngine error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}