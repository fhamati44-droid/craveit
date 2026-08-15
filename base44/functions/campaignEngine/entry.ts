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

function offerStatus(offer) {
  const start = offer.start_at ? new Date(offer.start_at).getTime() : 0;
  const end = offer.end_at ? new Date(offer.end_at).getTime() : Infinity;
  const t = now();
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
      const o = await SR.entities.CampaignOffer.get(payload.offer_id).catch(() => null);
      if (!o) return json({ error: 'not_found' }, 404);
      if (o.unlock_type !== 'point_locked' || !o.unlock_points) return json({ error: 'not_point_locked' }, 400);
      if (offerStatus(o) !== 'active') return json({ error: 'not_active' }, 400);
      const existing = await SR.entities.OfferUnlock.filter({ deal_id: o.id, phone }).catch(() => []);
      if (existing && existing.length) return json({ data: { already_unlocked: true, offer_id: o.id } });
      const acc = await loyaltyAccount(SR, phone);
      if (!acc || (acc.balance || 0) < o.unlock_points) return json({ error: 'insufficient_points', balance: acc?.balance || 0, cost: o.unlock_points }, 400);
      const newBal = (acc.balance || 0) - o.unlock_points;
      await SR.entities.LoyaltyAccount.update(acc.id, { balance: newBal, used_points: (acc.used_points || 0) + o.unlock_points });
      await SR.entities.PointsTransaction.create({ account_id: acc.id, phone, points: -o.unlock_points, type: 'offer_unlock', status: 'available' });
      await SR.entities.OfferUnlock.create({ deal_id: o.id, phone, user_id: user?.id || '', unlocked_at: iso(new Date()), points_spent: o.unlock_points });
      await SR.entities.CampaignEvent.create({ campaign_id: o.campaign_id, offer_id: o.id, restaurant_id: o.restaurant_id, user_id: user?.id || '', phone, channel: payload.channel || 'khabya', event_type: 'unlock', is_demo: o.is_demo, demo_batch_id: o.demo_batch_id || '' });
      return json({ data: { unlocked: true, offer_id: o.id, points_spent: o.unlock_points, balance_after: newBal } });
    }
    if (action === 'recordEvent') {
      const user = await currentUser(base44);
      const o = payload.offer_id ? await SR.entities.CampaignOffer.get(payload.offer_id).catch(() => null) : null;
      const bd = o ? commercialBreakdown({ normal_price: o.normal_reference_price, customer_price: o.customer_price, restaurant_contribution: o.restaurant_contribution, tamam_contribution: o.tamam_contribution }) : null;
      // consume quota on purchase
      if (o && payload.event_type === 'purchase') {
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