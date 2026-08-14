import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import { json, errRes } from '../../shared/httpHelpers.ts';

// ============================================================================
// demoDataEngine — admin-only generator for the restaurant-owner portal demo.
//
// Every record it creates is tagged with is_demo=true and a constant
// demo_batch_id, so the dataset is idempotent (re-running skips existing
// records), fully deletable (delete removes only demo_batch_id matches), and
// never mixes with live customer data. All touched entities are already
// admin-RLS-locked, so demo records are never reachable by customers.
// ============================================================================

const BATCH_ID = 'tamam-demo-partner-v1';
const DEMO_RESTAURANT_NAME_AR = 'مطعم البركة التجريبي';
const DEMO_CITY = 'الناصرة';
const TZ = 'Asia/Jerusalem';

const OWNER_PERMISSIONS = [
  'view_dashboard', 'manage_menu', 'import_menu', 'manage_availability',
  'manage_operational_status', 'manage_guardrails', 'request_offers',
  'view_offers', 'manage_orders', 'view_performance', 'manage_staff',
  'manage_restaurant_settings', 'manage_demand_schedule',
];

const OPERATING_HOURS = [
  { day: 0, open: '10:00', close: '23:00' }, // Sun
  { day: 1, open: '10:00', close: '23:00' }, // Mon
  { day: 2, open: '10:00', close: '23:00' }, // Tue
  { day: 3, open: '10:00', close: '23:00' }, // Wed
  { day: 4, open: '10:00', close: '00:00' }, // Thu
  { day: 5, open: '12:00', close: '00:00' }, // Fri
  { day: 6, open: '12:00', close: '23:00' }, // Sat
];

// day_of_week → [{start,end,level}, ...]
const DEMAND_SLOTS = {
  0: [['10:00','12:00','medium'],['12:00','15:00','busy'],['15:00','18:00','quiet'],['18:00','21:00','busy'],['21:00','23:00','medium']],
  1: [['10:00','12:00','quiet'],['12:00','15:00','busy'],['15:00','18:00','quiet'],['18:00','21:00','medium'],['21:00','23:00','quiet']],
  2: [['10:00','12:00','quiet'],['12:00','15:00','medium'],['15:00','18:00','quiet'],['18:00','21:00','medium'],['21:00','23:00','quiet']],
  3: [['10:00','12:00','medium'],['12:00','15:00','busy'],['15:00','18:00','quiet'],['18:00','21:00','medium'],['21:00','23:00','medium']],
  4: [['10:00','12:00','medium'],['12:00','15:00','busy'],['15:00','18:00','medium'],['18:00','22:00','busy'],['22:00','00:00','medium']],
  5: [['12:00','15:00','medium'],['15:00','18:00','medium'],['18:00','22:00','busy'],['22:00','00:00','busy']],
  6: [['12:00','15:00','medium'],['15:00','18:00','busy'],['18:00','21:00','busy'],['21:00','23:00','medium']],
};
const DAY_LEVELS = {
  0: { level: 'medium', explanation: 'حركة متوسطة معظم النهار.' },
  1: { level: 'quiet', explanation: 'الحركة عادة أهدأ ببداية الأسبوع.' },
  2: { level: 'quiet', explanation: 'في عدة ساعات هادئة خلال اليوم.' },
  3: { level: 'medium', explanation: 'حركة متوسطة بتوزيع متوازن.' },
  4: { level: 'busy', explanation: 'الحركة أقوى من المساء.' },
  5: { level: 'busy', explanation: 'ضغط واضح خلال ساعات العشاء.' },
  6: { level: 'busy', explanation: 'ذروة نهاية الأسبوع.' },
};

const MENU_ITEMS = [
  { key: 'burger_classic', name: 'برجر لحم كلاسيك', category: 'برجر', desc: 'قطعة لحم مشوية، جبنة، خس، بندورة وصوص المطعم.', price: 45, prep: 15, available: true, campaign: true, image: 'https://images.unsplash.com/photo-1568901346375-23c9a0f320a1?w=800&q=80' },
  { key: 'chicken_burger_meal', name: 'وجبة برجر دجاج', category: 'برجر', desc: 'برجر دجاج مقرمش مع بطاطا ومشروب.', price: 42, prep: 15, available: true, campaign: true, image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&q=80' },
  { key: 'chicken_shawarma', name: 'شاورما دجاج', category: 'شاورما', desc: 'شاورما دجاج مع سلطة، مخلل وصوص.', price: 38, prep: 12, available: true, campaign: true, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80' },
  { key: 'margherita_pizza', name: 'بيتزا مارجريتا وسط', category: 'بيتزا', desc: 'صلصة بندورة، جبنة وأعشاب.', price: 48, prep: 20, available: true, campaign: true, image: 'https://images.unsplash.com/photo-1604068549290-dea13e963e16?w=800&q=80' },
  { key: 'fries', name: 'بطاطا مقلية', category: 'مقبلات', desc: 'بطاطا مقلية ومقرمشة.', price: 15, prep: 8, available: true, campaign: true, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80' },
  { key: 'family_meal', name: 'وجبة عائلية تجريبية', category: 'وجبات عائلية', desc: 'تشكيلة وجبات مناسبة للمشاركة.', price: 125, prep: 25, available: true, campaign: true, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' },
  { key: 'seasonal_salad', name: 'سلطة موسمية', category: 'سلطات', desc: 'خضار طازجة بتتبيلة خفيفة.', price: 22, prep: 8, available: false, campaign: false, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
  { key: 'soft_drink', name: 'مشروب غازي', category: 'مشروبات', desc: 'مشروب بارد.', price: 10, prep: 2, available: true, campaign: false, image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&q=80' },
  { key: 'new_chicken_sandwich', name: 'ساندويتش دجاج جديد', category: 'ساندويتش', desc: '', price: 36, prep: 12, available: true, campaign: true, image: '' },
];

async function requireAdmin(base44) {
  const user = await base44.auth.me();
  if (!user) throw { status: 401, message: 'auth_required' };
  if (user.role !== 'admin') throw { status: 403, message: 'admin_only' };
  return user;
}

async function findBy(filter, list) {
  const res = await list();
  return (res || [])[0] || null;
}

export default async function demoDataEngine(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const payload = body?.payload || {};
    const user = await requireAdmin(base44);

    switch (action) {
      case 'status': return json({ data: await getStatus(base44) });
      case 'generate':
      case 'refresh': return json({ data: await generate(base44, user, payload, false) });
      case 'reset': return json({ data: await generate(base44, user, payload, true) });
      case 'delete': return json({ data: await deleteAll(base44) });
      default: return json({ error: 'unknown_action' }, 400);
    }
  } catch (e) { return errRes(e); }
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
async function getStatus(base44) {
  const r = await findDemoRestaurant(base44);
  const rid = r?.id || null;
  const counts = { restaurant: rid ? 1 : 0 };
  const entities = [
    ['RestaurantMembership', 'restaurant_id'],
    ['RestaurantMealOffer', 'restaurant_id'],
    ['WeeklyDemandProfile', 'restaurant_id'],
    ['DemandSlot', 'restaurant_id'],
    ['DemandDayProfile', 'restaurant_id'],
    ['RestaurantOperationalSignal', 'restaurant_id'],
    ['CommercialGuardrail', 'restaurant_id'],
    ['OfferRequest', 'restaurant_id'],
    ['RestaurantSubOrder', 'restaurant_id'],
  ];
  for (const [name] of entities) {
    const all = await base44.asServiceRole.entities[name].filter({ demo_batch_id: BATCH_ID }, '-created_date', 500).catch(() => []);
    counts[name] = (all || []).length;
  }
  const membership = rid
    ? await findBy({ restaurant_id: rid }, () => base44.asServiceRole.entities.RestaurantMembership.filter({ restaurant_id: rid, status: 'active' }, '-created_date', 10).catch(() => []))
    : null;
  return {
    batch_id: BATCH_ID,
    exists: !!rid,
    restaurant: rid ? { id: rid, name_ar: r.name_ar, city: r.city, accepts_orders: r.accepts_orders, current_status: r.current_status } : null,
    membership: membership ? { id: membership.id, user_id: membership.user_id, partner_role: membership.partner_role, status: membership.status } : null,
    counts,
  };
}

// ---------------------------------------------------------------------------
// Find / create demo restaurant
// ---------------------------------------------------------------------------
async function findDemoRestaurant(base44) {
  const list = await base44.asServiceRole.entities.Restaurant.filter({ is_demo: true, demo_batch_id: BATCH_ID }, '-created_date', 10).catch(() => []);
  return (list || [])[0] || null;
}

async function ensureRestaurant(base44) {
  let r = await findDemoRestaurant(base44);
  if (r) return r;
  r = await base44.asServiceRole.entities.Restaurant.create({
    name: 'AlBaraka Demo',
    name_ar: DEMO_RESTAURANT_NAME_AR,
    description: 'مطعم تجريبي لمعاينة بوابة أصحاب المطاعم — البيانات لا تظهر للعملاء.',
    phone: '0500000000',
    whatsapp: '',
    address: 'الشارع الرئيسي',
    city: DEMO_CITY,
    active: true,
    accepts_orders: true,
    current_status: 'open',
    preparation_time_min: 20,
    preparation_time_max: 35,
    minimum_order: 25,
    delivery_fee: 8,
    is_demo: true,
    demo_batch_id: BATCH_ID,
  });
  return r;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------
async function ensureMembership(base44, rid, userId) {
  if (!userId) return null;
  const list = await base44.asServiceRole.entities.RestaurantMembership
    .filter({ user_id: userId, restaurant_id: rid }, '-created_date', 20).catch(() => []);
  let m = (list || []).find((x) => x.status === 'active') || (list || [])[0] || null;
  if (m) {
    if (m.status !== 'active' || m.partner_role !== 'owner' || (m.permissions || []).length < OWNER_PERMISSIONS.length) {
      m = await base44.asServiceRole.entities.RestaurantMembership.update(m.id, {
        status: 'active', partner_role: 'owner', permissions: OWNER_PERMISSIONS,
        activated_at: new Date().toISOString(), is_demo: true, demo_batch_id: BATCH_ID,
      });
    }
    return m;
  }
  m = await base44.asServiceRole.entities.RestaurantMembership.create({
    user_id: userId, restaurant_id: rid, partner_role: 'owner', status: 'active',
    permissions: OWNER_PERMISSIONS, activated_at: new Date().toISOString(),
    is_demo: true, demo_batch_id: BATCH_ID,
  });
  return m;
}

// ---------------------------------------------------------------------------
// Demand profile + slots + day profiles
// ---------------------------------------------------------------------------
async function ensureDemand(base44, rid) {
  let list = await base44.asServiceRole.entities.WeeklyDemandProfile
    .filter({ restaurant_id: rid, demo_batch_id: BATCH_ID }, '-updated_date', 20).catch(() => []);
  let profile = (list || [])[0] || null;
  if (!profile) {
    list = await base44.asServiceRole.entities.WeeklyDemandProfile.filter({ restaurant_id: rid }, '-updated_date', 20).catch(() => []);
    profile = (list || [])[0] || null;
  }
  if (!profile) {
    profile = await base44.asServiceRole.entities.WeeklyDemandProfile.create({
      restaurant_id: rid, timezone: TZ, slot_duration_minutes: 60, profile_status: 'complete',
      default_source: 'merchant', operating_hours_json: JSON.stringify(OPERATING_HOURS),
      last_updated_at: new Date().toISOString(), is_demo: true, demo_batch_id: BATCH_ID,
    });
  } else {
    profile = await base44.asServiceRole.entities.WeeklyDemandProfile.update(profile.id, {
      profile_status: 'complete', operating_hours_json: JSON.stringify(OPERATING_HOURS),
      last_updated_at: new Date().toISOString(), is_demo: true, demo_batch_id: BATCH_ID,
    });
  }
  // Slots: idempotent by profile + day + start
  const existingSlots = await base44.asServiceRole.entities.DemandSlot
    .filter({ weekly_demand_profile_id: profile.id }, 'day_of_week', 500).catch(() => []);
  const byKey = {};
  (existingSlots || []).forEach((s) => { byKey[`${s.day_of_week}|${s.start_time}`] = s; });
  let slotsCreated = 0;
  for (const [dStr, rows] of Object.entries(DEMAND_SLOTS)) {
    const d = Number(dStr);
    for (const [start, end, level] of rows) {
      const ex = byKey[`${d}|${start}`];
      const fields = {
        weekly_demand_profile_id: profile.id, restaurant_id: rid, day_of_week: d,
        start_time: start, end_time: end, demand_level: level, source: 'merchant',
        is_recurring: true, is_demo: true, demo_batch_id: BATCH_ID,
      };
      if (ex) await base44.asServiceRole.entities.DemandSlot.update(ex.id, fields).catch(() => {});
      else { await base44.asServiceRole.entities.DemandSlot.create(fields); slotsCreated++; }
    }
  }
  // Day profiles
  const existingDp = await base44.asServiceRole.entities.DemandDayProfile
    .filter({ weekly_demand_profile_id: profile.id }, 'day_of_week', 50).catch(() => []);
  const dpByDay = {};
  (existingDp || []).forEach((x) => { dpByDay[x.day_of_week] = x; });
  for (const [dStr, info] of Object.entries(DAY_LEVELS)) {
    const d = Number(dStr);
    const fields = {
      weekly_demand_profile_id: profile.id, restaurant_id: rid, day_of_week: d,
      manual_demand_level: info.level, suggested_demand_level: info.level,
      effective_demand_level: info.level, source: 'merchant', explanation: info.explanation,
      is_demo: true, demo_batch_id: BATCH_ID,
    };
    if (dpByDay[d]) await base44.asServiceRole.entities.DemandDayProfile.update(dpByDay[d].id, fields).catch(() => {});
    else await base44.asServiceRole.entities.DemandDayProfile.create(fields);
  }
  return { profile_id: profile.id, slots_created: slotsCreated };
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
async function ensureMenu(base44, rid) {
  const existing = await base44.asServiceRole.entities.RestaurantMealOffer
    .filter({ restaurant_id: rid, is_demo: true, demo_batch_id: BATCH_ID }, 'display_order', 200).catch(() => []);
  const byName = {};
  (existing || []).forEach((i) => { byName[i.restaurant_product_name] = i; });
  let created = 0;
  let order = 0;
  for (const it of MENU_ITEMS) {
    order++;
    const fields = {
      restaurant_id: rid, restaurant_product_name: it.name, price: it.price,
      short_description_ar: it.desc, customer_visible_description: it.desc,
      primary_image: it.image || null, available: it.available, active: true,
      preparation_time_override: it.prep, restaurant_category_name: it.category,
      mapping_status: 'unmapped', display_order: order, currency: 'ILS', tax_included: true,
      dietary_labels: [], is_demo: true, demo_batch_id: BATCH_ID,
    };
    if (byName[it.name]) {
      await base44.asServiceRole.entities.RestaurantMealOffer.update(byName[it.name].id, {
        price: it.price, available: it.available, preparation_time_override: it.prep,
        restaurant_category_name: it.category, primary_image: it.image || null,
      }).catch(() => {});
    } else {
      await base44.asServiceRole.entities.RestaurantMealOffer.create(fields);
      created++;
    }
  }
  const all = await base44.asServiceRole.entities.RestaurantMealOffer
    .filter({ restaurant_id: rid, is_demo: true, demo_batch_id: BATCH_ID }, 'display_order', 200).catch(() => []);
  const nameToId = {};
  (all || []).forEach((i) => { nameToId[i.restaurant_product_name] = i.id; });
  return { created, by_name: nameToId };
}

// ---------------------------------------------------------------------------
// Operational signals
// ---------------------------------------------------------------------------
async function ensureSignals(base44, rid, nameToId) {
  const existing = await base44.asServiceRole.entities.RestaurantOperationalSignal
    .filter({ restaurant_id: rid, demo_batch_id: BATCH_ID }, '-created_date', 50).catch(() => []);
  const byType = {};
  (existing || []).forEach((s) => { byType[s.type] = s; });
  const now = new Date();
  const iso = (d) => d.toISOString();
  const defs = [
    { type: 'kitchen_pressure', status: 'resolved', reason: 'ضغط وقت الغدا — مثال تجريبي.', expected_duration: 60, menu_item_id: null, quantity: null, starts_at: iso(new Date(now.getTime() - 3600 * 1000)), expires_at: iso(now), resolved_at: iso(now) },
    { type: 'surplus', status: 'active', reason: 'كمية جاهزة للتسويق — مثال تجريبي.', menu_item_id: nameToId['وجبة برجر دجاج'] || null, quantity: 20, starts_at: iso(now), expires_at: iso(new Date(now.getTime() + 3 * 3600 * 1000)) },
    { type: 'strengthen_item', status: 'active', reason: 'تقوية مبيعات الوجبة بوقت هادئ.', menu_item_id: nameToId['بيتزا مارجريتا وسط'] || null, quantity: 15, starts_at: iso(now) },
    { type: 'sold_out', status: 'active', reason: 'الصنف غير متوفر مؤقتًا.', menu_item_id: nameToId['سلطة موسمية'] || null, quantity: null, starts_at: iso(now) },
  ];
  let created = 0;
  for (const d of defs) {
    if (byType[d.type]) continue;
    await base44.asServiceRole.entities.RestaurantOperationalSignal.create({
      restaurant_id: rid, ...d, is_demo: true, demo_batch_id: BATCH_ID,
    });
    created++;
  }
  return created;
}

// ---------------------------------------------------------------------------
// Guardrails
// ---------------------------------------------------------------------------
async function ensureGuardrails(base44, rid, nameToId) {
  const existing = await base44.asServiceRole.entities.CommercialGuardrail
    .filter({ restaurant_id: rid, demo_batch_id: BATCH_ID }, '-created_date', 50).catch(() => []);
  const byKey = {};
  (existing || []).forEach((g) => { byKey[g.menu_item_id || 'restaurant'] = g; });
  const defs = [
    { menu_item_id: null, max_quantity: 20, minimum_restaurant_net: null, allowed_time_ranges: ['15:00-18:00'], requires_manual_approval: true, status: 'active', pickup_allowed: true, delivery_allowed: true },
    { menu_item_id: nameToId['برجر لحم كلاسيك'] || null, minimum_restaurant_net: 32, status: 'active' },
    { menu_item_id: nameToId['مشروب غازي'] || null, max_quantity: 0, status: 'active' },
  ];
  let created = 0;
  for (const d of defs) {
    const key = d.menu_item_id || 'restaurant';
    const fields = {
      restaurant_id: rid, menu_item_id: d.menu_item_id || null,
      max_quantity: d.max_quantity != null ? d.max_quantity : null,
      minimum_restaurant_net: d.minimum_restaurant_net != null ? d.minimum_restaurant_net : null,
      allowed_time_ranges: d.allowed_time_ranges || [], requires_manual_approval: !!d.requires_manual_approval,
      pickup_allowed: d.pickup_allowed != null ? d.pickup_allowed : null,
      delivery_allowed: d.delivery_allowed != null ? d.delivery_allowed : null,
      status: d.status || 'active', is_demo: true, demo_batch_id: BATCH_ID,
    };
    if (byKey[key]) await base44.asServiceRole.entities.CommercialGuardrail.update(byKey[key].id, fields).catch(() => {});
    else { await base44.asServiceRole.entities.CommercialGuardrail.create(fields); created++; }
  }
  return created;
}

// ---------------------------------------------------------------------------
// Offer requests
// ---------------------------------------------------------------------------
async function ensureOfferRequests(base44, rid, user, nameToId) {
  const existing = await base44.asServiceRole.entities.OfferRequest
    .filter({ restaurant_id: rid, demo_batch_id: BATCH_ID }, '-created_date', 50).catch(() => []);
  const byGoal = {};
  (existing || []).forEach((o) => { byGoal[o.goal] = o; });
  const defs = [
    { goal: 'quiet_hour', requested_menu_items: [nameToId['بيتزا مارجريتا وسط']].filter(Boolean), allowed_days: [2], allowed_time_ranges: ['15:00-17:00'], available_quantity: 15, status: 'under_review', operational_reason: 'تقوية وقت الثلاثاء الهادئ', restaurant_notes: 'موافقة المطعم: نعم' },
    { goal: 'attract_new', requested_menu_items: [nameToId['برجر لحم كلاسيك']].filter(Boolean), allowed_days: [1], allowed_time_ranges: ['16:00-18:00'], available_quantity: 20, status: 'submitted', operational_reason: 'وصول البرجر لزبائن جدد', restaurant_notes: 'بانتظار موافقة المطعم' },
    { goal: 'strengthen_item', requested_menu_items: [nameToId['وجبة برجر دجاج']].filter(Boolean), available_quantity: 20, status: 'converted_to_offer', operational_reason: 'تقوية وجبة البرجر دجاج' },
  ];
  let created = 0;
  for (const d of defs) {
    if (byGoal[d.goal]) continue;
    await base44.asServiceRole.entities.OfferRequest.create({
      restaurant_id: rid, requested_by: user.id, submitted_at: new Date().toISOString(),
      pickup_allowed: true, delivery_allowed: true, is_demo: true, demo_batch_id: BATCH_ID, ...d,
    });
    created++;
  }
  return created;
}

// ---------------------------------------------------------------------------
// Demo orders
// ---------------------------------------------------------------------------
function itemsJson(items) { return JSON.stringify(items); }

async function ensureOrders(base44, rid, nameToId) {
  const existing = await base44.asServiceRole.entities.RestaurantSubOrder
    .filter({ restaurant_id: rid, demo_batch_id: BATCH_ID }, '-created_date', 50).catch(() => {});
  const byStatus = {};
  (existing || []).forEach((o) => { byStatus[o.status] = o; });
  const item = (name, qty, price) => ({ name, quantity: qty, price, modifiers: [] });
  const defs = [
    { status: 'pending', items: [item('برجر لحم كلاسيك', 1, 45), item('بطاطا مقلية', 1, 15)], total: 60, number: 'DEMO-1001' },
    { status: 'preparing', items: [item('شاورما دجاج', 2, 38)], total: 76, number: 'DEMO-1002' },
    { status: 'ready', items: [item('بيتزا مارجريتا وسط', 1, 48)], total: 48, number: 'DEMO-1003' },
    { status: 'delivered', items: [item('وجبة برجر دجاج', 1, 42)], total: 42, number: 'DEMO-1004' },
  ];
  let created = 0;
  for (const d of defs) {
    if (byStatus[d.status]) continue;
    await base44.asServiceRole.entities.RestaurantSubOrder.create({
      parent_order_id: `demo-${d.number}`, parent_order_number: d.number, restaurant_id: rid,
      restaurant_name_snapshot: DEMO_RESTAURANT_NAME_AR, items_json: itemsJson(d.items),
      products_subtotal: d.total, total: d.total, status: d.status,
      customer_name: 'زبون تجريبي', customer_phone: '', customer_notes: '',
      is_demo: true, demo_batch_id: BATCH_ID,
    });
    created++;
  }
  return created;
}

// ---------------------------------------------------------------------------
// Generate / refresh / reset
// ---------------------------------------------------------------------------
async function generate(base44, user, payload, reset) {
  if (reset) await deleteAll(base44);
  const restaurant = await ensureRestaurant(base44);
  const rid = restaurant.id;
  const membership = await ensureMembership(base44, rid, payload.user_id || null);
  const demand = await ensureDemand(base44, rid);
  const menu = await ensureMenu(base44, rid);
  const signals = await ensureSignals(base44, rid, menu.by_name);
  const guardrails = await ensureGuardrails(base44, rid, menu.by_name);
  const offerRequests = await ensureOfferRequests(base44, rid, user, menu.by_name);
  const orders = await ensureOrders(base44, rid, menu.by_name);
  return {
    batch_id: BATCH_ID,
    restaurant: { id: rid, name_ar: restaurant.name_ar },
    membership: membership ? { id: membership.id, user_id: membership.user_id } : null,
    created: {
      demand_slots: demand.slots_created,
      menu_items: menu.created,
      signals,
      guardrails,
      offer_requests: offerRequests,
      orders,
    },
    reset,
  };
}

// ---------------------------------------------------------------------------
// Delete all demo records for this batch
// ---------------------------------------------------------------------------
async function deleteAll(base44) {
  const r = await findDemoRestaurant(base44);
  const rid = r?.id || null;
  const entities = [
    'RestaurantMembership', 'RestaurantMealOffer', 'WeeklyDemandProfile',
    'DemandSlot', 'DemandDayProfile', 'RestaurantOperationalSignal',
    'CommercialGuardrail', 'OfferRequest', 'RestaurantSubOrder',
  ];
  let deleted = 0;
  for (const name of entities) {
    const list = await base44.asServiceRole.entities[name].filter({ demo_batch_id: BATCH_ID }, '-created_date', 500).catch(() => []);
    for (const rec of list || []) {
      await base44.asServiceRole.entities[name].delete(rec.id).catch(() => {});
      deleted++;
    }
  }
  if (rid) {
    await base44.asServiceRole.entities.Restaurant.delete(rid).catch(() => {});
    deleted++;
  }
  return { deleted, batch_id: BATCH_ID };
}