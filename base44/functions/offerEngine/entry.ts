import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ============================================================================
// offerEngine — unified customer Offer eligibility + point-unlock layer.
//
// Reuses the EXISTING offer system (GroupDeal already enforces server-side
// time windows at start_at/end_at and quantity limits at total_inventory /
// maximum_participants inside joinGroupDeal) and the EXISTING points ledger
// (LoyaltyAccount + PointsTransaction). This engine adds only the
// eligibility/unlock layer: OfferRule (visibility/audience/unlock cost) and
// OfferUnlock (one unlock per user), and a single eligibility evaluation.
//
// Unlock = VISIBILITY only. It never places an order, reserves inventory, or
// adds to cart. Quota is consumed by the existing join/purchase flow, not by
// unlock.
// ============================================================================

function now() { return Date.now(); }
function json(data, status = 200) { return Response.json(data, { status }); }

function dealStatus(d) {
  if (!d) return 'draft';
  if (d.finalized) return d.status; // completed | failed
  if (['paused', 'cancelled', 'draft'].includes(d.status)) return d.status;
  const t = now();
  const s = d.start_at ? new Date(d.start_at).getTime() : 0;
  const e = d.end_at ? new Date(d.end_at).getTime() : Infinity;
  if (t < s) return 'scheduled';
  if (t >= e) return 'ended';
  return 'active';
}

async function loadRule(SR, dealId) {
  const rules = await SR.entities.OfferRule.filter({ deal_id: dealId, active: true }).catch(() => []);
  return (rules || [])[0] || null;
}

async function countParticipations(SR, dealId) {
  const parts = await SR.entities.GroupDealParticipation.filter({ deal_id: dealId }).catch(() => []);
  const active = (parts || []).filter((p) => p.participation_status !== 'cancelled');
  const unique = new Set(active.map((p) => p.customer_id || p.phone || p.guest_session_id || p.id)).size;
  const qty = active.reduce((s, p) => s + (p.quantity || 0), 0);
  return { participants: unique, quantity: qty };
}

function quotaInfo(deal, participants, quantity) {
  const total = deal.total_inventory || deal.maximum_participants || null;
  const used = deal.counting_method === 'quantity' ? quantity : participants;
  const remaining = total != null ? Math.max(0, total - used) : null;
  return { total, used, remaining, soldOut: total != null && remaining === 0 };
}

async function getOrCreateAccount(SR, phone) {
  const accs = await SR.entities.LoyaltyAccount.filter({ phone }).catch(() => []);
  if (accs && accs[0]) return accs[0];
  return SR.entities.LoyaltyAccount.create({ phone, balance: 0, pending_balance: 0, used_points: 0, expired_points: 0 });
}

async function hasUnlocked(SR, dealId, phone) {
  if (!phone) return false;
  const u = await SR.entities.OfferUnlock.filter({ deal_id: dealId, phone }).catch(() => []);
  return !!(u && u.length);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const SR = base44.asServiceRole;
    const { action, payload } = await req.json();
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    // ----- Unified eligibility evaluation -----
    if (action === 'getEligibility') {
      const { deal_id, phone } = payload;
      const deal = await SR.entities.GroupDeal.get(deal_id).catch(() => null);
      if (!deal) return json({ error: 'not_found' }, 404);
      const rule = await loadRule(SR, deal_id);
      const status = dealStatus(deal);
      const { participants, quantity } = await countParticipations(SR, deal_id);
      const q = quotaInfo(deal, participants, quantity);
      const locked = !!(rule && rule.unlock_type === 'point_locked' && rule.points_unlock_cost > 0);
      const unlocked = locked ? await hasUnlocked(SR, deal_id, phone) : false;
      const endMs = deal.end_at ? new Date(deal.end_at).getTime() : null;
      const timeRemaining = endMs ? Math.max(0, endMs - now()) : null;

      let cardState = 'NORMAL';
      if (q.soldOut) cardState = 'SOLD_OUT';
      else if (status === 'ended') cardState = 'EXPIRED';
      else if (status === 'scheduled') cardState = 'UPCOMING';
      else if (locked && !unlocked) cardState = 'LOCKED_POINTS';
      else if (locked && unlocked) cardState = 'UNLOCKED';
      else if (status === 'active') cardState = 'ACTIVE';

      return json({
        data: {
          deal_id,
          status,
          card_state: cardState,
          locked: locked && !unlocked,
          unlocked,
          unlock_cost: locked ? rule.points_unlock_cost : 0,
          time_remaining_ms: timeRemaining,
          start_at: deal.start_at,
          end_at: deal.end_at,
          quota_total: q.total,
          quota_remaining: q.remaining,
          audience: rule?.audience || ['public'],
          title: deal.title,
          reference_price: deal.reference_price,
          hero_image: deal.hero_image,
        },
      });
    }

    // ----- خبايا TAMAM: list point-locked, visible offers -----
    if (action === 'listKhabya') {
      const { phone } = payload;
      const rules = await SR.entities.OfferRule.filter({ active: true, unlock_type: 'point_locked' }).catch(() => []);
      const dealIds = [...new Set((rules || []).map((r) => r.deal_id).filter(Boolean))];
      const out = [];
      for (const id of dealIds) {
        const d = await SR.entities.GroupDeal.get(id).catch(() => null);
        if (!d) continue;
        const status = dealStatus(d);
        if (!['active', 'scheduled'].includes(status) && !d.homepage_featured) continue;
        const rule = (rules || []).find((r) => r.deal_id === id);
        const { participants, quantity } = await countParticipations(SR, id);
        const q = quotaInfo(d, participants, quantity);
        const unlocked = await hasUnlocked(SR, id, phone);
        out.push({
          deal_id: id,
          title: d.title,
          hero_image: d.hero_image,
          reference_price: d.reference_price,
          status,
          start_at: d.start_at,
          end_at: d.end_at,
          unlock_cost: rule?.points_unlock_cost || 0,
          teaser_text: rule?.teaser_text_ar || '',
          unlocked,
          quota_remaining: q.remaining,
          quota_total: q.total,
          sold_out: q.soldOut,
        });
      }
      return json({ data: out });
    }

    // ----- Atomic point unlock (visibility only) -----
    if (action === 'unlockOffer') {
      const { deal_id, phone } = payload;
      if (!phone) return json({ error: 'phone_required' }, 400);
      const deal = await SR.entities.GroupDeal.get(deal_id).catch(() => null);
      if (!deal) return json({ error: 'not_found' }, 404);
      const rule = await loadRule(SR, deal_id);
      if (!rule || rule.unlock_type !== 'point_locked' || !rule.points_unlock_cost) {
        return json({ error: 'not_point_locked' }, 400);
      }
      const cost = Math.floor(rule.points_unlock_cost);

      // 1. server-time validity
      const status = dealStatus(deal);
      if (status === 'ended') return json({ error: 'offer_expired' }, 400);
      if (status === 'scheduled') return json({ error: 'offer_not_started' }, 400);
      if (!['active', 'scheduled'].includes(status)) return json({ error: 'offer_unavailable' }, 400);

      // 2. one unlock per user
      const existing = await SR.entities.OfferUnlock.filter({ deal_id, phone }).catch(() => []);
      if (existing && existing.length) {
        return json({ data: { already_unlocked: true, deal_id, unlocked_at: existing[0].unlocked_at } });
      }

      // 3. quota (unlock does not consume quota, but a sold-out offer is not unlockable)
      const { participants, quantity } = await countParticipations(SR, deal_id);
      const q = quotaInfo(deal, participants, quantity);
      if (q.soldOut) return json({ error: 'sold_out' }, 400);

      // 4. balance
      const acc = await getOrCreateAccount(SR, phone);
      if ((acc.balance || 0) < cost) {
        return json({ error: 'insufficient_points', balance: acc.balance || 0, cost }, 400);
      }

      // 5. deduct + ledger + unlock record
      const newBalance = (acc.balance || 0) - cost;
      await SR.entities.LoyaltyAccount.update(acc.id, {
        balance: newBalance,
        used_points: (acc.used_points || 0) + cost,
      });
      await SR.entities.PointsTransaction.create({
        account_id: acc.id,
        phone,
        points: -cost,
        type: 'offer_unlock',
        status: 'available',
      });
      const unlock = await SR.entities.OfferUnlock.create({
        deal_id,
        phone,
        user_id: user?.id || '',
        unlocked_at: new Date().toISOString(),
        points_spent: cost,
      });
      return json({
        data: { unlocked: true, deal_id, points_spent: cost, balance_after: newBalance, unlock_id: unlock.id },
      });
    }

    // ----- which offers has this user unlocked -----
    if (action === 'getUnlocks') {
      const { phone } = payload;
      if (!phone) return json({ data: [] });
      const list = await SR.entities.OfferUnlock.filter({ phone }).catch(() => []);
      return json({
        data: (list || []).map((u) => ({ deal_id: u.deal_id, unlocked_at: u.unlocked_at, points_spent: u.points_spent })),
      });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error('offerEngine error', e);
    return json({ error: e.message || 'server_error' }, 500);
  }
}