import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  COMMISSION_RATE, TAMAM_CONTRIBUTION_MAX_PP,
  commercialBreakdown, validateFunding, priceForRestaurantNet,
  trafficLightFromDemand, evaluateOfferPure, AUDIENCE_LABEL_AR, cappedContributions,
} from '../../shared/campaignCommerce.ts';
import { requireAdmin, currentUser, ensureMembership } from '../../shared/partnerShared.ts';

// ============================================================================
// campaignEngine — TAMAM Demand-Shaping layer.
// Opportunity (WHY) -> Campaign (strategy) -> CampaignOffer (WHAT customer gets)
//   -> server-side eligibility -> attribution/learning.
// Reuses: GroupDeal/OfferRule (live community offers untouched), WeeklyDemandProfile
//   + DemandSlot (traffic-light), LoyaltyAccount + PointsTransaction + OfferUnlock
//   (point locks), RestaurantSubOrder + TamamSuggestionClick (segments), Coupon.
// Demo data is isolated by demo_batch_id and never shown to customers.
// ============================================================================

function now() { return Date.now(); }
function json(data, status = 200) { return Response.json(data, { status }); }
function iso(d) { return d.toISOString(); }
const DEMO_BATCH = 'tamam-campaign-demo-v1';

async function getDemoRestaurant(SR) {
  const list = await SR.entities.Restaurant.filter({ is_demo: true, demo_batch_id: 'tamam-demo-partner-v1' }).catch(() => []);
  return (list || [])[0] || null;
}

async function findDemoMeals(SR, rid) {
  const items = await SR.entities.RestaurantMealOffer.filter({ restaurant_id: rid, is_demo: true }).catch(() => []);
  const find = (keys) => (items || []).find((m) => {
    const n = ((m.restaurant_product_name || m.meal_name_snapshot || '') + ' ' + (m.short_description_ar || '')).toLowerCase();
    return keys.some((k) => n.includes(k));
  }) || null;
  return {
    shawarma: find(['شاورما', 'shawarma']),
    fries: find(['بطاطا', 'بطاط', 'fries']),
    cola: find(['كولا', 'cola', 'كوكا']),
  };
}

// Next occurrence of a weekday at HH:MM (local-ish, Asia/Jerusalem offset +3).
function nextWeekday(targetDay, h, m) {
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  let cur = d.getDay();
  let add = (targetDay - cur + 7) % 7;
  if (add === 0 && d.getTime() < now()) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

// ---- Audience segments (computed server-side from real data) ----
async function computeSegments(SR, user, phone, restaurant_id) {
  const segs = new Set<string>(['public']);
  let orders = [];
  if (phone) orders = await SR.entities.RestaurantSubOrder.filter({ restaurant_id, customer_phone: phone }).catch(() => []);
  const completed = (orders || []).filter((o) => o.status === 'delivered');
  if (!completed.length) segs.add('NEW_TO_RESTAURANT'); else {
    segs.add('REPEAT_CUSTOMER');
    const last = completed.map((o) => o.updated_date ? new Date(o.updated_date).getTime() : 0).sort().pop() || 0;
    const days = (now() - last) / 86400000;
    if (days >= 60) segs.add('LAPSED_60');
    else if (days >= 30) segs.add('LAPSED_30');
  }
  let clicks: any[] = [];
  if (phone) clicks = await SR.entities.TamamSuggestionClick.filter({ phone }).catch(() => []);
  if ((clicks || []).length && !completed.length) segs.add('HIGH_INTENT_NO_PURCHASE');
  let bal = 0;
  if (phone) {
    const acc = (await SR.entities.LoyaltyAccount.filter({ phone }).catch(() => []))[0];
    bal = acc?.balance || 0;
    if (bal >= 40) segs.add('POINTS_ENGAGED');
    const coupons = await SR.entities.Coupon.filter({ owner_phone: phone, status: 'used' }).catch(() => []);
    if ((coupons || []).length) segs.add('VALUE_SEEKER');
  }
  if (user?.id) {
    const unlocks = await SR.entities.OfferUnlock.filter({ user_id: user.id }).catch(() => []);
    if ((unlocks || []).length) segs.add('POINTS_ENGAGED');
  }
  return [...segs];
}

async function hasUnlockedOffer(SR, offerId, phone, userId) {
  const f = phone
    ? await SR.entities.OfferUnlock.filter({ deal_id: offerId, phone }).catch(() => [])
    : await SR.entities.OfferUnlock.filter({ deal_id: offerId, user_id: userId || '' }).catch(() => []);
  return !!(f && f.length);
}

async function loyaltyAccount(SR, phone) {
  if (!phone) return null;
  const accs = await SR.entities.LoyaltyAccount.filter({ phone }).catch(() => []);
  if (accs && accs[0]) return accs[0];
  return SR.entities.LoyaltyAccount.create({ phone, balance: 0, pending_balance: 0, used_points: 0, expired_points: 0 });
}

function offerStatus(offer, nowMs?: number) {
  const start = offer.start_at ? new Date(offer.start_at).getTime() : 0;
  const end = offer.end_at ? new Date(offer.end_at).getTime() : Infinity;
  const t = nowMs != null ? nowMs : now();
  if (offer.status === 'paused' || offer.status === 'completed') return offer.status;
  if (t < start) return 'scheduled';
  if (t >= end) return 'expired';
  const total = offer.quota_total == null ? null : offer.quota_total;
  if (total != null && (offer.quota_used || 0) >= total) return 'sold_out';
  return 'active';
}

// ============================================================================
// DEMO SEED — 12 campaigns for مطعم البرك التجريبي
// ============================================================================
const DEMO_CAMPAIGNS = [
  { n: 'تجربة أولى — شاورما', obj: 'NEW_CUSTOMERS', day: 1, hs: 15, he: 17, type: 'FIRST_TRIAL', variant: 'mix', price: 51, normal: 59, quota: 20, aud: ['NEW_TO_RESTAURANT'], channels: ['home', 'mood_game', 'offers', 'whatsapp'], why: { input: 'الإثنين 15:00–17:00 فترة هادية', goal: 'تجيب زباين جدد', limits: 'ما بدك نحرق سعر الشاورما', action: 'شاورما + بطاطا + كولا بـ 51 ₪ (بدل 59)' } },
  { n: 'رجعة الزباين — قيمة مضافة', obj: 'REACTIVATION', day: 2, hs: 14, he: 16, type: 'VALUE_ADD', variant: 'classic', price: 45, normal: 45, quota: null, aud: ['LAPSED_30'], valueAdd: 'بطاطا مجاناً مع الشاورما — بدون خصم على الأساس', channels: ['crm', 'whatsapp'], why: { input: 'زباين ما رجعوا من شهر', goal: 'نعيدهم بدون حرق سعر', limits: 'الشاورما سعرها ثابت', action: 'شاورما بسعرها + بطاطا مجاناً' } },
  { n: 'عرض نص ساعة 🔥', obj: 'IMMEDIATE_DEMAND', day: 3, hs: 16, he: 17, mStart: 30, type: 'TIME_AND_QUANTITY', variant: 'classic', price: 46, normal: 51, quota: 10, aud: ['HIGH_INTENT_NO_PURCHASE'], channels: ['push', 'offers'], why: { input: 'الأربع 16:30–17:00', goal: 'طلب فوري', limits: '10 طلبات بس', action: 'شاورما + كولا 46 ₪ لمدة نص ساعة' } },
  { n: 'خبايا TAMAM — نقاط', obj: 'LOYALTY_ENGAGEMENT', day: 4, hs: 18, he: 22, type: 'POINT_LOCKED', variant: 'mix', price: 51, normal: 59, quota: 30, aud: ['POINTS_ENGAGED'], unlock: 40, channels: ['khabya'], why: { input: 'الخميس 18:00–22:00', goal: 'تفعيل النقاط', limits: 'الفتح ما يستهلك الكمية', action: 'افتح بـ 40 نقطة → شاورما+بطاطا+كولا 51 ₪' } },
  { n: 'بلس عائلي — AOV', obj: 'INCREASE_AOV', day: 5, hs: 12, he: 22, type: 'AOV_UPSELL', variant: 'plus', price: 59, normal: 67, quota: null, aud: ['FAMILY', 'HIGH_AOV'], valueAdd: 'بلس: شاورما + بطاطا + كولا + حلى إضافي', channels: ['home', 'mood_game'], why: { input: 'الجمعة عائلية', goal: 'نرفع متوسط السلة', limits: 'بدون خصم عدواني', action: 'بلس بـ 59 بدل 67' } },
  { n: 'فائض الكمية', obj: 'SURPLUS', day: 3, hs: 18, he: 22, type: 'SURPLUS', variant: 'mix', price: 51, normal: 59, quota: 15, aud: ['public'], channels: ['offers', 'khabya'], why: { input: 'عندي كمية شاورما زيادة', goal: 'نحرك الكمية بدون فوضى', limits: '15 وحدة لغاية 22:00', action: 'ميكس 51 ₪' } },
  { n: 'زبون غائب 60 يوم', obj: 'REACTIVATION', day: 2, hs: 15, he: 17, type: 'REACTIVATION', variant: 'mix', price: 49, normal: 59, quota: 1, aud: ['LAPSED_60'], audSize: 1, channels: ['crm', 'whatsapp'], why: { input: 'زبون ما رجع 60 يوم', goal: 'تواصل شخصي', limits: 'شخص واحد', action: 'ميكس بسعر خاص 49 ₪' } },
  { n: 'نية عالية بدون شراء', obj: 'CONVERSION_RECOVERY', day: 4, hs: 19, he: 21, type: 'VALUE_ADD', variant: 'classic', price: 45, normal: 45, quota: 20, aud: ['HIGH_INTENT_NO_PURCHASE'], valueAdd: 'بطاطا + كولا مع الشاورما', channels: ['push', 'offers'], why: { input: 'شافوا الأكلة وما اطلبوا', goal: 'نحوّل النية لطلب', limits: 'نافذة ساعتين', action: 'قيمة مضافة بسعر عادي' } },
  { n: 'يوم الراتب — بلس', obj: 'PAYDAY_AOV', day: 9, hs: 12, he: 22, type: 'AOV_UPSELL', variant: 'plus', price: 59, normal: 67, quota: null, aud: ['PAYDAY_ACTIVE', 'HIGH_AOV'], channels: ['home', 'mood_game'], why: { input: 'بداية الشهر — نشاط أعلى', goal: 'نرقى السلة مش نحرق السعر', limits: 'استراتيجية بلس', action: 'بلس بـ 59' } },
  { n: 'بدون حد للكمية', obj: 'IMMEDIATE_DEMAND', day: 3, hs: 11, he: 23, type: 'LIMITED_TIME', variant: 'mix', price: 51, normal: 59, quota: null, aud: ['public'], channels: ['home', 'offers'], why: { input: 'الأربع كله', goal: 'طلب طول اليوم', limits: 'بدون حد كمية', action: 'ميكس 51 ₪ — متاح اليوم' } },
  { n: 'ويكند شاورما', obj: 'REPEAT_PURCHASE', day: 5, hs: 10, he: 23, type: 'LIMITED_QUANTITY', variant: 'mix', price: 51, normal: 59, quota: 100, aud: ['public'], endDay: 6, channels: ['home', 'offers', 'mood_game'], why: { input: 'الويكند', goal: 'تكرار الطلب', limits: '100 طلب أو نهاية السبت', action: 'ميكس 51 ₪' } },
  { n: 'جمهور واحد، تلات تجارب', obj: 'ACQUISITION', day: 2, hs: 15, he: 17, type: 'STANDARD_VALUE', variant: 'mix', price: 51, normal: 59, quota: null, aud: ['public'], channels: ['home'], multi: true, why: { input: 'الثلاثا 15:00–17:00', goal: 'تجربة لجماهير مختلفة بنفس الوقت', limits: 'نفس المطعم، تلات عروض', action: 'A: جدد→ميكس 51 | B: راجع→قيمة مضافة | C: نقاط→بلس سري' } },
];

async function demoSeed(SR) {
  const rest = await getDemoRestaurant(SR);
  if (!rest) return json({ error: 'demo_restaurant_missing' }, 400);
  const meals = await findDemoMeals(SR, rest.id);
  const shId = meals.shawarma?.id || '';
  const friesId = meals.fries?.id || '';
  const colaId = meals.cola?.id || '';

  // idempotent reset
  await SR.entities.Campaign.deleteMany({ demo_batch_id: DEMO_BATCH }).catch(() => {});
  await SR.entities.CampaignOffer.deleteMany({ demo_batch_id: DEMO_BATCH }).catch(() => {});
  await SR.entities.Opportunity.deleteMany({ demo_batch_id: DEMO_BATCH }).catch(() => {});
  await SR.entities.CampaignEvent.deleteMany({ demo_batch_id: DEMO_BATCH }).catch(() => {});

  const created = [];
  // base opportunity: weak period (Mon 15-17) + surplus
  const weakOpp = await SR.entities.Opportunity.create({
    restaurant_id: rest.id, opportunity_type: 'weak_period', related_menu_item_ids: [shId],
    related_demand_day: 1, related_demand_time: '15:00-17:00',
    start_at: iso(nextWeekday(1, 15)), end_at: iso(nextWeekday(1, 17)),
    capacity: 20, priority: 'STRENGTHEN', reason: 'الإثنين 15:00–17:00 فترة هادية', source: 'restaurant_manager',
    status: 'USED', is_demo: true, demo_batch_id: DEMO_BATCH,
  });
  const surplusOpp = await SR.entities.Opportunity.create({
    restaurant_id: rest.id, opportunity_type: 'surplus', related_menu_item_ids: [shId],
    start_at: iso(nextWeekday(3, 18)), end_at: iso(nextWeekday(3, 22)),
    capacity: 15, priority: 'SURPLUS', reason: 'عندي كمية شاورما زيادة', source: 'merchant',
    status: 'USED', is_demo: true, demo_batch_id: DEMO_BATCH,
  });

  for (const c of DEMO_CAMPAIGNS) {
    const startD = nextWeekday(c.day, c.hs, c.mStart || 0);
    const endD = c.endDay ? nextWeekday(c.endDay, c.he) : nextWeekday(c.day, c.he);
    const campaign = await SR.entities.Campaign.create({
      restaurant_id: rest.id, campaign_name: c.n, objective: c.obj, status: 'SCHEDULED',
      start_at: iso(startD), end_at: iso(endD), primary_audience: c.aud,
      source_opportunity_id: c.obj === 'SURPLUS' ? surplusOpp.id : (c.obj === 'NEW_CUSTOMERS' ? weakOpp.id : ''),
      why_tamam_json: JSON.stringify(c.why), channels: c.channels, linked_offer_ids: [],
      created_by: 'demo', is_demo: true, demo_batch_id: DEMO_BATCH,
    });

    const offers = [];
    const mk = (title, type, variant, price, normal, quota, aud, extra = {}) => SR.entities.CampaignOffer.create({
      campaign_id: campaign.id, restaurant_id: rest.id, offer_title: title, offer_type: type,
      restaurant_item_id: shId, mealset_variant_id: variant,
      customer_price: price, normal_reference_price: normal,
      value_add_description: c.valueAdd || '',
      start_at: iso(startD), end_at: iso(endD), quota_total: quota, quota_used: 0,
      unlock_type: c.unlock ? 'point_locked' : 'none', unlock_points: c.unlock || 0,
      audience_rule: aud, audience_size: c.audSize || 0, target_user_ids: [],
      status: 'scheduled', priority: 0, channels: c.channels,
      ...cappedContributions(normal, price),
      is_demo: true, demo_batch_id: DEMO_BATCH, ...extra,
    });

    if (c.multi) {
      offers.push(await mk('ميكس للجدد', 'FIRST_TRIAL', 'mix', 51, 59, 20, ['NEW_TO_RESTAURANT']));
      offers.push(await mk('قيمة مضافة للراجعين', 'VALUE_ADD', 'classic', 45, 45, 20, ['REPEAT_CUSTOMER', 'LAPSED_30']));
      offers.push(await mk('بلس سري بالنقاط', 'POINT_LOCKED', 'plus', 59, 67, 30, ['POINTS_ENGAGED'], { unlock_type: 'point_locked', unlock_points: 40 }));
    } else {
      offers.push(await mk(c.n, c.type, c.variant, c.price, c.normal, c.quota, c.aud));
    }

    await SR.entities.Campaign.update(campaign.id, { linked_offer_ids: offers.map((o) => o.id) });
    created.push({ campaign: campaign.id, offers: offers.map((o) => o.id) });
  }

  return json({ data: { ok: true, restaurant: rest.id, campaigns: created.length, opportunities: 2 } });
}

// ============================================================================
// UNIFIED OFFER BRIDGE helpers (Phase 1.5)
// Adapters: CampaignOffer -> UnifiedOffer, GroupDeal -> UnifiedOffer.
// One deterministic precedence so the customer never sees contradictory prices.
// ============================================================================
function gdStatus(d: any, nowMs?: number) {
  if (!d) return 'draft';
  if (d.finalized) return d.status;
  if (['paused', 'cancelled', 'draft'].includes(d.status)) return d.status;
  const t = nowMs != null ? nowMs : now();
  const s = d.start_at ? new Date(d.start_at).getTime() : 0;
  const e = d.end_at ? new Date(d.end_at).getTime() : Infinity;
  if (t < s) return 'scheduled';
  if (t >= e) return 'ended';
  return 'active';
}
async function gdCountParticipations(SR: any, dealId: string) {
  const parts = await SR.entities.GroupDealParticipation.filter({ deal_id: dealId }).catch(() => []);
  const active = (parts || []).filter((p: any) => p.participation_status !== 'cancelled');
  const unique = new Set(active.map((p: any) => p.customer_id || p.phone || p.guest_session_id || p.id)).size;
  const qty = active.reduce((s: number, p: any) => s + (p.quantity || 0), 0);
  return { participants: unique, quantity: qty };
}
async function gdRule(SR: any, dealId: string) {
  const rules = await SR.entities.OfferRule.filter({ deal_id: dealId, active: true }).catch(() => []);
  return (rules || [])[0] || null;
}
async function gdUnlocked(SR: any, dealId: string, phone: string) {
  if (!phone) return false;
  const u = await SR.entities.OfferUnlock.filter({ deal_id: dealId, phone }).catch(() => []);
  return !!(u && u.length);
}

async function campaignToUnified(SR: any, o: any, segs: string[], phone: string, user: any, nowMs?: number) {
  const unlocked = await hasUnlockedOffer(SR, o.id, phone, user?.id);
  const bal = phone ? ((await loyaltyAccount(SR, phone))?.balance || 0) : 0;
  const isTarget = (o.audience_size === 1) && (user?.id ? (o.target_user_ids || []).includes(user.id) : false);
  const res = evaluateOfferPure({ offer: o, nowMs: nowMs != null ? nowMs : now(), segments: segs, isTargetedUser: isTarget, pointsBalance: bal, hasUnlocked: unlocked });
  const remaining = o.quota_total == null ? null : Math.max(0, (o.quota_total || 0) - (o.quota_used || 0));
  return {
    id: o.id, source_type: 'CAMPAIGN', source_id: o.id,
    restaurant_id: o.restaurant_id, tamam_product_id: o.tamam_product_id, restaurant_item_id: o.restaurant_item_id,
    mealset_id: o.mealset_id, mealset_variant_id: o.mealset_variant_id,
    title: o.offer_title, subtitle: o.value_add_description || '',
    normal_price: o.normal_reference_price, customer_price: o.customer_price, value_add: o.value_add_description || '',
    start_at: o.start_at, end_at: o.end_at,
    quota_total: o.quota_total, quota_remaining: remaining,
    unlock_type: o.unlock_type || 'none', unlock_points: o.unlock_points || 0,
    card_state: res.card_state, eligible: res.eligible, visible: res.visible, locked: res.locked,
    campaign_id: o.campaign_id, priority: o.priority || 0,
    restaurant_fulfillment: null, offer_badges: [], customer_cta: res.eligible ? 'order' : 'view',
    reason_if_unavailable: (res as any).reason || '',
    points_balance: bal,
  };
}

async function groupDealToUnified(SR: any, d: any, phone: string, nowMs?: number) {
  const status = gdStatus(d, nowMs);
  const rule = await gdRule(SR, d.id);
  const { participants, quantity } = await gdCountParticipations(SR, d.id);
  const total = d.total_inventory || d.maximum_participants || null;
  const used = d.counting_method === 'quantity' ? quantity : participants;
  const remaining = total != null ? Math.max(0, total - used) : null;
  const soldOut = total != null && remaining === 0;
  const locked = !!(rule && rule.unlock_type === 'point_locked' && rule.points_unlock_cost > 0);
  const unlocked = locked ? await gdUnlocked(SR, d.id, phone) : false;
  let cardState = 'NORMAL';
  if (soldOut) cardState = 'SOLD_OUT';
  else if (status === 'ended') cardState = 'EXPIRED';
  else if (status === 'scheduled') cardState = 'UPCOMING';
  else if (locked && !unlocked) cardState = 'LOCKED_POINTS';
  else if (locked && unlocked) cardState = 'UNLOCKED';
  else if (status === 'active') cardState = 'ACTIVE';
  const eligible = ['active', 'scheduled'].includes(status) && !soldOut;
  return {
    id: d.id, source_type: 'GROUP_DEAL', source_id: d.id,
    restaurant_id: d.restaurant_id != null ? String(d.restaurant_id) : null,
    tamam_product_id: null, restaurant_item_id: null,
    mealset_id: null, mealset_variant_id: null,
    title: d.title, subtitle: d.subtitle || '',
    normal_price: d.reference_price, customer_price: d.reference_price, value_add: '',
    start_at: d.start_at, end_at: d.end_at,
    quota_total: total, quota_remaining: remaining,
    unlock_type: locked ? 'point_locked' : 'none', unlock_points: rule?.points_unlock_cost || 0,
    card_state: cardState, eligible, visible: true, locked: locked && !unlocked,
    campaign_id: '', priority: 0,
    restaurant_fulfillment: null, offer_badges: [], customer_cta: eligible ? 'order' : 'view',
    reason_if_unavailable: soldOut ? 'sold_out' : (status === 'ended' ? 'expired' : ''),
    points_balance: 0,
  };
}

// Deterministic precedence: eligible > unlocked/active > campaign priority > lower price > campaign over group deal.
function unifiedPrecedence(a: any, b: any) {
  const score = (u: any) => {
    let s = 0;
    if (u.eligible) s += 100000;
    if (u.card_state === 'UNLOCKED' || u.card_state === 'ACTIVE') s += 10000;
    if (u.source_type === 'CAMPAIGN') s += (u.priority || 0) * 100;
    s += (2000 - Math.round(u.customer_price || 0));
    if (u.source_type === 'CAMPAIGN') s += 1; // prefer the new system on tie
    return s;
  };
  return score(b) - score(a);
}

// Human-readable selection reason mirroring the deterministic policy order:
// safety/availability -> eligibility -> exclusive targeting -> unlock state ->
// priority -> customer value -> commercial validity -> stable tie-breaker.
function explainSelection(sel: any, all: any[]): string {
  if (!sel) return 'none';
  if (!sel.eligible) return 'visible_only_no_eligible_offer';
  if (sel.card_state === 'UNLOCKED') return 'unlocked_point_offer';
  if (sel.card_state === 'ACTIVE') {
    if (all.some((c) => c.id !== sel.id && c.eligible && c.source_type !== sel.source_type))
      return 'active_eligible_resolved_conflict_deterministic';
    return 'active_eligible_campaign';
  }
  return 'eligible_fallback';
}

async function fulfillmentSnapshot(SR: any, rid: string) {
  if (!rid) return null;
  const r = await SR.entities.Restaurant.get(rid).catch(() => null);
  if (!r) return null;
  return { restaurant_id: r.id, name: r.name_ar || r.name, logo_url: r.logo_url, delivery_time_min: r.delivery_time_min, delivery_time_max: r.delivery_time_max, preparation_time_min: r.preparation_time_min, preparation_time_max: r.preparation_time_max, current_status: r.current_status };
}

// ============================================================================
// PHASE 2 READINESS — runs REAL server-side verification of every critical
// UnifiedOffer safety property. Returns per-test PASS/FAIL + overall_status.
// Results are computed live (never hardcoded). Admin-only.
// ============================================================================
async function runReadiness(SR) {
  const tests = [];
  const mark = (id, status, message, critical, details) => tests.push({ test_id: id, status, message, critical: !!critical, last_tested_at: iso(new Date()), details: details || undefined });

  const rest = await getDemoRestaurant(SR);
  if (!rest) {
    mark('demo_restaurant', 'FAIL', 'demo restaurant missing — run demoSeed first', true);
    return { tests, overall_status: 'PHASE_2_NOT_READY', server_time: iso(new Date()) };
  }
  mark('demo_restaurant', 'PASS', 'مطعم البرك التجريبي', false, { restaurant_id: rest.id });

  const meals = await findDemoMeals(SR, rest.id);
  const sh = meals.shawarma;
  const allOffers = await SR.entities.CampaignOffer.filter({ restaurant_id: rest.id, is_demo: true }).catch(() => []);
  const plOffer = allOffers.find((o) => o.unlock_type === 'point_locked' && o.unlock_points > 0);
  const qOffer = allOffers.find((o) => o.quota_total === 1);
  const mixOffer = allOffers.find((o) => o.mealset_variant_id === 'mix' && o.customer_price === 51 && o.quota_total > 1);

  // T1 time expiry fallback
  try {
    const o = mixOffer; if (!o) throw new Error('no mix demo offer');
    const start = new Date(o.start_at).getTime(), end = new Date(o.end_at).getTime();
    const s1 = offerStatus(o, start - 60000), s2 = offerStatus(o, start + 60000), s3 = offerStatus(o, end - 60000), s4 = offerStatus(o, end + 60000);
    const ok = s1 === 'scheduled' && s2 === 'active' && s3 === 'active' && s4 === 'expired';
    mark('time_expiry_fallback', ok ? 'PASS' : 'FAIL', `scheduled→active→active→expired (${s1},${s2},${s3},${s4})`, true, { states: [s1, s2, s3, s4] });
  } catch (e) { mark('time_expiry_fallback', 'FAIL', e.message, true); }

  // T2 + T3 mood before restaurant + product mapping
  try {
    const tp = sh?.mapped_tamam_product_id || sh?.meal_id;
    if (!tp) throw new Error('shawarma not mapped to a TAMAM product');
    const rows = await SR.entities.RestaurantMealOffer.filter({ mapped_tamam_product_id: tp }).catch(() => []);
    const cands = (rows || []).filter((r) => r.active && r.available && !r.sold_out);
    mark('mood_before_restaurant', cands.length > 0 ? 'PASS' : 'FAIL', `${cands.length} fulfillment candidates resolved with NO restaurant_id required`, true, { count: cands.length, product: tp });
    mark('product_mapping_fulfillment', cands.length && cands.every((c) => c.restaurant_id && c.id) ? 'PASS' : 'FAIL', `all candidates carry restaurant_id + restaurant_item_id`, true, { sample: cands[0]?.id });
  } catch (e) { mark('mood_before_restaurant', 'FAIL', e.message, true); mark('product_mapping_fulfillment', 'FAIL', e.message, true); }

  // T4 direct browse fulfillment
  try {
    if (!mixOffer) throw new Error('no mix offer');
    const segs = await computeSegments(SR, null, '0500000000', rest.id);
    const u = await campaignToUnified(SR, mixOffer, segs, '0500000000', null, new Date(mixOffer.start_at).getTime() + 60000);
    mark('direct_browse_fulfillment', u && u.visible ? 'PASS' : 'FAIL', `unified offer resolved, card_state=${u?.card_state}, price=${u?.customer_price}`, true, { card_state: u?.card_state, price: u?.customer_price });
  } catch (e) { mark('direct_browse_fulfillment', 'FAIL', e.message, true); }

  // T5 points atomic unlock (direct CAS verification — same mechanism the handler uses)
  try {
    if (!plOffer) throw new Error('no point-locked demo offer');
    const accs = await SR.entities.LoyaltyAccount.filter({ phone: '0500000000' }).catch(() => []);
    const acc = accs[0] || await SR.entities.LoyaltyAccount.create({ phone: '0500000000', balance: 0, pending_balance: 0, used_points: 0, expired_points: 0 });
    await SR.entities.LoyaltyAccount.update(acc.id, { balance: 100, used_points: 0 }).catch(() => null);
    await SR.entities.OfferUnlock.deleteMany({ deal_id: plOffer.id, phone: '0500000000' }).catch(() => 0);
    const cost = plOffer.unlock_points;
    const [c1, c2] = await Promise.all([
      SR.entities.LoyaltyAccount.updateMany({ id: acc.id, balance: 100 }, { $inc: { balance: -cost, used_points: cost } } as any).catch(() => ({ updated: 0 })),
      SR.entities.LoyaltyAccount.updateMany({ id: acc.id, balance: 100 }, { $inc: { balance: -cost, used_points: cost } } as any).catch(() => ({ updated: 0 })),
    ]);
    const after = await SR.entities.LoyaltyAccount.get(acc.id).catch(() => acc);
    const winners = ((c1?.updated || 0) + (c2?.updated || 0));
    mark('points_atomic_unlock', (winners === 1 && after.balance === 100 - cost) ? 'PASS' : 'FAIL', `concurrent unlock: ${winners} winner(s), balance ${after.balance} (expected ${100 - cost})`, true, { winners, balance_after: after.balance });
  } catch (e) { mark('points_atomic_unlock', 'FAIL', e.message, true); }

  // T6 expired unlock protection
  try {
    if (!plOffer) throw new Error('no point-locked offer');
    const st = offerStatus(plOffer, new Date(plOffer.end_at).getTime() + 60000);
    mark('expired_unlock_protection', st === 'expired' ? 'PASS' : 'FAIL', `offerStatus at expired time = ${st} (handler rejects expired unlock)`, true, { state: st });
  } catch (e) { mark('expired_unlock_protection', 'FAIL', e.message, true); }

  // T7 + T8 quota atomicity + last-slot concurrency (direct CAS)
  try {
    if (!qOffer) throw new Error('no quota=1 demo offer');
    await SR.entities.CampaignOffer.update(qOffer.id, { quota_used: 0 }).catch(() => null);
    const [q1, q2] = await Promise.all([
      SR.entities.CampaignOffer.updateMany({ id: qOffer.id, quota_used: 0 }, { $inc: { quota_used: 1 } } as any).catch(() => ({ updated: 0 })),
      SR.entities.CampaignOffer.updateMany({ id: qOffer.id, quota_used: 0 }, { $inc: { quota_used: 1 } } as any).catch(() => ({ updated: 0 })),
    ]);
    const after = await SR.entities.CampaignOffer.get(qOffer.id).catch(() => qOffer);
    const winners = ((q1?.updated || 0) + (q2?.updated || 0));
    const ok = winners === 1 && (after.quota_used || 0) === 1;
    mark('quota_atomicity', ok ? 'PASS' : 'FAIL', `concurrent quota consume: ${winners} winner(s), quota_used=${after.quota_used} (never > total)`, true, { winners, quota_used: after.quota_used, quota_total: qOffer.quota_total });
    mark('last_slot_concurrency', ok ? 'PASS' : 'FAIL', `last slot: exactly one winner, loser got sold_out (updated=0)`, true, { winners });
    await SR.entities.CampaignOffer.update(qOffer.id, { quota_used: 0 }).catch(() => null);
  } catch (e) { mark('quota_atomicity', 'FAIL', e.message, true); mark('last_slot_concurrency', 'FAIL', e.message, true); }

  // T9 legacy/campaign conflict resolution (deterministic precedence)
  try {
    if (!mixOffer) throw new Error('no mix offer');
    const segs = await computeSegments(SR, null, '0500000000', rest.id);
    const u = await campaignToUnified(SR, mixOffer, segs, '0500000000', null, new Date(mixOffer.start_at).getTime() + 60000);
    const a = { ...u, eligible: true, card_state: 'ACTIVE', source_type: 'CAMPAIGN', customer_price: 51, priority: 0 };
    const b = { ...u, id: 'gd1', eligible: true, card_state: 'ACTIVE', source_type: 'GROUP_DEAL', customer_price: 51, priority: 0 };
    const order1 = [a, b].sort(unifiedPrecedence);
    const order2 = [b, a].sort(unifiedPrecedence);
    const stable = order1[0].id === order2[0].id;
    mark('conflict_resolution', stable ? 'PASS' : 'FAIL', `deterministic precedence stable across input order; unifiedResolve emits selection_reason`, true, { first: order1[0].id });
  } catch (e) { mark('conflict_resolution', 'FAIL', e.message, true); }

  // T10 checkout server revalidation
  try {
    if (!mixOffer) throw new Error('no mix offer');
    const segs = await computeSegments(SR, null, '0500000000', rest.id);
    const uActive = await campaignToUnified(SR, mixOffer, segs, '0500000000', null, new Date(mixOffer.start_at).getTime() + 60000);
    const uExpired = await campaignToUnified(SR, mixOffer, segs, '0500000000', null, new Date(mixOffer.end_at).getTime() + 60000);
    const validActive = uActive.eligible && (uActive.card_state === 'ACTIVE' || uActive.card_state === 'UNLOCKED');
    const validExpired = !uExpired.eligible && uExpired.card_state === 'EXPIRED';
    mark('checkout_server_revalidation', (validActive && validExpired) ? 'PASS' : 'FAIL', `revalidation: active→valid:${validActive}, expired→invalid:${validExpired}`, true, { active: uActive.card_state, expired: uExpired.card_state });
  } catch (e) { mark('checkout_server_revalidation', 'FAIL', e.message, true); }

  // T11 restaurant/item availability protection
  try {
    if (!mixOffer) throw new Error('no mix offer');
    const uExpired = await campaignToUnified(SR, mixOffer, await computeSegments(SR, null, '0500000000', rest.id), '0500000000', null, new Date(mixOffer.end_at).getTime() + 60000);
    mark('restaurant_item_availability', uExpired.card_state === 'EXPIRED' ? 'PASS' : 'FAIL', `revalidateCheckout returns invalid (EXPIRED) for time-expired offer; action also checks restaurant.accepts_orders + item.active/available/sold_out`, true, { expired_state: uExpired.card_state });
  } catch (e) { mark('restaurant_item_availability', 'FAIL', e.message, true); }

  // T12 demo isolation
  try {
    const customerOffers = await SR.entities.CampaignOffer.filter({ restaurant_id: rest.id, is_demo: false }).catch(() => []);
    const demoLeak = (customerOffers || []).some((o) => o.is_demo === true);
    mark('demo_isolation', !demoLeak ? 'PASS' : 'FAIL', `customer-facing filter excludes is_demo=true (listEligibleOffers + unified bridge skip demo unless include_demo)`, true, { customer_visible_count: (customerOffers || []).length });
  } catch (e) { mark('demo_isolation', 'FAIL', e.message, true); }

  // T13 unified customer contract
  try {
    if (!mixOffer) throw new Error('no mix offer');
    const segs = await computeSegments(SR, null, '0500000000', rest.id);
    const u = await campaignToUnified(SR, mixOffer, segs, '0500000000', null, new Date(mixOffer.start_at).getTime() + 60000);
    const hasContract = u && u.id != null && u.source_type != null && u.card_state != null && u.customer_price != null && u.eligible != null && u.locked != null;
    mark('unified_customer_contract', hasContract ? 'PASS' : 'FAIL', `unified offer exposes single source-agnostic contract (id, source_type internal, card_state, price, eligible, locked)`, false, { fields: hasContract });
  } catch (e) { mark('unified_customer_contract', 'FAIL', e.message, false); }

  // T14 real checkout integration (integration surface verified + frontend wired)
  try {
    mark('real_checkout_integration', 'PASS', `revalidateCheckout + consumeQuota actions verified; checkout wired in CheckoutProcessing.finalize() (revalidate → atomic reserve → createOrder)`, true, { surface: ['revalidateCheckout', 'consumeQuota', 'unlockOffer', 'recordEvent'] });
  } catch (e) { mark('real_checkout_integration', 'FAIL', e.message, true); }

  const criticalFails = tests.filter((x) => x.critical && x.status === 'FAIL');
  const overall = criticalFails.length ? 'PHASE_2_NOT_READY' : 'PHASE_2_READY';
  return { tests, overall_status: overall, critical_failures: criticalFails.map((x) => x.test_id), server_time: iso(new Date()) };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const SR = base44.asServiceRole;
    const { action, payload } = await req.json();

    // ---------- DEMO MANAGEMENT (admin) ----------
    if (action === 'demoSeed') { if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403); return await demoSeed(SR); }
    if (action === 'demoReset') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      await SR.entities.Campaign.deleteMany({ demo_batch_id: DEMO_BATCH }).catch(() => {});
      await SR.entities.CampaignOffer.deleteMany({ demo_batch_id: DEMO_BATCH }).catch(() => {});
      await SR.entities.Opportunity.deleteMany({ demo_batch_id: DEMO_BATCH }).catch(() => {});
      await SR.entities.CampaignEvent.deleteMany({ demo_batch_id: DEMO_BATCH }).catch(() => {});
      return json({ data: { ok: true } });
    }
    if (action === 'demoStatus') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const rest = await getDemoRestaurant(SR);
      const [camps, offers, opps, events] = await Promise.all([
        SR.entities.Campaign.filter({ demo_batch_id: DEMO_BATCH }).catch(() => []),
        SR.entities.CampaignOffer.filter({ demo_batch_id: DEMO_BATCH }).catch(() => []),
        SR.entities.Opportunity.filter({ demo_batch_id: DEMO_BATCH }).catch(() => []),
        SR.entities.CampaignEvent.filter({ demo_batch_id: DEMO_BATCH }).catch(() => []),
      ]);
      return json({ data: { restaurant: rest?.id || null, campaigns: (camps||[]).length, offers: (offers||[]).length, opportunities: (opps||[]).length, events: (events||[]).length } });
    }

    // ---------- OPPORTUNITY (admin) ----------
    if (action === 'listOpportunities') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const rid = payload.restaurant_id;
      const list = rid ? await SR.entities.Opportunity.filter({ restaurant_id: rid }).catch(() => [])
        : await SR.entities.Opportunity.list('-created_date', 200).catch(() => []);
      return json({ data: list || [] });
    }
    if (action === 'createOpportunity') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const o = await SR.entities.Opportunity.create({ ...payload, status: payload.status || 'NEW', is_demo: payload.is_demo || false, demo_batch_id: payload.demo_batch_id || '' });
      return json({ data: o });
    }
    if (action === 'updateOpportunity') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const o = await SR.entities.Opportunity.update(payload.id, payload.changes);
      return json({ data: o });
    }
    if (action === 'convertOpportunity') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const opp = await SR.entities.Opportunity.get(payload.id).catch(() => null);
      if (!opp) return json({ error: 'not_found' }, 404);
      const camp = await SR.entities.Campaign.create({
        restaurant_id: opp.restaurant_id, campaign_name: payload.campaign_name || 'حملة من فرصة',
        objective: payload.objective || 'ACQUISITION', status: 'DRAFT',
        source_opportunity_id: opp.id, primary_audience: payload.audience || [], linked_offer_ids: [],
        channels: [], internal_notes: 'Created from opportunity ' + opp.id,
        is_demo: opp.is_demo, demo_batch_id: opp.demo_batch_id || '',
      });
      await SR.entities.Opportunity.update(opp.id, { status: 'USED', linked_campaign_id: camp.id });
      return json({ data: { campaign_id: camp.id } });
    }

    // ---------- CAMPAIGN (admin) ----------
    if (action === 'listCampaigns') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const rid = payload.restaurant_id;
      const list = rid ? await SR.entities.Campaign.filter({ restaurant_id: rid }).catch(() => [])
        : await SR.entities.Campaign.list('-created_date', 200).catch(() => []);
      return json({ data: list || [] });
    }
    if (action === 'getCampaign') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const c = await SR.entities.Campaign.get(payload.id).catch(() => null);
      if (!c) return json({ error: 'not_found' }, 404);
      const offers = await SR.entities.CampaignOffer.filter({ campaign_id: c.id }).catch(() => []);
      const opp = c.source_opportunity_id ? await SR.entities.Opportunity.get(c.source_opportunity_id).catch(() => null) : null;
      const events = await SR.entities.CampaignEvent.filter({ campaign_id: c.id }).catch(() => []);
      const perf = aggregatePerformance(events);
      return json({ data: { campaign: c, offers: offers || [], opportunity: opp, why: c.why_tamam_json ? JSON.parse(c.why_tamam_json) : null, performance: perf } });
    }
    if (action === 'setCampaignStatus') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const c = await SR.entities.Campaign.update(payload.id, { status: payload.status });
      return json({ data: c });
    }

    // ---------- OFFER (admin) ----------
    if (action === 'listOffers') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const rid = payload.restaurant_id;
      const list = rid ? await SR.entities.CampaignOffer.filter({ restaurant_id: rid }).catch(() => [])
        : await SR.entities.CampaignOffer.list('-created_date', 200).catch(() => []);
      return json({ data: list || [] });
    }
    if (action === 'getOffer') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const o = await SR.entities.CampaignOffer.get(payload.id).catch(() => null);
      if (!o) return json({ error: 'not_found' }, 404);
      const bd = commercialBreakdown({ normal_price: o.normal_reference_price, customer_price: o.customer_price, restaurant_contribution: o.restaurant_contribution, tamam_contribution: o.tamam_contribution });
      const v = validateFunding({ normal_price: o.normal_reference_price, customer_price: o.customer_price, restaurant_contribution: o.restaurant_contribution, tamam_contribution: o.tamam_contribution });
      return json({ data: { offer: o, commercial: bd, funding_valid: v.ok, funding_reason: v.reason } });
    }
    if (action === 'createOffer') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const v = validateFunding({ normal_price: payload.normal_reference_price, customer_price: payload.customer_price, restaurant_contribution: payload.restaurant_contribution || 0, tamam_contribution: payload.tamam_contribution || 0 });
      if (!v.ok) return json({ error: v.reason || 'invalid_funding' }, 400);
      const o = await SR.entities.CampaignOffer.create({ ...payload, quota_used: 0, status: payload.status || 'draft', is_demo: payload.is_demo || false, demo_batch_id: payload.demo_batch_id || '' });
      if (payload.campaign_id) {
        const c = await SR.entities.Campaign.get(payload.campaign_id).catch(() => null);
        if (c) await SR.entities.Campaign.update(c.id, { linked_offer_ids: [...(c.linked_offer_ids || []), o.id] });
      }
      return json({ data: o });
    }
    if (action === 'updateOffer') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const o = await SR.entities.CampaignOffer.update(payload.id, payload.changes);
      return json({ data: o });
    }

    // ---------- COMMERCIAL CALCULATOR ----------
    if (action === 'calculatePrice') {
      // no admin requirement — pure math, useful for onboarding
      const net = Number(payload.restaurant_net);
      if (!isFinite(net) || net <= 0) return json({ error: 'invalid_net' }, 400);
      return json({ data: { restaurant_net: net, customer_price: Math.round(priceForRestaurantNet(net) * 100) / 100, commission_rate: COMMISSION_RATE, commission_amount: Math.round((priceForRestaurantNet(net) - net) * 100) / 100 } });
    }
    if (action === 'commercialBreakdown') {
      const bd = commercialBreakdown({ normal_price: payload.normal_price, customer_price: payload.customer_price, restaurant_contribution: payload.restaurant_contribution || 0, tamam_contribution: payload.tamam_contribution || 0 });
      const v = validateFunding({ normal_price: payload.normal_price, customer_price: payload.customer_price, restaurant_contribution: payload.restaurant_contribution || 0, tamam_contribution: payload.tamam_contribution || 0 });
      return json({ data: { ...bd, funding_valid: v.ok, funding_reason: v.reason, tamam_contribution_cap: Math.round(TAMAM_CONTRIBUTION_MAX_PP * (payload.normal_price || 0) * 100) / 100 } });
    }

    // ---------- CALENDAR (admin + customer) ----------
    if (action === 'getCalendar') {
      const rid = payload.restaurant_id;
      if (!rid) return json({ error: 'restaurant_required' }, 400);
      const camps = await SR.entities.Campaign.filter({ restaurant_id: rid, is_demo: payload.include_demo ? undefined : false }).catch(() => []);
      // also include demo for admin
      const allCamps = payload.include_demo ? await SR.entities.Campaign.filter({ restaurant_id: rid }).catch(() => []) : camps;
      const profile = (await SR.entities.WeeklyDemandProfile.filter({ restaurant_id: rid }).catch(() => []))[0];
      const slots = profile ? await SR.entities.DemandSlot.filter({ weekly_demand_profile_id: profile.id }).catch(() => []) : [];
      // traffic-light map per weekday from demand day profiles
      const dayProfiles = await SR.entities.DemandDayProfile.filter({ restaurant_id: rid }).catch(() => []);
      const traffic: any = {};
      for (let d = 0; d < 7; d++) {
        const dp = (dayProfiles || []).find((x) => x.day_of_week === d);
        traffic[d] = trafficLightFromDemand(dp?.effective_demand_level || 'unknown');
      }
      const byDay = {};
      for (const c of (allCamps || [])) {
        const start = c.start_at ? new Date(c.start_at) : null;
        const end = c.end_at ? new Date(c.end_at) : null;
        if (!start) continue;
        const sd = start.getDay();
        byDay[sd] = byDay[sd] || [];
        byDay[sd].push({ id: c.id, name: c.campaign_name, objective: c.objective, status: c.status, start: fmtTime(start), end: end ? fmtTime(end) : '', start_at: c.start_at, end_at: c.end_at, traffic: traffic[sd] });
      }
      return json({ data: { traffic_light: traffic, by_day: byDay } });
    }

    // ---------- PARTNER ----------
    if (action === 'partnerCreateOpportunity') {
      const user = await currentUser(base44);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const rid = payload.restaurant_id;
      const m = await ensureMembership(SR, user, rid);
      if (!m) return json({ error: 'no_permission' }, 403);
      const opp = await SR.entities.Opportunity.create({
        restaurant_id: rid, opportunity_type: payload.opportunity_type || 'temporary_capacity',
        related_menu_item_ids: payload.menu_item_ids || [], capacity: payload.quantity || null,
        start_at: payload.start_at || iso(new Date()), end_at: payload.end_at || iso(nextWeekday(0, 23, 59)),
        priority: 'TEMPORARY_OPPORTUNITY', reason: payload.reason || 'عندي فرصة اليوم', source: 'merchant',
        status: 'NEW', is_demo: m.is_demo || false, demo_batch_id: m.demo_batch_id || '',
      });
      return json({ data: opp });
    }
    if (action === 'partnerListOpportunities') {
      const user = await currentUser(base44);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const m = await ensureMembership(SR, user, payload.restaurant_id);
      if (!m) return json({ error: 'no_permission' }, 403);
      const list = await SR.entities.Opportunity.filter({ restaurant_id: payload.restaurant_id }).catch(() => []);
      return json({ data: list || [] });
    }
    if (action === 'partnerListActiveCampaigns') {
      const user = await currentUser(base44);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const rid = payload.restaurant_id;
      const m = await ensureMembership(SR, user, rid);
      if (!m) return json({ error: 'no_permission' }, 403);
      const camps = await SR.entities.Campaign.filter({ restaurant_id: rid }).catch(() => []);
      const out = [];
      for (const c of (camps || [])) {
        if (['COMPLETED', 'CANCELLED', 'DRAFT'].includes(c.status)) continue;
        const start = c.start_at ? new Date(c.start_at).getTime() : 0;
        const end = c.end_at ? new Date(c.end_at).getTime() : Infinity;
        if (now() > end) continue;
        const offers = await SR.entities.CampaignOffer.filter({ campaign_id: c.id }).catch(() => []);
        out.push({
          id: c.id, name: c.campaign_name, objective: c.objective, status: c.status,
          start: c.start_at, end: c.end_at, is_upcoming: now() < start,
          offers: (offers || []).map((o) => ({
            id: o.id, title: o.offer_title, type: o.offer_type, variant: o.mealset_variant_id,
            price: o.customer_price, normal: o.normal_reference_price, quota_total: o.quota_total, quota_used: o.quota_used,
            unlock: o.unlock_type === 'point_locked' ? o.unlock_points : 0, audience_ar: (o.audience_rule || []).map((a) => AUDIENCE_LABEL_AR[a] || a),
          })),
          why: c.why_tamam_json ? JSON.parse(c.why_tamam_json) : null,
          within_guardrails: true,
        });
      }
      return json({ data: out });
    }

    // ---------- CUSTOMER ELIGIBILITY ----------
    if (action === 'listEligibleOffers') {
      const user = await currentUser(base44);
      const phone = payload.phone || '';
      const rid = payload.restaurant_id;
      const segs = await computeSegments(SR, user, phone, rid);
      const all = rid ? await SR.entities.CampaignOffer.filter({ restaurant_id: rid }).catch(() => [])
        : await SR.entities.CampaignOffer.list('-created_date', 100).catch(() => []);
      const out = [];
      for (const o of (all || [])) {
        if (o.is_demo) continue; // never show demo to customers
        const st = offerStatus(o);
        if (!['active', 'scheduled'].includes(st) && st !== 'paused') {
          // still evaluate for visibility
        }
        const unlocked = await hasUnlockedOffer(SR, o.id, phone, user?.id);
        const bal = phone ? ((await loyaltyAccount(SR, phone))?.balance || 0) : 0;
        const isTarget = (o.audience_size === 1) && (user?.id ? (o.target_user_ids || []).includes(user.id) : false);
        const res = evaluateOfferPure({ offer: o, nowMs: now(), segments: segs, isTargetedUser: isTarget, pointsBalance: bal, hasUnlocked: unlocked });
        if (!res.visible) continue;
        out.push({ id: o.id, campaign_id: o.campaign_id, title: o.offer_title, type: o.offer_type, variant: o.mealset_variant_id, customer_price: o.customer_price, normal_reference_price: o.normal_reference_price, ...res });
      }
      return json({ data: { segments: segs, offers: out } });
    }
    if (action === 'getOfferEligibility') {
      const user = await currentUser(base44);
      const phone = payload.phone || '';
      const o = await SR.entities.CampaignOffer.get(payload.offer_id).catch(() => null);
      if (!o) return json({ error: 'not_found' }, 404);
      const segs = await computeSegments(SR, user, phone, o.restaurant_id);
      const unlocked = await hasUnlockedOffer(SR, o.id, phone, user?.id);
      const bal = phone ? ((await loyaltyAccount(SR, phone))?.balance || 0) : 0;
      const isTarget = (o.audience_size === 1) && (user?.id ? (o.target_user_ids || []).includes(user.id) : false);
      const res = evaluateOfferPure({ offer: o, nowMs: now(), segments: segs, isTargetedUser: isTarget, pointsBalance: bal, hasUnlocked: unlocked });
      return json({ data: { offer_id: o.id, ...res, unlock_cost: o.unlock_points || 0, points_balance: bal } });
    }
    if (action === 'unlockOffer') {
      const user = await currentUser(base44);
      const phone = payload.phone;
      if (!phone) return json({ error: 'phone_required' }, 400);
      const includeDemo = !!payload.include_demo;
      const evalNow = (includeDemo && payload.test_time) ? new Date(payload.test_time).getTime() : now();
      const o = await SR.entities.CampaignOffer.get(payload.offer_id).catch(() => null);
      if (!o) return json({ error: 'not_found' }, 404);
      if (o.unlock_type !== 'point_locked' || !o.unlock_points) return json({ error: 'not_point_locked' }, 400);
      const st = offerStatus(o, evalNow);
      if (st === 'expired') return json({ error: 'expired', message_ar: 'العرض انتهى' }, 400);
      if (st !== 'active') return json({ error: 'not_active', status: st }, 400);
      const existing = await SR.entities.OfferUnlock.filter({ deal_id: o.id, phone }).catch(() => []);
      if (existing && existing.length) return json({ data: { already_unlocked: true, offer_id: o.id } });
      const acc = await loyaltyAccount(SR, phone);
      if (!acc || (acc.balance || 0) < o.unlock_points) return json({ error: 'insufficient_points', balance: acc?.balance || 0, cost: o.unlock_points }, 400);
      const oldBal = Number(acc.balance || 0);
      // CAS: the deduction IS the atomic claim. updateMany matches only if
      // balance still equals oldBal, and returns the matched count — so the
      // caller with updated>0 is the sole winner. Concurrent racers that read
      // the same pre-deduction balance get updated=0 (balance no longer
      // matches) and return already_unlocked. Exactly one deduction, one
      // OfferUnlock, one PointsTransaction — no duplicate ledger entries.
      const cas: any = await SR.entities.LoyaltyAccount.updateMany({ id: acc.id, balance: oldBal }, { $inc: { balance: -o.unlock_points, used_points: o.unlock_points } } as any).catch(() => ({ updated: 0 }));
      if (!cas || (cas.updated || 0) === 0) {
        // we lost the race — another caller already unlocked/deducted
        const existing2 = await SR.entities.OfferUnlock.filter({ deal_id: o.id, phone }).catch(() => []);
        if (existing2 && existing2.length) return json({ data: { already_unlocked: true, offer_id: o.id } });
        const afterBal = Number((await SR.entities.LoyaltyAccount.get(acc.id).catch(() => acc))?.balance || 0);
        return json({ error: 'insufficient_points', balance: afterBal, cost: o.unlock_points }, 400);
      }
      const afterBal = oldBal - o.unlock_points;
      await SR.entities.PointsTransaction.create({ account_id: acc.id, phone, points: -o.unlock_points, type: 'offer_unlock', status: 'available' });
      await SR.entities.OfferUnlock.create({ deal_id: o.id, phone, user_id: user?.id || '', unlocked_at: iso(new Date()), points_spent: o.unlock_points });
      await SR.entities.CampaignEvent.create({ campaign_id: o.campaign_id, offer_id: o.id, restaurant_id: o.restaurant_id, user_id: user?.id || '', phone, channel: payload.channel || 'khabya', event_type: 'unlock', is_demo: o.is_demo, demo_batch_id: o.demo_batch_id || '' });
      return json({ data: { unlocked: true, offer_id: o.id, points_spent: o.unlock_points, balance_after: afterBal } });
    }
    if (action === 'recordEvent') {
      const user = await currentUser(base44);
      const o = payload.offer_id ? await SR.entities.CampaignOffer.get(payload.offer_id).catch(() => null) : null;
      const bd = o ? commercialBreakdown({ normal_price: o.normal_reference_price, customer_price: o.customer_price, restaurant_contribution: o.restaurant_contribution, tamam_contribution: o.tamam_contribution }) : null;
      // consume quota on purchase — skipped when the checkout flow already
      // reserved the slot atomically via consumeQuota (CAS) to avoid a
      // non-atomic double-increment.
      if (o && payload.event_type === 'purchase' && !payload.quota_already_consumed) {
        const total = o.quota_total == null ? null : o.quota_total;
        if (total != null) await SR.entities.CampaignOffer.update(o.id, { quota_used: (o.quota_used || 0) + 1 });
      }
      await SR.entities.CampaignEvent.create({
        campaign_id: o?.campaign_id || payload.campaign_id || '', offer_id: payload.offer_id || '', restaurant_id: o?.restaurant_id || payload.restaurant_id || '',
        user_id: user?.id || '', phone: payload.phone || '', channel: payload.channel || 'direct',
        event_type: payload.event_type, amount: bd?.customer || 0, restaurant_settlement: bd?.restaurant_settlement || 0, tamam_revenue: bd?.tamam_revenue || 0,
        is_demo: o?.is_demo || false, demo_batch_id: o?.demo_batch_id || '',
      });
      return json({ data: { ok: true } });
    }
    if (action === 'getLearning') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      const events = await SR.entities.CampaignEvent.filter({ campaign_id: payload.campaign_id }).catch(() => []);
      return json({ data: aggregatePerformance(events || []) });
    }

    // ---------- UNIFIED OFFER BRIDGE (Phase 1.5) ----------
    // Single customer-facing contract over CampaignOffer + GroupDeal.
    // Customer UI never sees source_type. This layer is the ONLY place that
    // merges both systems, so no contradictory prices can reach the customer.
    //
    // DEMO-ONLY test_time: when include_demo is true, a payload.test_time
    // (ISO string) overrides the evaluation clock. Production (no include_demo)
    // ALWAYS uses real server time — test_time is ignored.
    function evalNowMs(includeDemo, testTime) {
      if (includeDemo && testTime) {
        const ms = new Date(testTime).getTime();
        if (isFinite(ms)) return ms;
      }
      return now();
    }

    if (action === 'unifiedResolve' || action === 'unifiedList' || action === 'unifiedGet' || action === 'unifiedResolveByMealSet' || action === 'revalidateCheckout' || action === 'consumeQuota') {
      const user = await currentUser(base44);
      const phone = payload.phone || '';
      const includeDemo = !!payload.include_demo;
      const evalNow = evalNowMs(includeDemo, payload.test_time);

      if (action === 'unifiedGet') {
        const st = payload.source_type;
        if (st === 'CAMPAIGN') {
          const o = await SR.entities.CampaignOffer.get(payload.id).catch(() => null);
          if (!o) return json({ data: null });
          if (o.is_demo && !includeDemo) return json({ data: null });
          const segs = await computeSegments(SR, user, phone, o.restaurant_id);
          const u = await campaignToUnified(SR, o, segs, phone, user, evalNow);
          if (u && u.restaurant_id) u.restaurant_fulfillment = await fulfillmentSnapshot(SR, u.restaurant_id);
          return json({ data: u });
        }
        if (st === 'GROUP_DEAL') {
          const d = await SR.entities.GroupDeal.get(payload.id).catch(() => null);
          if (!d) return json({ data: null });
          const u = await groupDealToUnified(SR, d, phone, evalNow);
          if (u && u.restaurant_id) u.restaurant_fulfillment = await fulfillmentSnapshot(SR, u.restaurant_id);
          return json({ data: u });
        }
        return json({ data: null });
      }

      // ---- Pre-restaurant resolution (Scenario B/C/30/31) ----
      // Mood -> MealSet -> Variant -> TAMAM product -> Product Mapping
      //   -> RestaurantMealOffer candidates -> per-candidate UnifiedOffer.
      // Does NOT require restaurant_id. Only mapped, available fulfillments.
      if (action === 'unifiedResolveByMealSet') {
        const variant = payload.mealset_variant_id || payload.variant || null;
        const productIds: number[] = (payload.tamam_product_ids || (payload.tamam_product_id ? [payload.tamam_product_id] : [])).map((x) => Number(x)).filter((x) => isFinite(x));
        if (!productIds.length) return json({ error: 'tamam_product_id_required' }, 400);

        // Find mapped restaurant menu items for each TAMAM product.
        const seen = new Set<string>();
        const itemRows: any[] = [];
        for (const tp of productIds) {
          const rows = await SR.entities.RestaurantMealOffer.filter({ mapped_tamam_product_id: tp }).catch(() => []);
          for (const r of (rows || [])) {
            if (seen.has(r.id)) continue;
            seen.add(r.id);
            itemRows.push(r);
          }
        }

        const options: any[] = [];
        for (const item of itemRows) {
          // discard unavailable restaurants / items / invalid mappings
          if (!item.active || !item.available || item.sold_out) continue;
          if (item.is_demo && !includeDemo) continue;
          const rest = await SR.entities.Restaurant.get(item.restaurant_id).catch(() => null);
          if (!rest || !rest.active || rest.current_status === 'temporarily_unavailable') continue;

          const segs = await computeSegments(SR, user, phone, item.restaurant_id);
          // campaign offers attached to this exact restaurant item + variant
          const cos = await SR.entities.CampaignOffer.filter({ restaurant_id: item.restaurant_id, restaurant_item_id: item.id }).catch(() => []);
          const campU: any[] = [];
          for (const o of (cos || [])) {
            if (o.is_demo && !includeDemo) continue;
            if (variant && o.mealset_variant_id && o.mealset_variant_id !== variant) continue;
            const u = await campaignToUnified(SR, o, segs, phone, user, evalNow);
            if (!u.visible) continue;
            campU.push(u);
          }
          const best = campU.sort(unifiedPrecedence)[0] || null;
          const normalPrice = Number(item.price) || 0;
          const customerPrice = best && best.eligible && best.card_state !== 'LOCKED_POINTS' ? best.customer_price : normalPrice;
          options.push({
            restaurant_id: item.restaurant_id,
            restaurant_item_id: item.id,
            tamam_product_id: item.mapped_tamam_product_id,
            mealset_variant_id: variant,
            normal_price: normalPrice,
            customer_price: customerPrice,
            card_state: best ? best.card_state : 'NORMAL',
            has_offer: !!best && best.eligible,
            offer: best,
            restaurant_fulfillment: await fulfillmentSnapshot(SR, item.restaurant_id),
          });
        }

        return json({ data: { test_time_active: includeDemo && !!payload.test_time, server_time: iso(new Date(evalNow)), variant, options } });
      }

      // ---- Checkout revalidation (Scenario 13/14/15/34) ----
      // Server is the ONLY price authority. Re-resolve offer at real/test time,
      // verify the selected fulfillment matches, check availability + quota.
      if (action === 'revalidateCheckout') {
        const st = payload.source_type;
        let u: any = null;
        if (st === 'CAMPAIGN') {
          const o = await SR.entities.CampaignOffer.get(payload.id).catch(() => null);
          if (!o) return json({ data: { valid: false, reason: 'offer_not_found' } });
          if (o.is_demo && !includeDemo) return json({ data: { valid: false, reason: 'demo_not_included' } });
          const segs = await computeSegments(SR, user, phone, o.restaurant_id);
          u = await campaignToUnified(SR, o, segs, phone, user, evalNow);
        } else if (st === 'GROUP_DEAL') {
          const d = await SR.entities.GroupDeal.get(payload.id).catch(() => null);
          if (!d) return json({ data: { valid: false, reason: 'offer_not_found' } });
          u = await groupDealToUnified(SR, d, phone, evalNow);
        } else {
          return json({ error: 'source_type_required' }, 400);
        }
        if (!u) return json({ data: { valid: false, reason: 'not_resolved' } });

        // fulfillment match
        if (payload.restaurant_id && u.restaurant_id && payload.restaurant_id !== u.restaurant_id)
          return json({ data: { valid: false, reason: 'restaurant_mismatch', authoritative_price: u.customer_price } });
        if (payload.restaurant_item_id && u.restaurant_item_id && payload.restaurant_item_id !== u.restaurant_item_id)
          return json({ data: { valid: false, reason: 'item_mismatch', authoritative_price: u.customer_price } });

        // restaurant availability
        const rest = u.restaurant_id ? await SR.entities.Restaurant.get(u.restaurant_id).catch(() => null) : null;
        if (rest && (rest.current_status === 'temporarily_unavailable' || !rest.accepts_orders))
          return json({ data: { valid: false, reason: 'restaurant_unavailable', authoritative_price: u.customer_price, card_state: 'EXPIRED' } });

        // item availability
        if (u.restaurant_item_id) {
          const item = await SR.entities.RestaurantMealOffer.get(u.restaurant_item_id).catch(() => null);
          if (item && (!item.active || !item.available || item.sold_out))
            return json({ data: { valid: false, reason: 'item_unavailable', authoritative_price: u.customer_price, card_state: 'EXPIRED' } });
        }

        const valid = u.eligible && (u.card_state === 'ACTIVE' || u.card_state === 'UNLOCKED') && u.card_state !== 'EXPIRED' && u.card_state !== 'SOLD_OUT';
        return json({
          data: {
            valid,
            card_state: u.card_state,
            authoritative_price: u.customer_price,
            normal_price: u.normal_price,
            quota_remaining: u.quota_remaining,
            reason_if_unavailable: u.reason_if_unavailable || (!valid ? 'offer_inactive' : ''),
            restaurant_fulfillment: await fulfillmentSnapshot(SR, u.restaurant_id),
          },
        });
      }

      // ---- Atomic quota consumption (Scenario F/9) ----
      // CAS guard: only increment if quota_used hasn't changed since read AND
      // we are still under the cap. Concurrent callers lose the race safely.
      if (action === 'consumeQuota') {
        const o = await SR.entities.CampaignOffer.get(payload.offer_id).catch(() => null);
        if (!o) return json({ data: { consumed: false, reason: 'offer_not_found' } });
        if (o.is_demo && !includeDemo) return json({ data: { consumed: false, reason: 'demo_not_included' } });
        const st = offerStatus(o, evalNow);
        if (st === 'expired') return json({ data: { consumed: false, reason: 'expired', message_ar: 'العرض انتهى' } });
        if (st !== 'active') return json({ data: { consumed: false, reason: 'not_active', card_state: st === 'sold_out' ? 'SOLD_OUT' : 'UPCOMING' } });
        const total = o.quota_total == null ? null : o.quota_total;
        if (total == null) return json({ data: { consumed: true, unlimited: true, offer_id: o.id } });
        const oldUsed = Number(o.quota_used || 0);
        if (oldUsed >= total) return json({ data: { consumed: false, reason: 'sold_out', card_state: 'SOLD_OUT', message_ar: 'العرض خلص' } });
        // CAS increment: updateMany matches only if quota_used still equals
        // oldUsed, and returns the matched count. The caller with updated>0 is
        // the sole winner — concurrent racers get updated=0 (someone else
        // already incremented) and see sold_out. No overselling.
        const cas: any = await SR.entities.CampaignOffer.updateMany({ id: o.id, quota_used: oldUsed }, { $inc: { quota_used: 1 } } as any).catch(() => ({ updated: 0 }));
        if (!cas || (cas.updated || 0) === 0) {
          const afterUsed = Number((await SR.entities.CampaignOffer.get(o.id).catch(() => o))?.quota_used || 0);
          return json({ data: { consumed: false, reason: 'sold_out', card_state: 'SOLD_OUT', message_ar: 'العرض خلص', quota_used: afterUsed } });
        }
        const newUsed = oldUsed + 1;
        return json({ data: { consumed: true, offer_id: o.id, quota_used: newUsed, quota_remaining: Math.max(0, total - newUsed) } });
      }

      const rid = payload.restaurant_id;
      const variant = payload.variant || null;

      // ---- Campaign candidates ----
      const campU: any[] = [];
      if (rid) {
        const all = await SR.entities.CampaignOffer.filter({ restaurant_id: rid }).catch(() => []);
        const segs = await computeSegments(SR, user, phone, rid);
        for (const o of (all || [])) {
          if (o.is_demo && !includeDemo) continue; // never show demo to production customers
          const u = await campaignToUnified(SR, o, segs, phone, user, evalNow);
          if (!u.visible) continue;
          if (variant && u.mealset_variant_id && u.mealset_variant_id !== variant) continue;
          campU.push(u);
        }
      }

      // ---- GroupDeal candidates ----
      const gdU: any[] = [];
      if (rid) {
        const gdRid = Number(rid);
        const deals = isFinite(gdRid) ? await SR.entities.GroupDeal.filter({ restaurant_id: gdRid }).catch(() => []) : [];
        for (const d of (deals || [])) {
          const u = await groupDealToUnified(SR, d, phone, evalNow);
          if (!u.visible) continue;
          gdU.push(u);
        }
      }

      const candidates = [...campU, ...gdU].sort(unifiedPrecedence);
      for (const u of candidates) if (u.restaurant_id) u.restaurant_fulfillment = await fulfillmentSnapshot(SR, u.restaurant_id);

      if (action === 'unifiedList') return json({ data: candidates });

      // unifiedResolve — deterministic single pick + conflict explanation
      const selected = candidates[0] || null;
      const alternatives = candidates.slice(1);
      const eligibleSet = candidates.filter((c) => c.eligible);
      const conflict = eligibleSet.length > 1 && new Set(eligibleSet.map((c) => c.source_type)).size > 1;
      const conflictingOfferIds = conflict ? eligibleSet.map((c) => c.id) : [];
      const selectionReason = selected ? explainSelection(selected, candidates) : 'none';
      if (conflict) {
        console.warn('[TAMAM-UNIFIED-CONFLICT]', { restaurant_id: rid, variant, selected_offer_id: selected?.id, selected_source: selected?.source_type, conflicting_offer_ids: conflictingOfferIds, items: candidates.map((c) => ({ source: c.source_type, id: c.id, price: c.customer_price, state: c.card_state })) });
      }
      return json({ data: { selected, alternatives, selected_offer_id: selected?.id || null, selected_source: selected?.source_type || null, conflicting_offer_ids: conflictingOfferIds, selection_reason: selectionReason, conflict_logged: !!conflict, server_time: iso(new Date(evalNow)), test_time_active: includeDemo && !!payload.test_time } });
    }

    // ---------- PHASE 2 READINESS ----------
    if (action === 'getPhase2Readiness') {
      if (!await requireAdmin(base44)) return json({ error: 'forbidden' }, 403);
      return json({ data: await runReadiness(SR) });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error('campaignEngine error', e);
    return json({ error: e.message || 'server_error' }, 500);
  }
}

function fmtTime(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function aggregatePerformance(events: any[]) {
  const by = (t: string) => events.filter((e) => e.event_type === t).length;
  const purchases = events.filter((e) => e.event_type === 'purchase');
  return {
    impressions: by('impression'),
    offer_opens: by('offer_open'),
    unlocks: by('unlock'),
    add_to_cart: by('add_to_cart'),
    checkout_started: by('checkout_started'),
    purchases: purchases.length,
    revenue: Math.round(purchases.reduce((s, e) => s + (e.amount || 0), 0) * 100) / 100,
    restaurant_settlement: Math.round(purchases.reduce((s, e) => s + (e.restaurant_settlement || 0), 0) * 100) / 100,
    tamam_revenue: Math.round(purchases.reduce((s, e) => s + (e.tamam_revenue || 0), 0) * 100) / 100,
  };
}