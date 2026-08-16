import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import {
  resolveMembership,
  getMemberships,
  loadRestaurantsForMemberships,
  logAudit,
  authError,
  OWNER_PERMISSIONS,
} from '../../shared/partnerAuth.ts';

// ============================================================================
// partnerEngine — secure backend for the TAMAM Restaurant Partner OS.
//
// Base44 RLS cannot express a cross-entity "user has an active membership for
// this restaurant" check, so this function is the authoritative access layer:
// every protected action calls resolveMembership(restaurant_id, permission)
// and only then reads/writes that restaurant's records via the service role.
// The frontend never touches partner-owned entities directly.
// ============================================================================

function json(data, status = 200) {
  return Response.json(data, { status });
}

function errRes(e) {
  const status = e?.status || 500;
  return json({ error: e?.message || 'server_error' }, status);
}

// Restaurant-editable menu item fields (mapping/tier fields are NOT editable).
const MENU_ITEM_EDITABLE = [
  'restaurant_product_name', 'name_ar', 'short_description_ar', 'full_description_ar',
  'customer_visible_description', 'restaurant_sku', 'price', 'compare_at_price',
  'primary_image', 'gallery_images', 'thumbnail_image', 'available', 'active', 'sold_out',
  'available_quantity', 'preparation_time_override', 'minimum_quantity', 'maximum_quantity',
  'restaurant_notes', 'restaurant_category_name', 'menu_section_name', 'display_order',
  'ingredients_ar', 'allergens_ar',
];
function pickEditable(src) {
  const out = {};
  for (const k of MENU_ITEM_EDITABLE) if (src[k] !== undefined) out[k] = src[k];
  return out;
}

const ORDER_TRANSITIONS = {
  pending: ['accepted', 'preparing', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['picked_up', 'delivered', 'cancelled'],
  picked_up: ['on_the_way', 'delivered'],
  on_the_way: ['delivered'],
};

export default async function partnerEngine(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const payload = body?.payload || {};
    const handler = ROUTES[action];
    if (!handler) return json({ error: 'unknown_action' }, 400);
    const result = await handler(base44, payload);
    return json({ data: result });
  } catch (e) {
    return errRes(e);
  }
}

// ---------------------------------------------------------------------------
// Context / access
// ---------------------------------------------------------------------------
async function getMyContext(base44) {
  const user = await base44.auth.me();
  if (!user) throw authError(401, 'auth_required');
  if (user.role === 'admin') {
    const all = await base44.asServiceRole.entities.Restaurant.list('name', 200);
    return { user: { id: user.id, full_name: user.full_name, role: user.role }, isAdmin: true, memberships: [], restaurants: all || [] };
  }
  const memberships = await getMemberships(base44, user.id);
  const restaurants = await loadRestaurantsForMemberships(base44, memberships);
  return {
    user: { id: user.id, full_name: user.full_name, role: user.role },
    isAdmin: false,
    memberships: memberships.map((m) => ({
      id: m.id, restaurant_id: m.restaurant_id, branch_id: m.branch_id || null,
      partner_role: m.partner_role, permissions: m.permissions || [], status: m.status,
    })),
    restaurants,
  };
}

async function submitPartnerApplication(base44, payload) {
  const user = await base44.auth.me();
  if (!user) throw authError(401, 'auth_required');
  const rec = await base44.asServiceRole.entities.RestaurantPartnerApplication.create({
    user_id: user.id,
    user_email: user.email || '',
    user_name: user.full_name || '',
    restaurant_name: (payload.restaurant_name || '').trim(),
    restaurant_phone: payload.restaurant_phone || '',
    restaurant_city: payload.restaurant_city || '',
    message: payload.message || '',
    status: 'pending',
  });
  await logAudit(base44, '', user.id, user.full_name, 'partner_application', rec.id, 'submitted', null, null, '');
  return { id: rec.id, status: 'pending' };
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
async function getHome(base44, { restaurant_id }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'view_dashboard');
  const restaurant = await base44.asServiceRole.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!restaurant) throw authError(404, 'restaurant_not_found');

  const orders = await base44.asServiceRole.entities.RestaurantSubOrder
    .filter({ restaurant_id }, '-created_date', 200).catch(() => []);
  const activeOrders = (orders || []).filter((o) =>
    ['pending', 'accepted', 'preparing', 'ready'].includes(o.status));

  // Offers for this restaurant (derived from items for robustness)
  const dealItems = await base44.asServiceRole.entities.GroupDealItem
    .filter({ restaurant_id }, 'sort_order', 200).catch(() => []);
  const dealIds = [...new Set((dealItems || []).map((i) => i.deal_id).filter(Boolean))];
  let offers = [];
  if (dealIds.length) {
    const allDeals = await base44.asServiceRole.entities.GroupDeal.list('-updated_date', 200).catch(() => []);
    offers = (allDeals || []).filter((d) => dealIds.includes(d.id));
  }
  const liveOffers = offers.filter((o) => o.status === 'active');
  const scheduledOffers = offers.filter((o) => o.status === 'scheduled');

  const menuItems = await base44.asServiceRole.entities.RestaurantMealOffer
    .filter({ restaurant_id }, 'display_order', 200).catch(() => []);
  const menuIssues = (menuItems || []).filter((i) =>
    i.mapping_status === 'unmapped' || i.mapping_status === 'needs_review' || !i.primary_image);

  return {
    restaurant: {
      id: restaurant.id, name: restaurant.name, name_ar: restaurant.name_ar,
      current_status: restaurant.current_status, accepts_orders: restaurant.accepts_orders,
      active: restaurant.active, preparation_time_min: restaurant.preparation_time_min,
      preparation_time_max: restaurant.preparation_time_max,
    },
    active_orders: activeOrders.map(orderSummary),
    active_offers: liveOffers.map(offerSummary),
    scheduled_offers: scheduledOffers.map(offerSummary),
    menu_issues: menuIssues.slice(0, 6).map((i) => ({
      id: i.id, name: i.restaurant_product_name || i.name_ar, mapping_status: i.mapping_status,
      has_image: !!i.primary_image,
    })),
    counts: {
      active_orders: activeOrders.length,
      live_offers: liveOffers.length,
      menu_issues: menuIssues.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
async function listMenuItems(base44, { restaurant_id, filter }) {
  await resolveMembership(base44, restaurant_id, 'manage_menu');
  const items = await base44.asServiceRole.entities.RestaurantMealOffer
    .filter({ restaurant_id }, 'display_order', 500).catch(() => []);
  let list = items || [];
  if (filter === 'available') list = list.filter((i) => i.available !== false && i.active !== false);
  else if (filter === 'unavailable') list = list.filter((i) => i.available === false || i.active === false);
  else if (filter === 'incomplete') list = list.filter((i) => !i.primary_image || !i.restaurant_product_name || i.price == null);
  return list.map(menuItemSummary);
}

async function getMenuItem(base44, { restaurant_id, item_id }) {
  await resolveMembership(base44, restaurant_id, 'manage_menu');
  const item = await base44.asServiceRole.entities.RestaurantMealOffer.get(item_id).catch(() => null);
  if (!item || item.restaurant_id !== restaurant_id) throw authError(404, 'not_found');
  // Does this item appear in any live offer?
  const dealItems = await base44.asServiceRole.entities.GroupDealItem
    .filter({ restaurant_id }, 'sort_order', 200).catch(() => []);
  const dealIds = [...new Set((dealItems || []).map((i) => i.deal_id).filter(Boolean))];
  let linkedOffer = null;
  if (dealIds.length) {
    const allDeals = await base44.asServiceRole.entities.GroupDeal.list('-updated_date', 200).catch(() => []);
    const match = (allDeals || []).find((d) => dealIds.includes(d.id) && (d.status === 'active' || d.status === 'scheduled'));
    if (match) linkedOffer = { id: match.id, title: match.title, status: match.status };
  }
  const gList = await base44.asServiceRole.entities.CommercialGuardrail
    .filter({ restaurant_id, menu_item_id: item_id, status: 'active' }, '-created_date', 10).catch(() => []);
  return { item, linked_offer: linkedOffer, guardrail: (gList || [])[0] || null };
}

async function createMenuItem(base44, { restaurant_id, data }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_menu');
  const fields = pickEditable(data);
  fields.restaurant_id = restaurant_id;
  if (fields.price == null || Number(fields.price) <= 0) throw authError(400, 'price_required');
  if (!fields.restaurant_product_name && !fields.name_ar) throw authError(400, 'name_required');
  if (fields.active === undefined) fields.active = true;
  if (fields.available === undefined) fields.available = true;
  fields.mapping_status = 'unmapped';
  const created = await base44.asServiceRole.entities.RestaurantMealOffer.create(fields);
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'menu_item', created.id, 'created', null, fields, '');
  return { id: created.id };
}

async function updateMenuItem(base44, { restaurant_id, item_id, data }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_menu');
  const existing = await base44.asServiceRole.entities.RestaurantMealOffer.get(item_id).catch(() => null);
  if (!existing || existing.restaurant_id !== restaurant_id) throw authError(404, 'not_found');
  const fields = pickEditable(data);
  if (Object.keys(fields).length === 0) throw authError(400, 'no_fields');
  const updated = await base44.asServiceRole.entities.RestaurantMealOffer.update(item_id, fields);
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'menu_item', item_id, 'updated', existing, fields, '');
  return { id: updated.id };
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------
async function listOffers(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_offers');
  const dealItems = await base44.asServiceRole.entities.GroupDealItem
    .filter({ restaurant_id }, 'sort_order', 200).catch(() => []);
  const dealIds = [...new Set((dealItems || []).map((i) => i.deal_id).filter(Boolean))];
  if (!dealIds.length) return [];
  const allDeals = await base44.asServiceRole.entities.GroupDeal.list('-updated_date', 200).catch(() => []);
  const deals = (allDeals || []).filter((d) => dealIds.includes(d.id));
  return deals.map(offerSummary);
}

async function getOffer(base44, { restaurant_id, offer_id }) {
  await resolveMembership(base44, restaurant_id, 'view_offers');
  const deal = await base44.asServiceRole.entities.GroupDeal.get(offer_id).catch(() => null);
  if (!deal) throw authError(404, 'not_found');
  const items = await base44.asServiceRole.entities.GroupDealItem
    .filter({ deal_id: offer_id }, 'sort_order', 100).catch(() => []);
  const myItems = (items || []).filter((i) => i.restaurant_id === restaurant_id);
  const guardrails = await base44.asServiceRole.entities.CommercialGuardrail
    .filter({ restaurant_id, status: 'active' }, 'created_date', 50).catch(() => []);
  return {
    offer: offerSummary(deal),
    items: myItems.map((i) => ({
      id: i.id, meal_name_snapshot: i.meal_name_snapshot, base_price_snapshot: i.base_price_snapshot,
      quantity_included: i.quantity_included, image_snapshot: i.image_snapshot,
    })),
    guardrails: (guardrails || []).map((g) => ({
      id: g.id, menu_item_id: g.menu_item_id, minimum_customer_offer_price: g.minimum_customer_offer_price,
      minimum_restaurant_net: g.minimum_restaurant_net, normal_price: g.normal_price, status: g.status,
    })),
  };
}

async function pauseOfferRequest(base44, { restaurant_id, offer_id, reason }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_orders');
  if (!reason || !reason.trim()) throw authError(400, 'reason_required');
  // Partner cannot mutate the offer directly; record an operational signal + audit.
  await base44.asServiceRole.entities.RestaurantOperationalSignal.create({
    restaurant_id, type: 'temporary_pause', reason: `pause offer ${offer_id}: ${reason}`,
    status: 'active', created_by: user.id, starts_at: new Date().toISOString(),
  });
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'offer', offer_id, 'pause_requested', null, null, reason);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
async function listOrders(base44, { restaurant_id, tab }) {
  await resolveMembership(base44, restaurant_id, 'manage_orders');
  const orders = await base44.asServiceRole.entities.RestaurantSubOrder
    .filter({ restaurant_id }, '-created_date', 200).catch(() => []);
  let list = orders || [];
  if (tab === 'new') list = list.filter((o) => o.status === 'pending');
  else if (tab === 'preparing') list = list.filter((o) => ['accepted', 'preparing'].includes(o.status));
  else if (tab === 'ready') list = list.filter((o) => o.status === 'ready');
  else if (tab === 'done') list = list.filter((o) => ['delivered', 'picked_up', 'on_the_way'].includes(o.status));
  return list.map(orderSummary);
}

async function getOrder(base44, { restaurant_id, order_id }) {
  await resolveMembership(base44, restaurant_id, 'manage_orders');
  const order = await base44.asServiceRole.entities.RestaurantSubOrder.get(order_id).catch(() => null);
  if (!order || order.restaurant_id !== restaurant_id) throw authError(404, 'not_found');
  const events = await base44.asServiceRole.entities.OrderStatusEvent
    .filter({ order_id }, '-created_date', 50).catch(() => []);
  return { order: orderSummary(order), items: parseItems(order.items_json), events: events || [] };
}

async function updateOrderStatus(base44, { restaurant_id, order_id, new_status, reason }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_orders');
  const order = await base44.asServiceRole.entities.RestaurantSubOrder.get(order_id).catch(() => null);
  if (!order || order.restaurant_id !== restaurant_id) throw authError(404, 'not_found');
  const prev = order.status;
  const allowed = ORDER_TRANSITIONS[prev] || [];
  if (!allowed.includes(new_status)) throw authError(400, 'invalid_transition');
  if ((new_status === 'rejected' || new_status === 'cancelled') && (!reason || !reason.trim())) {
    throw authError(400, 'reason_required');
  }
  await base44.asServiceRole.entities.RestaurantSubOrder.update(order_id, { status: new_status });
  await base44.asServiceRole.entities.OrderStatusEvent.create({
    order_id, restaurant_id, previous_status: prev, new_status, changed_by: user.id, reason: reason || '',
  });
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'order', order_id, 'status_change', prev, new_status, reason || '');
  return { ok: true, previous_status: prev, new_status };
}

// ---------------------------------------------------------------------------
// Operational signals
// ---------------------------------------------------------------------------
async function listSignals(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'manage_availability');
  const signals = await base44.asServiceRole.entities.RestaurantOperationalSignal
    .filter({ restaurant_id }, '-created_date', 100).catch(() => []);
  return (signals || []).filter((s) => s.status === 'active');
}

async function createSignal(base44, { restaurant_id, data }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_operational_status');
  if (!data?.type) throw authError(400, 'type_required');
  const rec = await base44.asServiceRole.entities.RestaurantOperationalSignal.create({
    restaurant_id,
    branch_id: data.branch_id || null,
    type: data.type,
    menu_item_id: data.menu_item_id || null,
    quantity: data.quantity != null ? Number(data.quantity) : null,
    expected_duration: data.expected_duration != null ? Number(data.expected_duration) : null,
    reason: data.reason || '',
    status: 'active',
    starts_at: new Date().toISOString(),
    expires_at: data.expires_at || null,
    created_by: user.id,
  });
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'signal', rec.id, 'created', null, rec, '');
  return { id: rec.id };
}

async function resolveSignal(base44, { restaurant_id, signal_id }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_operational_status');
  const sig = await base44.asServiceRole.entities.RestaurantOperationalSignal.get(signal_id).catch(() => null);
  if (!sig || sig.restaurant_id !== restaurant_id) throw authError(404, 'not_found');
  const updated = await base44.asServiceRole.entities.RestaurantOperationalSignal.update(signal_id, {
    status: 'resolved', resolved_at: new Date().toISOString(),
  });
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'signal', signal_id, 'resolved', sig, updated, '');
  return { id: updated.id };
}

// ---------------------------------------------------------------------------
// Commercial guardrails
// ---------------------------------------------------------------------------
async function listGuardrails(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'manage_guardrails');
  const list = await base44.asServiceRole.entities.CommercialGuardrail
    .filter({ restaurant_id }, '-created_date', 100).catch(() => []);
  return list || [];
}

async function saveGuardrail(base44, { restaurant_id, data }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_guardrails');
  const fields = {
    restaurant_id,
    branch_id: data.branch_id || null,
    menu_item_id: data.menu_item_id || null,
    normal_price: data.normal_price != null ? Number(data.normal_price) : null,
    minimum_customer_offer_price: data.minimum_customer_offer_price != null ? Number(data.minimum_customer_offer_price) : null,
    minimum_restaurant_net: data.minimum_restaurant_net != null ? Number(data.minimum_restaurant_net) : null,
    allowed_offer_types: data.allowed_offer_types || [],
    allowed_days: data.allowed_days || [],
    allowed_time_ranges: data.allowed_time_ranges || [],
    blocked_peak_hours: data.blocked_peak_hours || [],
    max_quantity: data.max_quantity != null ? Number(data.max_quantity) : null,
    pickup_allowed: data.pickup_allowed !== undefined ? !!data.pickup_allowed : null,
    delivery_allowed: data.delivery_allowed !== undefined ? !!data.delivery_allowed : null,
    requires_manual_approval: !!data.requires_manual_approval,
    active_from: data.active_from || null,
    active_until: data.active_until || null,
    status: data.status || 'draft',
  };
  let rec;
  if (data.id) {
    rec = await base44.asServiceRole.entities.CommercialGuardrail.update(data.id, fields);
    await logAudit(base44, restaurant_id, user.id, user.full_name, 'guardrail', data.id, 'updated', null, fields, '');
  } else {
    rec = await base44.asServiceRole.entities.CommercialGuardrail.create(fields);
    await logAudit(base44, restaurant_id, user.id, user.full_name, 'guardrail', rec.id, 'created', null, fields, '');
  }
  return { id: rec.id };
}

// ---------------------------------------------------------------------------
// Offer requests (restaurant → TAMAM admin)
// ---------------------------------------------------------------------------
async function submitOfferRequest(base44, { restaurant_id, data }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'request_offers');
  if (!data?.goal) throw authError(400, 'goal_required');
  const rec = await base44.asServiceRole.entities.OfferRequest.create({
    restaurant_id,
    branch_id: data.branch_id || null,
    requested_by: user.id,
    goal: data.goal,
    requested_menu_items: data.requested_menu_items || [],
    operational_reason: data.operational_reason || '',
    available_quantity: data.available_quantity != null ? Number(data.available_quantity) : null,
    allowed_days: data.allowed_days || [],
    allowed_time_ranges: data.allowed_time_ranges || [],
    minimum_customer_offer_price: data.minimum_customer_offer_price != null ? Number(data.minimum_customer_offer_price) : null,
    minimum_restaurant_net: data.minimum_restaurant_net != null ? Number(data.minimum_restaurant_net) : null,
    pickup_allowed: data.pickup_allowed !== undefined ? !!data.pickup_allowed : null,
    delivery_allowed: data.delivery_allowed !== undefined ? !!data.delivery_allowed : null,
    restaurant_notes: data.restaurant_notes || '',
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  });
  // Admin notification = audit record (admin reviews audit / offer-request queue).
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'offer_request', rec.id, 'submitted', null, { goal: data.goal }, '');
  return { id: rec.id, status: 'submitted' };
}

async function listOfferRequests(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_offers');
  const list = await base44.asServiceRole.entities.OfferRequest
    .filter({ restaurant_id }, '-created_date', 100).catch(() => []);
  return list || [];
}

// ---------------------------------------------------------------------------
// Performance (real data only)
// ---------------------------------------------------------------------------
async function getPerformance(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_performance');
  const orders = await base44.asServiceRole.entities.RestaurantSubOrder
    .filter({ restaurant_id }, '-created_date', 500).catch(() => []);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const inWeek = (orders || []).filter((o) => new Date(o.created_date) >= weekStart);
  const completed = inWeek.filter((o) => o.status === 'delivered');
  const cancelled = inWeek.filter((o) => o.status === 'cancelled' || o.status === 'rejected');
  const revenue = completed.reduce((sum, o) => sum + Number(o.total || 0), 0);
  return {
    has_data: completed.length > 0,
    week: {
      completed_orders: completed.length,
      cancelled_orders: cancelled.length,
      revenue: Math.round(revenue * 100) / 100,
      fulfillment_reliability: inWeek.length ? Math.round((completed.length / inWeek.length) * 100) : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
async function updateRestaurantSettings(base44, { restaurant_id, data }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_restaurant_settings');
  const allowed = ['phone', 'whatsapp', 'email', 'address', 'city', 'minimum_order', 'delivery_fee',
    'free_delivery_threshold', 'preparation_time_min', 'preparation_time_max', 'delivery_time_min',
    'delivery_time_max', 'current_status'];
  const fields = {};
  for (const k of allowed) if (data[k] !== undefined) fields[k] = data[k];
  if (Object.keys(fields).length === 0) throw authError(400, 'no_fields');
  const updated = await base44.asServiceRole.entities.Restaurant.update(restaurant_id, fields);
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'restaurant', restaurant_id, 'settings_updated', null, fields, '');
  return { id: updated.id };
}

async function toggleAcceptingOrders(base44, { restaurant_id, accepting }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_operational_status');
  const prev = await base44.asServiceRole.entities.Restaurant.get(restaurant_id).catch(() => null);
  const updated = await base44.asServiceRole.entities.Restaurant.update(restaurant_id, { accepts_orders: !!accepting });
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'restaurant', restaurant_id, 'accepting_orders_toggled',
    prev ? { accepts_orders: prev.accepts_orders } : null, { accepts_orders: !!accepting }, '');
  return { id: updated.id, accepts_orders: !!accepting };
}

// Capacity model (Milestone 2) — partner-provided operational capacity.
// Natural Arabic UX maps answers to internal fields; technical names are
// never exposed to the restaurant. If unsure -> null + reduced confidence.
async function getRestaurantCapacity(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_dashboard');
  const r = await base44.asServiceRole.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!r) throw authError(404, 'restaurant_not_found');
  return {
    capacity_normal_additional_per_hour: r.capacity_normal_additional_per_hour ?? null,
    capacity_max_additional_per_hour: r.capacity_max_additional_per_hour ?? null,
    capacity_weak_period_additional: r.capacity_weak_period_additional ?? null,
    capacity_peak_period_additional: r.capacity_peak_period_additional ?? null,
    capacity_pickup: r.capacity_pickup ?? null,
    capacity_delivery: r.capacity_delivery ?? null,
    capacity_confidence: r.capacity_confidence ?? null,
  };
}
async function updateRestaurantCapacity(base44, { restaurant_id, data }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_restaurant_settings');
  const allowed = [
    'capacity_normal_additional_per_hour', 'capacity_max_additional_per_hour',
    'capacity_weak_period_additional', 'capacity_peak_period_additional',
    'capacity_pickup', 'capacity_delivery', 'capacity_confidence',
  ];
  const fields = {};
  for (const k of allowed) if (data[k] !== undefined) fields[k] = data[k];
  if (data.unsure === true) {
    fields.capacity_normal_additional_per_hour = null;
    fields.capacity_confidence = 0.3;
  }
  if (Object.keys(fields).length === 0) throw authError(400, 'no_fields');
  fields.capacity_source = 'restaurant_default';
  const updated = await base44.asServiceRole.entities.Restaurant.update(restaurant_id, fields);
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'restaurant', restaurant_id, 'capacity_updated', null, fields, '');
  return { id: updated.id };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------
function orderSummary(o) {
  const items = parseItems(o.items_json);
  const meta = parseOrderMeta(o.items_json);
  return {
    id: o.id, parent_order_number: o.parent_order_number, status: o.status,
    customer_name: o.customer_name, customer_phone: o.customer_phone,
    fulfillment: meta.fulfillment, offer_title: meta.offer_title, offer_id: meta.offer_id,
    total: o.total, created_date: o.created_date,
    customer_notes: o.customer_notes, preparation_time: o.preparation_time,
    items_count: items.length,
    items_preview: items.slice(0, 6).map((i) => ({
      name: i.name, quantity: i.quantity,
      modifiers: Array.isArray(i.modifiers) ? i.modifiers : (i.modifier_notes ? [i.modifier_notes] : null),
    })),
  };
}

function offerSummary(d) {
  return {
    id: d.id, title: d.title, status: d.status,
    start_at: d.start_at, end_at: d.end_at, hero_image: d.hero_image,
    reference_price: d.reference_price, participants: d.participants,
  };
}

function menuItemSummary(i) {
  return {
    id: i.id, restaurant_sku: i.restaurant_sku,
    name: i.restaurant_product_name || i.name_ar,
    price: i.price, compare_at_price: i.compare_at_price,
    primary_image: i.primary_image, available: i.available, active: i.active,
    sold_out: i.sold_out, mapping_status: i.mapping_status,
    restaurant_category_name: i.restaurant_category_name,
    preparation_time_override: i.preparation_time_override,
    available_quantity: i.available_quantity,
  };
}

function parseItems(json) {
  if (!json) return [];
  try {
    const val = JSON.parse(json);
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
    return [];
  } catch {
    return [];
  }
}

function parseOrderMeta(json) {
  if (!json) return { fulfillment: null, offer_title: null, offer_id: null };
  try {
    const val = JSON.parse(json);
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return {
        fulfillment: val.fulfillment || val.fulfillment_type || null,
        offer_title: val.offer_title || val.deal_title || null,
        offer_id: val.deal_id || val.offer_id || null,
      };
    }
  } catch {}
  return { fulfillment: null, offer_title: null, offer_id: null };
}

async function createImportJob(base44, { restaurant_id, file_url, file_name, file_type }) {
  const { user } = await resolveMembership(base44, restaurant_id, "import_menu");
  const rec = await base44.asServiceRole.entities.MenuImportJob.create({
    restaurant_id, file_url, file_name, file_type: file_type || "csv",
    status: "uploaded", created_by: user.id,
  });
  await logAudit(base44, restaurant_id, user.id, user.full_name, "import", rec.id, "uploaded", null, null, "");
  return { id: rec.id, status: "uploaded" };
}

async function listImportJobs(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, "manage_menu");
  const list = await base44.asServiceRole.entities.MenuImportJob
    .filter({ restaurant_id }, "-created_date", 50).catch(() => []);
  return list || [];
}

// ---------------------------------------------------------------------------
// Offer calendar (daily operational schedule)
// ---------------------------------------------------------------------------
async function listOfferCalendar(base44, { restaurant_id, date }) {
  await resolveMembership(base44, restaurant_id, 'view_offers');
  const offers = await listOffers(base44, { restaurant_id });
  if (!offers || !offers.length) return [];
  const day = date ? new Date(date) : new Date();
  const startOfDay = new Date(day); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(day); endOfDay.setHours(23, 59, 59, 999);
  return offers.filter((o) => {
    if (!o.start_at) return false;
    const s = new Date(o.start_at);
    const e = o.end_at ? new Date(o.end_at) : s;
    return s <= endOfDay && e >= startOfDay;
  }).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
}

// ---------------------------------------------------------------------------
// Monthly offer plan (TAMAM-generated strategy)
// ---------------------------------------------------------------------------
async function listMonthlyPlan(base44, { restaurant_id, year, month }) {
  await resolveMembership(base44, restaurant_id, 'view_offers');
  const y = Number(year); const m = Number(month);
  const plans = await base44.asServiceRole.entities.RestaurantOfferPlan
    .filter({ restaurant_id }, '-created_date', 50).catch(() => []);
  const plan = (plans || []).find((p) => Number(p.year) === y && Number(p.month) === m);
  if (!plan) return { plan: null, weeks: [] };
  const weeks = await base44.asServiceRole.entities.RestaurantOfferPlanWeek
    .filter({ plan_id: plan.id }, 'week_number', 50).catch(() => []);
  return {
    plan: {
      id: plan.id, status: plan.status, strategic_summary: plan.strategic_summary || '',
      linked_offer_ids: plan.linked_offer_ids || [],
    },
    weeks: (weeks || []).map((w) => ({
      id: w.id, week_number: w.week_number, starts_at: w.starts_at, ends_at: w.ends_at,
      strategic_objective: w.strategic_objective, included_days: w.included_days || [],
      operational_notes: w.operational_notes || '', linked_offer_ids: w.linked_offer_ids || [],
      status: w.status,
    })),
  };
}

// ---------------------------------------------------------------------------
// Restaurant profile completion + operational readiness (real data only)
// ---------------------------------------------------------------------------
async function getRestaurantReadiness(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_dashboard');
  const restaurant = await base44.asServiceRole.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!restaurant) throw authError(404, 'restaurant_not_found');
  const menuItems = await base44.asServiceRole.entities.RestaurantMealOffer
    .filter({ restaurant_id }, 'display_order', 500).catch(() => []);
  const guardrails = await base44.asServiceRole.entities.CommercialGuardrail
    .filter({ restaurant_id }, '-created_date', 100).catch(() => []);

  const has = (v) => v != null && String(v).trim() !== '';
  const availableMenu = (menuItems || []).filter((i) => i.available !== false && i.price != null && Number(i.price) > 0);
  const menuWithImage = availableMenu.filter((i) => i.primary_image);
  const activeGuardrails = (guardrails || []).filter((g) => g.status === 'active');
  const hasFulfillmentFlag = activeGuardrails.some((g) => g.pickup_allowed != null || g.delivery_allowed != null);

  const sec = (key, label, ok, detail, action, status) => ({
    key, label, status: status || (ok ? 'complete' : 'incomplete'), detail: detail || '', action: action || null,
  });
  const sections = [
    sec('info', 'بيانات المطعم', has(restaurant.name_ar) && has(restaurant.phone) && has(restaurant.address), has(restaurant.name_ar) ? '' : 'الاسم/الهاتف/العنوان', '/partner/settings'),
    sec('menu', 'المنيو', availableMenu.length > 0, availableMenu.length ? `${availableMenu.length} صنف متوفر` : 'ما في أصناف بأسعار صحيحة', '/partner/menu'),
    sec('images', 'الصور', has(restaurant.logo_url) && menuWithImage.length > 0, has(restaurant.logo_url) ? '' : 'شعار/غلاف + صور الأصناف', '/partner/menu'),
    sec('hours', 'ساعات العمل', null, 'تُدار من TAMAM', null, 'pending_tamam'),
    sec('delivery_areas', 'مناطق التوصيل', null, 'تُدار من TAMAM', null, 'pending_tamam'),
    sec('fulfillment', 'خيارات الاستلام', hasFulfillmentFlag, hasFulfillmentFlag ? '' : 'حدد خيارات الاستلام ضمن الحدود', '/partner/guardrails', hasFulfillmentFlag ? 'complete' : 'needs_review'),
    sec('contact', 'بيانات التواصل', has(restaurant.phone) && has(restaurant.whatsapp), has(restaurant.whatsapp) ? '' : 'واتساب/هاتف', '/partner/settings'),
    sec('guardrails', 'حدود الأسعار', activeGuardrails.length > 0, activeGuardrails.length ? `${activeGuardrails.length} حد فعّال` : 'ضع حدود الأسعار التجارية', '/partner/guardrails'),
    sec('quiet_hours', 'الساعات الهادية', null, 'تُدار من TAMAM', null, 'pending_tamam'),
    sec('peak_hours', 'أوقات الذروة', null, 'تُدار من TAMAM', null, 'pending_tamam'),
    sec('capacity', 'القدرة التشغيلية', restaurant.accepts_orders === true, restaurant.accepts_orders ? 'يستقبل طلبات' : 'استقبال الطلبات متوقف', '/partner/settings'),
    sec('prep_time', 'وقت التحضير', restaurant.preparation_time_min != null, restaurant.preparation_time_min != null ? `${restaurant.preparation_time_min} دقيقة` : 'حدد وقت التحضير', '/partner/settings'),
    sec('settlement', 'بيانات الدفع/التسوية', null, 'تُدار من TAMAM', null, 'pending_tamam'),
  ];

  const applicable = sections.filter((s) => s.status !== 'pending_tamam' && s.status !== 'not_required');
  const complete = applicable.filter((s) => s.status === 'complete').length;
  const completionPercent = applicable.length ? Math.round((complete / applicable.length) * 100) : 0;

  const blockers = [];
  if (restaurant.active === false) blockers.push('المطعم غير مفعّل');
  if (restaurant.accepts_orders === false) blockers.push('استقبال الطلبات متوقف');
  if (availableMenu.length === 0) blockers.push('ما في أصناف متوفرة بأسعار صحيحة');
  if (!has(restaurant.phone)) blockers.push('رقم التواصل ناقص');
  if (activeGuardrails.length === 0) blockers.push('ما في حدود أسعار تجارية فعّالة');

  return {
    completion: { percent: completionPercent, complete, total: applicable.length },
    operational: { ready: blockers.length === 0, blockers },
    sections,
  };
}

// ---------------------------------------------------------------------------
// Guardrail change requests (restaurant proposes, TAMAM approves)
// ---------------------------------------------------------------------------
async function submitGuardrailChange(base44, { restaurant_id, guardrail_id, menu_item_id, section, field, current_value, proposed_value, reason }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_restaurant_settings');
  if (!reason || !reason.trim()) throw authError(400, 'reason_required');
  const rec = await base44.asServiceRole.entities.GuardrailChangeRequest.create({
    restaurant_id, guardrail_id: guardrail_id || null, menu_item_id: menu_item_id || null,
    section, field: field || '', current_value: current_value || '', proposed_value: proposed_value || '',
    reason, requested_by: user.id, status: 'pending_review',
  });
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'guardrail', rec.id, 'change_requested', current_value, proposed_value, reason);
  return { id: rec.id, status: 'pending_review' };
}

async function listGuardrailChanges(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_offers');
  const list = await base44.asServiceRole.entities.GuardrailChangeRequest
    .filter({ restaurant_id }, '-created_date', 50).catch(() => []);
  return (list || []).filter((c) => c.status === 'pending_review');
}

// ---------------------------------------------------------------------------
// Growth Opportunities Engine (real data only — no new entities/fields)
// ---------------------------------------------------------------------------
const DAY_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function custKey(o) { return (o && (o.customer_phone || o.customer_name)) || ''; }
function pad2(n) { return String(n).padStart(2, '0'); }

async function getOpportunities(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_dashboard');
  const restaurant = await base44.asServiceRole.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!restaurant) throw authError(404, 'restaurant_not_found');

  const orders = await base44.asServiceRole.entities.RestaurantSubOrder
    .filter({ restaurant_id }, '-created_date', 500).catch(() => []);
  const all = orders || [];
  const delivered = all.filter((o) => o.status === 'delivered');

  // Kitchen capacity from active signals + current active-orders load
  const signals = await base44.asServiceRole.entities.RestaurantOperationalSignal
    .filter({ restaurant_id, status: 'active' }, '-created_date', 50).catch(() => []);
  const pressure = (signals || []).some((s) => s.type === 'kitchen_pressure' || s.type === 'temporary_pause');
  const activeOrders = all.filter((o) => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)).length;
  const capacityLevel = pressure ? 'high_pressure' : (activeOrders >= 8 ? 'moderate' : 'available');

  const hasEnough = delivered.length >= 8;

  // WEAK_HOUR — hour with orders notably below the active-hour average
  let weakHour = null;
  if (hasEnough) {
    const byHour = {};
    delivered.forEach((o) => { const h = new Date(o.created_date).getHours(); byHour[h] = (byHour[h] || 0) + 1; });
    const hours = Object.keys(byHour).map(Number);
    if (hours.length >= 3) {
      const avg = delivered.length / hours.length;
      let worst = null;
      hours.forEach((h) => { if (byHour[h] < avg && (!worst || byHour[h] < worst.count)) worst = { hour: h, count: byHour[h] }; });
      if (worst) weakHour = { hour: worst.hour, count: worst.count, avg: Math.round(avg * 10) / 10 };
    }
  }

  // WEAK_DAY — day-of-week with orders below the active-day average
  let weakDay = null;
  if (hasEnough) {
    const byDay = {};
    delivered.forEach((o) => { const d = new Date(o.created_date).getDay(); byDay[d] = (byDay[d] || 0) + 1; });
    const days = Object.keys(byDay).map(Number);
    if (days.length >= 3) {
      const avg = delivered.length / days.length;
      let worst = null;
      days.forEach((d) => { if (byDay[d] < avg && (!worst || byDay[d] < worst.count)) worst = { day: d, count: byDay[d] }; });
      if (worst) weakDay = { day: worst.day, count: worst.count, avg: Math.round(avg * 10) / 10 };
    }
  }

  // LOW_SELLING_ITEM — sold item below the menu's average sales
  let lowItem = null;
  const menuItems = await base44.asServiceRole.entities.RestaurantMealOffer
    .filter({ restaurant_id }, 'display_order', 500).catch(() => []);
  const availableMenu = (menuItems || []).filter((i) => i.available !== false && i.active !== false && i.price != null && Number(i.price) > 0);
  if (delivered.length >= 5) {
    const counts = {};
    delivered.forEach((o) => parseItems(o.items_json).forEach((it) => {
      const name = it.name || it.name_ar;
      if (name) counts[name] = (counts[name] || 0) + (Number(it.quantity) || 1);
    }));
    const sold = Object.entries(counts);
    if (sold.length >= 3) {
      const avg = sold.reduce((s, [, c]) => s + c, 0) / sold.length;
      sold.sort((a, b) => a[1] - b[1]);
      const lowest = sold[0];
      if (lowest[1] < avg) {
        const match = availableMenu.find((m) => (m.restaurant_product_name || m.name_ar) === lowest[0])
          || availableMenu.find((m) => ((m.restaurant_product_name || m.name_ar || '')).includes(lowest[0]));
        lowItem = {
          name: lowest[0], count: lowest[1], avg: Math.round(avg * 10) / 10,
          item: match ? { id: match.id, name: match.restaurant_product_name || match.name_ar, price: match.price, available_quantity: match.available_quantity } : null,
        };
      }
    }
  }

  // RETURN_CUSTOMERS — customers who ordered before but not in the last 30 days
  let returnCustomers = null;
  if (delivered.length >= 3) {
    const lastByCust = {};
    delivered.forEach((o) => { const k = custKey(o); if (!k) return; const t = new Date(o.created_date).getTime(); if (!lastByCust[k] || t > lastByCust[k]) lastByCust[k] = t; });
    const now = Date.now();
    const absent = Object.values(lastByCust).filter((t) => (now - t) > 30 * 24 * 3600 * 1000).length;
    if (absent > 0) returnCustomers = { count: absent };
  }

  const newCustomersAvailable = restaurant.active !== false && restaurant.accepts_orders !== false;

  // Merchant-sourced quiet-hours opportunity: when analytics lack enough data,
  // surface a quiet slot the owner marked for today (source = merchant).
  if (!primary) {
    try {
      const prof = await getOrCreateProfile(base44, restaurant_id, null);
      const qSlots = await base44.asServiceRole.entities.DemandSlot
        .filter({ weekly_demand_profile_id: prof.id, demand_level: "quiet" }, "day_of_week", 200).catch(() => []);
      const { day: curDay, minutes: nowMin } = nowInTz(prof.timezone || DEMAND_TZ);
      const pick = (qSlots || [])
        .filter((s) => s.day_of_week === curDay && toMin(s.start_time) != null && toMin(s.start_time) >= nowMin)
        .sort((a, b) => toMin(a.start_time) - toMin(b.start_time))[0];
      if (pick) {
        primary = {
          type: "QUIET_HOURS", type_label: "تقوية وقت هادئ",
          reason: `صاحب المطعم حدد ${DAY_AR[curDay]} من ${pick.start_time} إلى ${pick.end_time} كوقت هادئ.`,
          meal: null, meal_label: "اقترح وجبة لهالوقت",
          window: `${pick.start_time} - ${pick.end_time}`,
          max_orders: null, max_orders_label: "حدّد الكمية اللي يقدر مطبخك",
          audience: "new_customers", audience_label: "زبائن جدد قريبون من المطعم",
          strategy: "limited_time", strategy_label: "وقت محدود — بدون حرق سعر",
          goal: "quiet_hour", source: "merchant",
          prefill: { ...basePrefill, goal: "quiet_hour", allowed_time_ranges: [`${pick.start_time}-${pick.end_time}`], operational_reason: `تقوية وقت هادئ ${DAY_AR[curDay]} ${pick.start_time}` },
        };
      }
    } catch {}
  }

  const heroCards = [
    { key: 'weak_hour', available: !!weakHour, ...(weakHour ? { hour: weakHour.hour, count: weakHour.count, avg: weakHour.avg } : {}) },
    { key: 'weak_day', available: !!weakDay, ...(weakDay ? { day: weakDay.day, day_name: DAY_AR[weakDay.day], count: weakDay.count, avg: weakDay.avg } : {}) },
    { key: 'low_item', available: !!(lowItem && lowItem.item), ...(lowItem && lowItem.item ? { name: lowItem.name, count: lowItem.count, avg: lowItem.avg, item: lowItem.item } : {}) },
    { key: 'new_customers', available: newCustomersAvailable },
  ];

  // Primary opportunity — strongest signal first; suppressed under kitchen pressure
  let primary = null;
  const basePrefill = { pickup_allowed: true, delivery_allowed: true };
  if (capacityLevel !== 'high_pressure') {
    if (weakHour) {
      const h = weakHour.hour; const end = (h + 2) % 24;
      primary = {
        type: 'WEAK_HOUR', type_label: 'تقوية ساعة هادئة',
        reason: `الطلبات بين ${pad2(h)}:00 و${pad2(h)}:59 أقل من متوسط اليوم (${weakHour.count} طلب مقابل متوسط ${weakHour.avg}).`,
        meal: null, meal_label: 'اقترح وجبة تناسب الساعة الهادئة',
        window: `${pad2(h)}:00 - ${pad2(end)}:00`,
        max_orders: null, max_orders_label: 'حدّد الكمية اللي يقدر مطبخك',
        audience: 'new_customers', audience_label: 'زبائن جدد قريبون من المطعم',
        strategy: 'limited_time', strategy_label: 'وقت محدود — بدون حرق سعر',
        goal: 'quiet_hour',
        prefill: { ...basePrefill, goal: 'quiet_hour', allowed_time_ranges: [`${pad2(h)}:00-${pad2(end)}:00`], operational_reason: `تحريك ساعة هادئة ${pad2(h)}:00` },
      };
    } else if (lowItem && lowItem.item) {
      const maxQ = (lowItem.item.available_quantity && lowItem.item.available_quantity > 0) ? Math.min(20, lowItem.item.available_quantity) : null;
      primary = {
        type: 'LOW_SELLING_ITEM', type_label: 'تحريك وجبة ضعيفة',
        reason: `وجبة "${lowItem.name}" مبيعاتها أقل من متوسط المنيو (${lowItem.count} طلب مقابل متوسط ${lowItem.avg}).`,
        meal: { id: lowItem.item.id, name: lowItem.item.name, price: lowItem.item.price },
        meal_label: lowItem.item.name,
        window: null,
        max_orders: maxQ, max_orders_label: maxQ ? `${maxQ} طلب` : 'حدّد الكمية',
        audience: 'all', audience_label: 'كل الزبائن',
        strategy: 'highlight_item', strategy_label: 'إبراز الوجبة — بدون حرق سعر',
        goal: 'strengthen_item',
        prefill: { ...basePrefill, goal: 'strengthen_item', requested_menu_items: [lowItem.item.id], available_quantity: maxQ || undefined, operational_reason: `تحريك وجبة ضعيفة: ${lowItem.name}` },
      };
    } else if (weakDay) {
      primary = {
        type: 'WEAK_DAY', type_label: 'تقوية يوم ضعيف',
        reason: `يوم ${DAY_AR[weakDay.day]} طلباته أقل من متوسط الأسبوع (${weakDay.count} طلب مقابل متوسط ${weakDay.avg}).`,
        meal: null, meal_label: 'اقترح وجبة لهاليوم',
        window: null,
        max_orders: null, max_orders_label: 'حدّد الكمية',
        audience: 'new_customers', audience_label: 'زبائن جدد',
        strategy: 'limited_time', strategy_label: 'وقت محدود لهاليوم',
        goal: 'quiet_hour',
        prefill: { ...basePrefill, goal: 'quiet_hour', allowed_days: [weakDay.day], operational_reason: `تقوية يوم ${DAY_AR[weakDay.day]}` },
      };
    } else if (returnCustomers) {
      primary = {
        type: 'RETURN_CUSTOMERS', type_label: 'استرجاع زبائن غائبين',
        reason: `عندك ${returnCustomers.count} زبون طلب منك قبل بس ما طلب من فوق 30 يوم.`,
        meal: null, meal_label: 'اقترح وجبة ترحيبية',
        window: null,
        max_orders: null, max_orders_label: 'حدّد الكمية',
        audience: 'returning', audience_label: 'زبائن عائدون غابوا',
        strategy: 'winback', strategy_label: 'استرجاع زبون قديم',
        goal: 'reactivate',
        prefill: { ...basePrefill, goal: 'reactivate', operational_reason: 'استرجاع زبائن غائبين' },
      };
    } else if (newCustomersAvailable) {
      primary = {
        type: 'NEW_CUSTOMERS', type_label: 'جلب زبائن جدد',
        reason: 'عندك فرصة للوصول إلى زبائن جدد قريبين من المطعم ما طلبوا منك قبل.',
        meal: null, meal_label: 'اقترح وجبة جذابة للجديد',
        window: null,
        max_orders: null, max_orders_label: 'حدّد الكمية',
        audience: 'new_customers', audience_label: 'زبائن جدد',
        strategy: 'new_only', strategy_label: 'عرض للزبون الجديد فقط',
        goal: 'attract_new',
        prefill: { ...basePrefill, goal: 'attract_new', operational_reason: 'جلب زبائن جدد' },
      };
    }
  }

  return {
    has_data: hasEnough,
    kitchen_capacity: { level: capacityLevel, active_orders: activeOrders, pressure },
    hero_cards: heroCards,
    return_customers: returnCustomers,
    primary,
    restaurant: { id: restaurant.id, name_ar: restaurant.name_ar, name: restaurant.name, accepts_orders: restaurant.accepts_orders, active: restaurant.active },
  };
}

async function getCampaignResults(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_performance');
  const orders = await base44.asServiceRole.entities.RestaurantSubOrder
    .filter({ restaurant_id }, '-created_date', 500).catch(() => []);
  const all = orders || [];
  const delivered = all.filter((o) => o.status === 'delivered');

  // Campaign orders = orders whose items meta references a deal/offer id
  const campaignDelivered = delivered.filter((o) => !!(parseOrderMeta(o.items_json).offer_id));

  // Deals for this restaurant
  const dealItems = await base44.asServiceRole.entities.GroupDealItem
    .filter({ restaurant_id }, 'sort_order', 200).catch(() => []);
  const dealIds = [...new Set((dealItems || []).map((i) => i.deal_id).filter(Boolean))];
  let deals = [];
  if (dealIds.length) {
    const allDeals = await base44.asServiceRole.entities.GroupDeal.list('-updated_date', 200).catch(() => []);
    deals = (allDeals || []).filter((d) => dealIds.includes(d.id));
  }
  const completedCampaigns = deals.filter((d) => d.status === 'completed' || d.final_status === 'success').length;
  const stoppedByLimit = deals.filter((d) => d.stop_when_inventory_exhausted === true && ['ended', 'completed'].includes(d.status)).length;

  // New customers via campaign (first-time customer on a campaign order)
  const chrono = delivered.slice().sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const seen = new Set();
  let newViaCampaign = 0;
  chrono.forEach((o) => {
    const k = custKey(o);
    const isNew = k && !seen.has(k);
    if (k) seen.add(k);
    if (isNew && parseOrderMeta(o.items_json).offer_id) newViaCampaign++;
  });

  const totalRevenue = delivered.reduce((s, o) => s + Number(o.total || 0), 0);
  const campaignRevenue = campaignDelivered.reduce((s, o) => s + Number(o.total || 0), 0);
  const aov = delivered.length ? totalRevenue / delivered.length : 0;

  const custCounts = {};
  delivered.forEach((o) => { const k = custKey(o); if (k) custCounts[k] = (custCounts[k] || 0) + 1; });
  const uniqueCustomers = Object.keys(custCounts).length;
  const returning = Object.values(custCounts).filter((c) => c >= 2).length;
  const returnRate = uniqueCustomers ? Math.round((returning / uniqueCustomers) * 100) : null;

  return {
    has_data: delivered.length > 0,
    total: {
      orders: delivered.length,
      revenue: Math.round(totalRevenue * 100) / 100,
      unique_customers: uniqueCustomers,
      aov: Math.round(aov * 100) / 100,
      return_rate: returnRate,
    },
    tamam: {
      completed_campaigns: completedCampaigns,
      stopped_by_limit: stoppedByLimit,
      campaign_orders: campaignDelivered.length,
      campaign_revenue: Math.round(campaignRevenue * 100) / 100,
      new_customers_via_campaign: newViaCampaign,
    },
  };
}

// ---------------------------------------------------------------------------
// Weekly Demand Profile (merchant-entered quiet/medium/busy pattern)
// ---------------------------------------------------------------------------
const DEMAND_TZ = "Asia/Jerusalem";
const DEMAND_OP = { open: "10:00", close: "22:00" };

function toMin(t) {
  if (!t || typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
function nowInTz(tz) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz || DEMAND_TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value;
  const hr = parts.find((p) => p.type === "hour")?.value;
  const min = parts.find((p) => p.type === "minute")?.value;
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: map[wd] ?? now.getDay(), minutes: (Number(hr) || 0) * 60 + (Number(min) || 0) };
}
function parseOperatingHours(profile) {
  try {
    const v = JSON.parse(profile.operating_hours_json || "null");
    if (Array.isArray(v) && v.length === 7) return v;
  } catch {}
  return Array.from({ length: 7 }, (_, d) => ({ day: d, open: DEMAND_OP.open, close: DEMAND_OP.close }));
}
function actorType(user, membership) {
  if (user.role === "admin") return "tamam_admin";
  return membership?.partner_role === "owner" ? "merchant" : "restaurant_manager";
}
async function demandAudit(base44, restaurant_id, branch_id, user, membership, action, prev, next, reason) {
  try {
    await base44.asServiceRole.entities.DemandProfileAuditEvent.create({
      restaurant_id, branch_id: branch_id || null, actor_user_id: user.id,
      actor_type: actorType(user, membership), action,
      previous_value: prev != null ? (typeof prev === "string" ? prev : JSON.stringify(prev)) : "",
      new_value: next != null ? (typeof next === "string" ? next : JSON.stringify(next)) : "",
      reason: reason || "",
    });
  } catch {}
}
async function getOrCreateProfile(base44, restaurant_id, branch_id) {
  const branch = branch_id || "";
  const list = await base44.asServiceRole.entities.WeeklyDemandProfile
    .filter({ restaurant_id }, "-updated_date", 50).catch(() => []);
  let profile = (list || []).find((p) => (p.branch_id || "") === branch);
  if (!profile) {
    profile = await base44.asServiceRole.entities.WeeklyDemandProfile.create({
      restaurant_id, branch_id: branch || null, timezone: DEMAND_TZ,
      slot_duration_minutes: 60, profile_status: "incomplete", default_source: "merchant",
      operating_hours_json: JSON.stringify(Array.from({ length: 7 }, (_, d) => ({ day: d, open: DEMAND_OP.open, close: DEMAND_OP.close }))),
      last_updated_by_user_id: "", last_updated_at: new Date().toISOString(),
    });
  }
  return profile;
}
async function loadProfileData(base44, restaurant_id, branch_id) {
  const profile = await getOrCreateProfile(base44, restaurant_id, branch_id);
  const slots = await base44.asServiceRole.entities.DemandSlot
    .filter({ weekly_demand_profile_id: profile.id }, "day_of_week", 500).catch(() => []);
  const dayProfiles = await base44.asServiceRole.entities.DemandDayProfile
    .filter({ weekly_demand_profile_id: profile.id }, "day_of_week", 50).catch(() => []);
  const overrides = await base44.asServiceRole.entities.DemandTemporaryOverride
    .filter({ restaurant_id, active: true }, "-created_date", 20).catch(() => []);
  const now = new Date();
  const active = (overrides || []).filter((o) => (!o.branch_id || o.branch_id === (branch_id || "")) && (!o.end_at || new Date(o.end_at) > now));
  return { profile, slots: slots || [], dayProfiles: dayProfiles || [], overrides: active };
}
function computeNextQuiet(byDay, ops, tz) {
  const { day: curDay, minutes: nowMin } = nowInTz(tz);
  for (let i = 0; i < 7; i++) {
    const d = (curDay + i) % 7;
    const opStart = toMin(ops[d].open) ?? 0;
    const opEnd = toMin(ops[d].close) ?? 1440;
    const quiet = byDay[d].filter((s) => s.demand_level === "quiet" && toMin(s.start_time) != null)
      .sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
    for (const s of quiet) {
      const sMin = toMin(s.start_time);
      if (i === 0 && sMin < nowMin) continue;
      if (sMin < opStart || sMin >= opEnd) continue;
      return { day_name: DAY_AR[d], start: s.start_time, end: s.end_time, when_label: i === 0 ? "اليوم" : i === 1 ? "بكرا" : DAY_AR[d] };
    }
  }
  return null;
}
function computeSummary(profile, slots, dayProfiles) {
  const tz = profile.timezone || DEMAND_TZ;
  const ops = parseOperatingHours(profile);
  const byDay = Array.from({ length: 7 }, () => []);
  (slots || []).forEach((s) => { if (s.day_of_week >= 0 && s.day_of_week <= 6) byDay[s.day_of_week].push(s); });
  const week = byDay.map((daySlots, d) => {
    const counts = { quiet: 0, medium: 0, busy: 0, unknown: 0 };
    daySlots.forEach((s) => { counts[s.demand_level] = (counts[s.demand_level] || 0) + 1; });
    const dp = (dayProfiles || []).find((x) => x.day_of_week === d);
    const level = dp?.effective_demand_level
      || (counts.quiet > counts.busy && counts.quiet > counts.medium ? "quiet"
        : counts.busy > counts.medium ? "busy" : counts.medium > 0 ? "medium" : "unknown");
    return {
      day: d, day_name: DAY_AR[d], counts, level,
      source: dp?.source || "merchant",
      classified: daySlots.filter((s) => s.demand_level !== "unknown").length,
      total: daySlots.length,
    };
  });
  const totalSlots = week.reduce((s, w) => s + w.total, 0);
  const classified = week.reduce((s, w) => s + w.classified, 0);
  const completion = totalSlots ? Math.round((classified / totalSlots) * 100) : 0;
  const profile_status = classified === 0 ? "incomplete" : completion >= 90 ? "complete" : "partial";
  const quiet_hours_this_week = week.reduce((s, w) => s + w.counts.quiet, 0);
  let weakest = null;
  week.forEach((w) => { if (w.counts.quiet > 0 && (!weakest || w.counts.quiet > weakest.counts.quiet)) weakest = w; });
  return {
    profile_status, completion, classified_slots: classified, total_slots: totalSlots,
    quiet_hours_this_week, weakest_day_name: weakest ? weakest.day_name : null,
    next_quiet: computeNextQuiet(byDay, ops, tz),
    week, last_updated: profile.last_updated_at,
  };
}
async function recomputeDayProfile(base44, profile_id, restaurant_id, branch_id, day) {
  const slots = await base44.asServiceRole.entities.DemandSlot
    .filter({ weekly_demand_profile_id: profile_id, day_of_week: day }, "start_time", 100).catch(() => []);
  const counts = { quiet: 0, medium: 0, busy: 0 };
  (slots || []).forEach((s) => { if (counts[s.demand_level] != null) counts[s.demand_level]++; });
  let suggested = "unknown";
  if (counts.quiet || counts.medium || counts.busy) {
    if (counts.quiet >= counts.medium && counts.quiet >= counts.busy) suggested = "quiet";
    else if (counts.busy >= counts.medium) suggested = "busy";
    else suggested = "medium";
  }
  const existing = await base44.asServiceRole.entities.DemandDayProfile
    .filter({ weekly_demand_profile_id: profile_id, day_of_week: day }, "day_of_week", 5).catch(() => []);
  const dp = (existing || [])[0];
  const manual = dp?.manual_demand_level || null;
  const fields = {
    weekly_demand_profile_id: profile_id, restaurant_id, branch_id: branch_id || null, day_of_week: day,
    suggested_demand_level: suggested,
    effective_demand_level: manual || suggested,
    source: dp?.source || "merchant",
    explanation: manual ? "حددته أنت" : suggested !== "unknown" ? "اقتراح تمام بناءً على الساعات" : "",
  };
  if (dp) await base44.asServiceRole.entities.DemandDayProfile.update(dp.id, fields);
  else await base44.asServiceRole.entities.DemandDayProfile.create(fields);
}
async function getDemandProfile(base44, { restaurant_id, branch_id }) {
  await resolveMembership(base44, restaurant_id, "view_dashboard");
  const data = await loadProfileData(base44, restaurant_id, branch_id);
  return {
    profile: {
      id: data.profile.id, timezone: data.profile.timezone || DEMAND_TZ,
      profile_status: data.profile.profile_status, operating_hours: parseOperatingHours(data.profile),
      last_updated: data.profile.last_updated_at, branch_id: branch_id || null,
    },
    slots: data.slots.map((s) => ({
      id: s.id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time,
      demand_level: s.demand_level, source: s.source, note: s.note || "",
    })),
    day_profiles: data.dayProfiles.map((d) => ({
      day_of_week: d.day_of_week, manual_demand_level: d.manual_demand_level,
      suggested_demand_level: d.suggested_demand_level, effective_demand_level: d.effective_demand_level,
      source: d.source, explanation: d.explanation || "",
    })),
    overrides: data.overrides.map((o) => ({
      id: o.id, demand_level: o.demand_level, start_at: o.start_at, end_at: o.end_at,
      operational_effect: o.operational_effect, source: o.source,
    })),
    summary: computeSummary(data.profile, data.slots, data.dayProfiles),
  };
}
async function getDemandSummary(base44, { restaurant_id, branch_id }) {
  await resolveMembership(base44, restaurant_id, "view_dashboard");
  const data = await loadProfileData(base44, restaurant_id, branch_id);
  const summary = computeSummary(data.profile, data.slots, data.dayProfiles);
  return { ...summary, has_data: summary.classified_slots > 0, overrides_count: data.overrides.length, branch_id: branch_id || null };
}
async function saveDemandSlots(base44, { restaurant_id, branch_id, day_of_week, slots, source }) {
  const { user, membership } = await resolveMembership(base44, restaurant_id, "manage_demand_schedule");
  if (Number(day_of_week) < 0 || Number(day_of_week) > 6) throw authError(400, "invalid_day");
  const profile = await getOrCreateProfile(base44, restaurant_id, branch_id);
  const existing = await base44.asServiceRole.entities.DemandSlot
    .filter({ weekly_demand_profile_id: profile.id, day_of_week }, "start_time", 200).catch(() => []);
  for (const s of existing || []) await base44.asServiceRole.entities.DemandSlot.delete(s.id).catch(() => {});
  const src = source || (membership?.partner_role === "owner" ? "merchant" : "restaurant_manager");
  for (const s of (slots || [])) {
    if (!s.start_time || !s.end_time) continue;
    await base44.asServiceRole.entities.DemandSlot.create({
      weekly_demand_profile_id: profile.id, restaurant_id, branch_id: branch_id || null,
      day_of_week, start_time: s.start_time, end_time: s.end_time,
      demand_level: s.demand_level || "unknown", source: src, is_recurring: true,
    });
  }
  await recomputeDayProfile(base44, profile.id, restaurant_id, branch_id, day_of_week);
  await base44.asServiceRole.entities.WeeklyDemandProfile.update(profile.id, {
    last_updated_by_user_id: user.id, last_updated_at: new Date().toISOString(), profile_status: "partial",
  });
  await demandAudit(base44, restaurant_id, branch_id, user, membership, "slots_saved", null, { day_of_week, count: (slots || []).length }, "");
  const data = await loadProfileData(base44, restaurant_id, branch_id);
  return {
    summary: computeSummary(data.profile, data.slots, data.dayProfiles),
    slots: data.slots.filter((s) => s.day_of_week === day_of_week).map((s) => ({
      id: s.id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time, demand_level: s.demand_level, source: s.source,
    })),
  };
}
async function setDemandDayLevel(base44, { restaurant_id, branch_id, day_of_week, level }) {
  const { user, membership } = await resolveMembership(base44, restaurant_id, "manage_demand_schedule");
  const profile = await getOrCreateProfile(base44, restaurant_id, branch_id);
  const existing = await base44.asServiceRole.entities.DemandDayProfile
    .filter({ weekly_demand_profile_id: profile.id, day_of_week }, "day_of_week", 5).catch(() => []);
  const dp = (existing || [])[0];
  const prev = dp ? { manual: dp.manual_demand_level, effective: dp.effective_demand_level } : null;
  const fields = {
    weekly_demand_profile_id: profile.id, restaurant_id, branch_id: branch_id || null, day_of_week,
    manual_demand_level: level, effective_demand_level: level, source: "merchant", explanation: "حددته أنت",
  };
  if (dp) await base44.asServiceRole.entities.DemandDayProfile.update(dp.id, fields);
  else await base44.asServiceRole.entities.DemandDayProfile.create(fields);
  await base44.asServiceRole.entities.WeeklyDemandProfile.update(profile.id, { last_updated_by_user_id: user.id, last_updated_at: new Date().toISOString() });
  await demandAudit(base44, restaurant_id, branch_id, user, membership, "day_level_set", prev, { level }, "حددته أنت");
  return { ok: true };
}
async function acceptDaySuggestion(base44, { restaurant_id, branch_id, day_of_week }) {
  const { user, membership } = await resolveMembership(base44, restaurant_id, "manage_demand_schedule");
  const profile = await getOrCreateProfile(base44, restaurant_id, branch_id);
  const existing = await base44.asServiceRole.entities.DemandDayProfile
    .filter({ weekly_demand_profile_id: profile.id, day_of_week }, "day_of_week", 5).catch(() => []);
  const dp = (existing || [])[0];
  if (!dp || !dp.suggested_demand_level || dp.suggested_demand_level === "unknown") throw authError(400, "no_suggestion");
  const prev = { effective: dp.effective_demand_level };
  await base44.asServiceRole.entities.DemandDayProfile.update(dp.id, {
    manual_demand_level: null, effective_demand_level: dp.suggested_demand_level, source: "analytics_suggestion", explanation: "اعتمدت اقتراح تمام بناءً على الساعات",
  });
  await demandAudit(base44, restaurant_id, branch_id, user, membership, "suggestion_accepted", prev, { level: dp.suggested_demand_level }, "اعتمد اقتراح تمام");
  return { ok: true };
}
async function copyDemandDay(base44, { restaurant_id, branch_id, from_day, to_days }) {
  const { user, membership } = await resolveMembership(base44, restaurant_id, "manage_demand_schedule");
  if (!Array.isArray(to_days) || !to_days.length) throw authError(400, "no_target_days");
  const profile = await getOrCreateProfile(base44, restaurant_id, branch_id);
  const srcSlots = await base44.asServiceRole.entities.DemandSlot
    .filter({ weekly_demand_profile_id: profile.id, day_of_week: from_day }, "start_time", 100).catch(() => []);
  for (const d of to_days) {
    const existing = await base44.asServiceRole.entities.DemandSlot
      .filter({ weekly_demand_profile_id: profile.id, day_of_week: d }, "start_time", 200).catch(() => []);
    for (const s of existing || []) await base44.asServiceRole.entities.DemandSlot.delete(s.id).catch(() => {});
    for (const s of srcSlots || []) {
      await base44.asServiceRole.entities.DemandSlot.create({
        weekly_demand_profile_id: profile.id, restaurant_id, branch_id: branch_id || null,
        day_of_week: d, start_time: s.start_time, end_time: s.end_time,
        demand_level: s.demand_level, source: s.source || "merchant", is_recurring: true,
      });
    }
    await recomputeDayProfile(base44, profile.id, restaurant_id, branch_id, d);
  }
  await base44.asServiceRole.entities.WeeklyDemandProfile.update(profile.id, { last_updated_by_user_id: user.id, last_updated_at: new Date().toISOString() });
  await demandAudit(base44, restaurant_id, branch_id, user, membership, "day_copied", { from_day }, { to_days }, "");
  return { copied_to: to_days, count: (srcSlots || []).length };
}
async function saveDemandOverride(base44, { restaurant_id, branch_id, demand_level, duration_minutes, scope }) {
  const { user, membership } = await resolveMembership(base44, restaurant_id, "manage_operational_status");
  if (!demand_level) throw authError(400, "level_required");
  const start = new Date();
  const end = new Date(start.getTime() + (Number(duration_minutes) || 60) * 60000);
  const rec = await base44.asServiceRole.entities.DemandTemporaryOverride.create({
    restaurant_id, branch_id: branch_id || null, start_at: start.toISOString(), end_at: end.toISOString(),
    demand_level, operational_effect: scope || "information_only", source: "merchant", created_by_user_id: user.id, active: true,
  });
  await demandAudit(base44, restaurant_id, branch_id, user, membership, "override_created", null, { demand_level, duration_minutes }, "تحديث سريع من الرئيسية");
  return { id: rec.id };
}
async function listDemandOverrides(base44, { restaurant_id, branch_id }) {
  await resolveMembership(base44, restaurant_id, "view_dashboard");
  const data = await loadProfileData(base44, restaurant_id, branch_id);
  return data.overrides.map((o) => ({
    id: o.id, demand_level: o.demand_level, start_at: o.start_at, end_at: o.end_at, operational_effect: o.operational_effect, source: o.source,
  }));
}
async function requestDemandOpportunity(base44, { restaurant_id, branch_id, day_of_week, start_time, end_time }) {
  const { user } = await resolveMembership(base44, restaurant_id, "request_offers");
  const reason = `صاحب المطعم حدد ${DAY_AR[day_of_week]} من ${start_time} إلى ${end_time} كوقت هادئ.`;
  const rec = await base44.asServiceRole.entities.OfferRequest.create({
    restaurant_id, branch_id: branch_id || null, requested_by: user.id, goal: "quiet_hour",
    allowed_days: [day_of_week], allowed_time_ranges: [`${start_time}-${end_time}`],
    operational_reason: reason, restaurant_notes: "طلب اقتراح لوقت هادئ (من جدول الحركة)",
    status: "submitted", submitted_at: new Date().toISOString(),
  });
  await logAudit(base44, restaurant_id, user.id, user.full_name, "offer_request", rec.id, "demand_opportunity_requested", null, reason, "");
  return { id: rec.id, status: "submitted" };
}

// ---------------------------------------------------------------------------
// Phase 2 — Menu build (catalog/template → draft candidates → publish)
// Drafts live in MenuImportCandidate; published items become RestaurantMealOffer.
// RestaurantMealOffer is never duplicated; TAMAM Master Catalog stays in Supabase.
// ---------------------------------------------------------------------------
function normalizeMenuName(s) {
  return String(s || '').replace(/[\u064B-\u0652\u0670ًٌٍَُِّْـ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
function tokenOverlap(a, b) {
  const ta = new Set(a.split(' ').filter(Boolean)), tb = new Set(b.split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let c = 0; ta.forEach((t) => { if (tb.has(t)) c++; });
  return c / Math.max(ta.size, tb.size);
}
function parseUserChanges(s) { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } }
async function detectDuplicate(base44, restaurant_id, normalized, mappedId) {
  const items = await base44.asServiceRole.entities.RestaurantMealOffer.filter({ restaurant_id }, 'display_order', 500).catch(() => []);
  for (const it of items || []) {
    if (mappedId && (it.mapped_tamam_product_id === mappedId || it.meal_id === mappedId)) return { id: it.id, status: 'exact', name: it.restaurant_product_name || it.name_ar };
  }
  for (const it of items || []) {
    if (normalizeMenuName(it.restaurant_product_name || it.name_ar || '') === normalized) return { id: it.id, status: 'exact', name: it.restaurant_product_name || it.name_ar };
  }
  let best = null;
  for (const it of items || []) {
    const ov = tokenOverlap(normalized, normalizeMenuName(it.restaurant_product_name || it.name_ar || ''));
    if (ov > 0.6 && (!best || ov > best.ov)) best = { id: it.id, ov, name: it.restaurant_product_name || it.name_ar };
  }
  if (best) return { id: best.id, status: 'likely', name: best.name };
  return null;
}
function candidateMissing(c, u) {
  const m = [];
  const name = u.name || c.detected_name;
  const price = u.price != null ? u.price : c.detected_price;
  const img = u.image || c.detected_image;
  if (!name) m.push('name');
  if (price == null || Number(price) <= 0) m.push('price');
  if (!img) m.push('image');
  if (!u.category && !c.detected_category) m.push('category');
  return m;
}
function candidateSummary(c) {
  return {
    id: c.id, session_id: c.menu_import_session_id, restaurant_id: c.restaurant_id, branch_id: c.branch_id,
    detected_name: c.detected_name, normalized_name: c.normalized_name, detected_category: c.detected_category,
    detected_image: c.detected_image, detected_price: c.detected_price,
    mapped_master_catalog_product_id: c.mapped_master_catalog_product_id, mapping_confidence: c.mapping_confidence,
    duplicate_status: c.duplicate_status, duplicate_restaurant_menu_item_id: c.duplicate_restaurant_menu_item_id,
    rights_status: c.rights_status, review_status: c.review_status, image_source_type: c.image_source_type,
    usage_permission_status: c.usage_permission_status, missing_fields: c.missing_fields || [],
    user_changes: parseUserChanges(c.user_changes),
  };
}
async function createMenuSession(base44, { restaurant_id, branch_id, source_type, source_template_id, source_branch_id }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_menu');
  const rec = await base44.asServiceRole.entities.MenuImportSession.create({
    restaurant_id, branch_id: branch_id || null, created_by_user_id: user.id,
    source_type: source_type || 'tamam_master_catalog', source_template_id: source_template_id || null,
    source_branch_id: source_branch_id || null, status: 'selecting',
  });
  return { id: rec.id };
}
async function saveMenuCandidates(base44, { restaurant_id, branch_id, session_id, source_type, items }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_menu');
  if (!session_id) {
    const s = await base44.asServiceRole.entities.MenuImportSession.create({
      restaurant_id, branch_id: branch_id || null, created_by_user_id: user.id,
      source_type: source_type || 'tamam_master_catalog', status: 'needs_review',
    });
    session_id = s.id;
  }
  const created = [];
  for (const it of items || []) {
    const genericName = it.generic_name || it.detected_name || '';
    const norm = normalizeMenuName(genericName);
    const dup = await detectDuplicate(base44, restaurant_id, norm, it.mapped_master_catalog_product_id || null);
    const uc = {
      name: it.name || genericName, price: it.price != null ? Number(it.price) : null,
      description: it.description || '', image: it.image || '', available: it.available !== false,
      prep_time: it.prep_time != null ? Number(it.prep_time) : null, category: it.category || '',
      campaign_permission: it.campaign_permission !== false,
      max_daily_quantity: it.max_daily_quantity != null ? Number(it.max_daily_quantity) : null,
    };
    const c = {
      menu_import_session_id: session_id, restaurant_id, branch_id: branch_id || null,
      source_reference: String(it.source_reference || 'catalog'),
      detected_name: genericName, normalized_name: norm,
      detected_description: it.generic_description || '', detected_price: it.price != null ? Number(it.price) : null,
      detected_category: it.generic_category || it.category || '', detected_image: it.generic_image || '',
      mapped_master_catalog_product_id: it.mapped_master_catalog_product_id || null,
      mapping_confidence: it.mapped_master_catalog_product_id ? 100 : null,
      duplicate_restaurant_menu_item_id: dup ? dup.id : null, duplicate_status: dup ? dup.status : 'none',
      rights_status: it.rights_status || 'approved', review_status: 'needs_review',
      user_changes: JSON.stringify(uc),
      image_source_type: it.image_source_type || 'tamam_owned', image_source_reference: it.image_source_reference || '',
      usage_permission_status: (it.image_source_type || 'tamam_owned') === 'tamam_owned' ? 'approved' : 'unknown',
    };
    c.missing_fields = candidateMissing(c, uc);
    if (!c.missing_fields.length && c.duplicate_status === 'none') c.review_status = 'ready';
    const rec = await base44.asServiceRole.entities.MenuImportCandidate.create(c);
    created.push(rec.id);
  }
  const all = await base44.asServiceRole.entities.MenuImportCandidate.filter({ menu_import_session_id: session_id }, '-created_date', 500).catch(() => []);
  const ready = (all || []).filter((c) => c.review_status === 'ready').length;
  const dup = (all || []).filter((c) => c.duplicate_status !== 'none').length;
  await base44.asServiceRole.entities.MenuImportSession.update(session_id, { status: 'needs_review', total_items: (all || []).length, ready_items: ready, duplicate_items: dup });
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'import', session_id, 'menu_candidates_saved', null, { count: created.length }, '');
  return { session_id, candidate_ids: created };
}
async function listMenuCandidates(base44, { restaurant_id, branch_id, tab }) {
  await resolveMembership(base44, restaurant_id, 'manage_menu');
  const list = await base44.asServiceRole.entities.MenuImportCandidate.filter({ restaurant_id }, '-created_date', 300).catch(() => []);
  let res = list || [];
  if (tab === 'needs_review') res = res.filter((c) => c.review_status === 'needs_review');
  else if (tab === 'ready') res = res.filter((c) => c.review_status === 'ready');
  else if (tab === 'imported') res = res.filter((c) => c.review_status === 'imported');
  else if (tab === 'issues') res = res.filter((c) => c.review_status === 'failed' || c.duplicate_status === 'unresolved' || c.usage_permission_status === 'pending' || c.usage_permission_status === 'unknown');
  return res.map(candidateSummary);
}
async function updateMenuCandidate(base44, { restaurant_id, candidate_id, changes }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_menu');
  const ex = await base44.asServiceRole.entities.MenuImportCandidate.get(candidate_id).catch(() => null);
  if (!ex || ex.restaurant_id !== restaurant_id) throw authError(404, 'not_found');
  const next = { ...parseUserChanges(ex.user_changes), ...(changes || {}) };
  const fields = { user_changes: JSON.stringify(next) };
  const composite = { ...ex, detected_name: next.name || ex.detected_name, detected_price: next.price != null ? next.price : ex.detected_price, detected_image: next.image || ex.detected_image, detected_category: next.category || ex.detected_category };
  const miss = candidateMissing(composite, next);
  fields.missing_fields = miss;
  fields.review_status = (!miss.length && ex.duplicate_status !== 'unresolved' && ex.usage_permission_status !== 'pending') ? 'ready' : 'needs_review';
  if (changes.review_status) fields.review_status = changes.review_status;
  if (changes.rights_status) fields.rights_status = changes.rights_status;
  await base44.asServiceRole.entities.MenuImportCandidate.update(candidate_id, fields);
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'import', candidate_id, 'candidate_updated', null, fields, '');
  return { id: candidate_id, review_status: fields.review_status, missing_fields: miss };
}
async function resolveDuplicate(base44, { restaurant_id, candidate_id, decision }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_menu');
  const ex = await base44.asServiceRole.entities.MenuImportCandidate.get(candidate_id).catch(() => null);
  if (!ex || ex.restaurant_id !== restaurant_id) throw authError(404, 'not_found');
  const u = parseUserChanges(ex.user_changes); u.duplicate_decision = decision;
  let status = 'needs_review';
  let dupStatus = ex.duplicate_status;
  if (decision === 'update' || decision === 'new') { if (!candidateMissing(ex, u).length) status = 'ready'; }
  else if (decision === 'later') { status = 'needs_review'; dupStatus = 'unresolved'; }
  await base44.asServiceRole.entities.MenuImportCandidate.update(candidate_id, { user_changes: JSON.stringify(u), review_status: status, duplicate_status: dupStatus });
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'import', candidate_id, 'duplicate_resolved', ex.duplicate_status, decision, '');
  return { ok: true };
}
async function publishMenuCandidates(base44, { restaurant_id, candidate_ids }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_menu');
  if (!Array.isArray(candidate_ids) || !candidate_ids.length) throw authError(400, 'no_candidates');
  const created = []; const skipped = [];
  for (const cid of candidate_ids) {
    const c = await base44.asServiceRole.entities.MenuImportCandidate.get(cid).catch(() => null);
    if (!c || c.restaurant_id !== restaurant_id || c.review_status !== 'ready') { skipped.push(cid); continue; }
    const u = parseUserChanges(c.user_changes);
    const name = u.name || c.detected_name;
    const price = u.price != null ? u.price : c.detected_price;
    const image = u.image || c.detected_image;
    if (!name || price == null || Number(price) <= 0) { skipped.push(cid); continue; }
    const fields = {
      restaurant_id, mapped_tamam_product_id: c.mapped_master_catalog_product_id || null,
      meal_id: c.mapped_master_catalog_product_id || null, meal_name_snapshot: c.detected_name,
      restaurant_product_name: name, price: Number(price),
      short_description_ar: u.description || c.detected_description || '',
      customer_visible_description: u.description || c.detected_description || '',
      primary_image: image || null, available: u.available !== false, active: true,
      available_quantity: u.max_daily_quantity || null,
      preparation_time_override: u.prep_time != null ? Number(u.prep_time) : null,
      restaurant_category_name: u.category || c.detected_category || '',
      mapping_status: c.mapped_master_catalog_product_id ? 'mapped' : 'unmapped',
      mapping_confidence: c.mapping_confidence || 0, mapped_at: new Date().toISOString(), mapped_by: user.id,
      display_order: 0, dietary_labels: [], currency: 'ILS', tax_included: true,
      import_batch_id: c.menu_import_session_id,
    };
    const rec = await base44.asServiceRole.entities.RestaurantMealOffer.create(fields);
    await base44.asServiceRole.entities.MenuImportCandidate.update(cid, { review_status: 'imported' });
    created.push(rec.id);
  }
  await logAudit(base44, restaurant_id, user.id, user.full_name, 'import', restaurant_id, 'menu_published', null, { count: created.length }, '');
  return { created: created.length, skipped: skipped.length };
}
async function listMenuTemplates(base44) {
  await base44.auth.me();
  const list = await base44.asServiceRole.entities.MenuTemplate.filter({ is_active: true }, 'name_ar', 50).catch(() => []);
  return (list || []).map((t) => ({
    id: t.id, name_ar: t.name_ar, description_ar: t.description_ar, restaurant_type: t.restaurant_type,
    source_type: t.source_type, permission_status: t.permission_status, item_count: t.item_count || 0,
  }));
}
async function getMenuTemplate(base44, { template_id }) {
  await base44.auth.me();
  const t = await base44.asServiceRole.entities.MenuTemplate.get(template_id).catch(() => null);
  if (!t) throw authError(404, 'not_found');
  const items = await base44.asServiceRole.entities.MenuTemplateItem.filter({ menu_template_id: template_id }, 'display_order', 200).catch(() => []);
  return {
    template: { id: t.id, name_ar: t.name_ar, description_ar: t.description_ar, restaurant_type: t.restaurant_type, source_type: t.source_type, permission_status: t.permission_status },
    items: (items || []).map((i) => ({
      id: i.id, tamam_master_catalog_product_id: i.tamam_master_catalog_product_id,
      generic_name_ar: i.generic_name_ar, generic_description_ar: i.generic_description_ar,
      approved_image_url: i.approved_image_url, default_category_name: i.default_category_name,
      is_optional: i.is_optional, display_order: i.display_order,
    })),
  };
}

// ---------------------------------------------------------------------------
// Partner Demo View — read-only visibility over existing demand intelligence
// (Campaign / CampaignOffer / DemandDecision / Opportunity / DemandDayProfile).
// Surfaces the demo restaurant's real engine data in owner-friendly Arabic.
// ---------------------------------------------------------------------------
import {
  offerToPartner, liveOfferStatus, readLiveSignals, deriveLiveStatus,
  readActiveCampaigns, readLatestOpportunity, readApprovalsNeeded, readTodayPlan,
  readWeeklyTimeMap, readCapacity, readDataStatus, readDemoPerformance, buildWhyChain,
  demoHeroCards, readDemoOrders,
  OBJECTIVE_AR, MECHANISM_AR, OFFER_TYPE_AR,
} from '../../shared/partnerDemoView.ts';
import { commercialBreakdown } from '../../shared/campaignCommerce.ts';

async function getPartnerDemo(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_dashboard');
  const SR = base44.asServiceRole;
  const restaurant = await SR.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!restaurant) throw authError(404, 'restaurant_not_found');
  let nowMs = Date.now();

  let campaigns = await readActiveCampaigns(SR, restaurant_id, nowMs);

  // Auto-seed if demo restaurant has no live active campaign (admin only).
  // This makes the demo self-healing on first load and after the campaign
  // time window expires, without requiring a manual reset.
  if (restaurant.is_demo && !(campaigns.active || []).length) {
    try {
      const me = await base44.auth.me().catch(() => null);
      if (me?.role === 'admin') {
        await seedPartnerDemo(base44, { restaurant_id });
        nowMs = Date.now();
        campaigns = await readActiveCampaigns(SR, restaurant_id, nowMs);
      }
    } catch {}
  }

  // Refresh stale demo orders (older than 1 hour) so timestamps stay realistic.
  if (restaurant.is_demo) {
    try {
      const demoOrders = await SR.entities.RestaurantSubOrder
        .filter({ restaurant_id, is_demo: true }, '-created_date', 10).catch(() => []);
      const stale = (demoOrders || []).some((o) => nowMs - new Date(o.created_date).getTime() > 3600000);
      if (stale) {
        const me = await base44.auth.me().catch(() => null);
        if (me?.role === 'admin') await refreshDemoOrders(base44, restaurant_id);
      }
    } catch {}
  }

  const [signals, opportunity, approvals, todayPlan, perf, orders] = await Promise.all([
    readLiveSignals(SR, restaurant_id),
    readLatestOpportunity(SR, restaurant_id),
    readApprovalsNeeded(SR, restaurant_id),
    readTodayPlan(SR, restaurant_id, nowMs),
    readDemoPerformance(SR, restaurant_id),
    readDemoOrders(SR, restaurant_id),
  ]);

  const liveStatus = deriveLiveStatus(restaurant, signals);
  const capacity = readCapacity(restaurant);

  return {
    is_demo: !!restaurant.is_demo,
    restaurant: {
      id: restaurant.id, name_ar: restaurant.name_ar || restaurant.name,
      current_status: restaurant.current_status, accepts_orders: restaurant.accepts_orders,
    },
    live_status: liveStatus,
    signals: signals,
    active_campaign: (campaigns.active || [])[0] || null,
    paused_campaign: (campaigns.paused || [])[0] || null,
    opportunity,
    hero_cards: demoHeroCards(),
    approvals_needed: approvals,
    today_plan: todayPlan,
    capacity,
    performance: perf,
    orders,
    now: new Date(nowMs).toISOString(),
  };
}

async function listPartnerCampaigns(base44, { restaurant_id, tab }) {
  await resolveMembership(base44, restaurant_id, 'view_offers');
  const SR = base44.asServiceRole;
  const nowMs = Date.now();
  const offers = await SR.entities.CampaignOffer
    .filter({ restaurant_id }, '-created_date', 200).catch(() => []);
  const campIds = [...new Set((offers || []).map((o) => o.campaign_id).filter(Boolean))];
  const camps = campIds.length ? await SR.entities.Campaign.filter({ id: { $in: campIds } }).catch(() => []) : [];
  const campMap = {};
  for (const c of (camps || [])) campMap[c.id] = c;
  const mapped = (offers || []).map((o) => offerToPartner(o, campMap[o.campaign_id] || null, nowMs));
  // tab: active | scheduled | ready | completed
  let filtered = mapped;
  if (tab === 'active') filtered = mapped.filter((o) => o.status === 'active');
  else if (tab === 'scheduled') filtered = mapped.filter((o) => o.status === 'scheduled');
  else if (tab === 'ready') filtered = mapped.filter((o) => o.status === 'scheduled' && o.quota_total != null);
  else if (tab === 'completed') filtered = mapped.filter((o) => ['ended', 'sold_out', 'completed', 'paused'].includes(o.status));
  return filtered;
}

async function getPartnerCampaignDetail(base44, { restaurant_id, offer_id }) {
  await resolveMembership(base44, restaurant_id, 'view_offers');
  const SR = base44.asServiceRole;
  const o = await SR.entities.CampaignOffer.get(offer_id).catch(() => null);
  if (!o || o.restaurant_id !== restaurant_id) throw authError(404, 'not_found');
  const campaign = o.campaign_id ? await SR.entities.Campaign.get(o.campaign_id).catch(() => null) : null;
  const nowMs = Date.now();
  const item = o.restaurant_item_id ? await SR.entities.RestaurantMealOffer.get(o.restaurant_item_id).catch(() => null) : null;
  const why = campaign?.why_tamam_json ? safeJSON(campaign.why_tamam_json) : null;
  const bd = commercialBreakdown({
    normal_price: o.normal_reference_price, customer_price: o.customer_price,
    restaurant_contribution: o.restaurant_contribution, tamam_contribution: o.tamam_contribution,
  });
  return {
    offer: offerToPartner(o, campaign, nowMs),
    item: item ? { name: item.restaurant_product_name || item.name_ar, price: item.price, image: item.primary_image } : null,
    commercial: {
      normal: bd.normal, customer: bd.customer,
      discount: bd.discount,
      tamam_contribution: Math.round(bd.tamam_contribution * 100) / 100,
      restaurant_contribution: Math.round(bd.restaurant_contribution * 100) / 100,
      restaurant_settlement: Math.round(bd.restaurant_settlement * 100) / 100,
    },
    why,
    campaign: campaign ? { id: campaign.id, name: campaign.campaign_name, objective: campaign.objective, status: campaign.status } : null,
  };
}

async function getWhyTamam(base44, { restaurant_id, decision_id }) {
  await resolveMembership(base44, restaurant_id, 'view_dashboard');
  const SR = base44.asServiceRole;
  const d = await SR.entities.DemandDecision.get(decision_id).catch(() => null);
  if (!d || d.restaurant_id !== restaurant_id) throw authError(404, 'not_found');
  return {
    why: buildWhyChain(d),
    explanation: d.explanation_partner || '',
    objective_label: OBJECTIVE_AR[d.recommended_objective] || '',
    strategy_label: MECHANISM_AR[d.recommended_strategy] || '',
    quota: d.recommended_quota || 0,
    window_start: d.window_start, window_end: d.window_end,
  };
}

async function getPartnerTimeMap(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_dashboard');
  const SR = base44.asServiceRole;
  return await readWeeklyTimeMap(SR, restaurant_id);
}

async function getPartnerCapacity(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_dashboard');
  const SR = base44.asServiceRole;
  const restaurant = await SR.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!restaurant) throw authError(404, 'restaurant_not_found');
  return readCapacity(restaurant);
}

async function getPartnerDataStatus(base44, { restaurant_id }) {
  await resolveMembership(base44, restaurant_id, 'view_dashboard');
  const SR = base44.asServiceRole;
  return await readDataStatus(SR, restaurant_id);
}

// Seed / reset the partner demo — shifts one clean offer to "active now" so
// the home shows a live campaign, and ensures the demo restaurant has a
// realistic weekly demand pattern. Reuses existing campaignEngine demo data;
// does NOT duplicate or rebuild engines.
async function seedPartnerDemo(base44, { restaurant_id }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'view_dashboard');
  if (user.role !== 'admin') throw authError(403, 'admin_only');
  const SR = base44.asServiceRole;
  const restaurant = await SR.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!restaurant || !restaurant.is_demo) throw authError(400, 'not_demo_restaurant');

  const BATCH = 'tamam-partner-demo-v2';
  const now = new Date();
  const nowMs = now.getTime();

  // ---- 1. Clean old demo execution-layer data (campaigns/offers/events/decisions) ----
  const [oldCamps, oldOffers, oldEvents, oldDecisions] = await Promise.all([
    SR.entities.Campaign.filter({ restaurant_id, is_demo: true }, '-created_date', 200).catch(() => []),
    SR.entities.CampaignOffer.filter({ restaurant_id, is_demo: true }, '-created_date', 200).catch(() => []),
    SR.entities.CampaignEvent.filter({ restaurant_id, is_demo: true }, '-created_date', 500).catch(() => []),
    SR.entities.DemandDecision.filter({ restaurant_id, is_demo: true }, '-created_date', 200).catch(() => []),
  ]);
  // Delete old offers first (they reference campaigns), then campaigns, events, decisions
  for (const o of (oldOffers || [])) await SR.entities.CampaignOffer.delete(o.id).catch(() => {});
  for (const c of (oldCamps || [])) await SR.entities.Campaign.delete(c.id).catch(() => {});
  for (const e of (oldEvents || [])) await SR.entities.CampaignEvent.delete(e.id).catch(() => {});
  for (const d of (oldDecisions || [])) await SR.entities.DemandDecision.delete(d.id).catch(() => {});

  // ---- 2. Ensure demo menu items (شاورما 45, تشيبس 8, كولا 6) ----
  const menuItems = await SR.entities.RestaurantMealOffer.filter({ restaurant_id }, 'display_order', 100).catch(() => []);
  let shawarma = (menuItems || []).find((m) => (m.restaurant_category_name || '').includes('شاورما'));
  if (shawarma) {
    await SR.entities.RestaurantMealOffer.update(shawarma.id, { price: 45, available: true }).catch(() => {});
  } else {
    shawarma = await SR.entities.RestaurantMealOffer.create({
      restaurant_id, name: 'شاورما', name_ar: 'شاورما', price: 45,
      restaurant_category_name: 'شاورما', available: true, display_order: 1,
      short_description_ar: 'شاورما طازجة محضّرة بعجينتنا الخاصة', is_demo: true, demo_batch_id: BATCH,
    });
  }
  let chips = (menuItems || []).find((m) => (m.name || '').includes('تشيبس') || (m.name_ar || '').includes('تشيبس'));
  if (!chips) {
    chips = await SR.entities.RestaurantMealOffer.create({
      restaurant_id, name: 'تشيبس', name_ar: 'تشيبس', price: 8,
      restaurant_category_name: 'مقبلات', available: true, display_order: 10,
      short_description_ar: 'بطاطا مقرمشة', is_demo: true, demo_batch_id: BATCH,
    });
  }
  let cola = (menuItems || []).find((m) => (m.name || '').includes('كولا') || (m.name_ar || '').includes('كولا') || (m.name || '').includes('مشروبات'));
  if (!cola) {
    cola = await SR.entities.RestaurantMealOffer.create({
      restaurant_id, name: 'كولا', name_ar: 'كولا', price: 6,
      restaurant_category_name: 'مشروبات', available: true, display_order: 20,
      short_description_ar: 'مشروب غازي بارد', is_demo: true, demo_batch_id: BATCH,
    });
  }
  const shawarmaId = shawarma.id, chipsId = chips.id, colaId = cola.id;

  // ---- 2b. Resolve old active signals so the demo starts clean ----
  const oldSignals = await SR.entities.RestaurantOperationalSignal
    .filter({ restaurant_id, status: 'active' }).catch(() => []);
  for (const s of (oldSignals || [])) {
    await SR.entities.RestaurantOperationalSignal.update(s.id, { status: 'resolved', resolved_at: now.toISOString() }).catch(() => {});
  }

  // ---- 3. Time windows for the story ----
  // Active campaign: spans NOW (live immediately) — 1h ago to 5h from now (6h live window)
  const activeStart = new Date(nowMs - 1 * 3600000);
  const activeEnd = new Date(nowMs + 5 * 3600000);
  // Today 15:00-17:00 (the GREEN weak period — decision window reference)
  const today15 = new Date(now); today15.setHours(15, 0, 0, 0);
  const today17 = new Date(now); today17.setHours(17, 0, 0, 0);
  // Today 18:00-21:00 (the RED pressure block — NO_ACTION)
  const today18 = new Date(now); today18.setHours(18, 0, 0, 0);
  const today21 = new Date(now); today21.setHours(21, 0, 0, 0);
  // Next suitable GREEN period (tomorrow 15:00-17:00) for READY offer
  const tmrw15 = new Date(now); tmrw15.setDate(tmrw15.getDate() + 1); tmrw15.setHours(15, 0, 0, 0);
  const tmrw17 = new Date(now); tmrw17.setDate(tmrw17.getDate() + 1); tmrw17.setHours(17, 0, 0, 0);

  // ---- 4. Create clean DEMO campaigns + offers ----
  const whyJson = JSON.stringify({
    input: 'الإثنين 15:00–17:00 فترة هادية',
    goal: 'تجيب زباين جدد',
    limits: 'ما بدك نحرق سعر الشاورما',
    action: 'شاورما + تشيبس + كولا بـ 51 ₪ لأول 8 طلبات',
  });

  // (A) ACTIVE — تجربة أولى — شاورما (NEW_CUSTOMERS, FIRST_TRIAL, mix, 51₪, quota 8, used 3)
  const campActive = await SR.entities.Campaign.create({
    restaurant_id, campaign_name: 'تجربة أولى — شاورما', objective: 'NEW_CUSTOMERS',
    status: 'ACTIVE', start_at: activeStart.toISOString(), end_at: activeEnd.toISOString(),
    primary_audience: ['new_to_restaurant'], source_opportunity_id: '',
    why_tamam_json: whyJson, channels: ['home', 'mood_game', 'offers'],
    is_demo: true, demo_batch_id: BATCH,
  });
  const offerActive = await SR.entities.CampaignOffer.create({
    campaign_id: campActive.id, restaurant_id, offer_title: 'تجربة أولى — شاورما',
    offer_type: 'FIRST_TRIAL', restaurant_item_id: shawarmaId, mealset_variant_id: 'mix',
    customer_price: 51, normal_reference_price: 59, value_add_description: 'تشيبس + كولا مع شاورما بسعر الميكس',
    start_at: activeStart.toISOString(), end_at: activeEnd.toISOString(),
    quota_total: 8, quota_used: 3, unlock_type: 'none', audience_rule: ['new_to_restaurant'],
    audience_size: 0, status: 'active', priority: 100, channels: ['home', 'mood_game', 'offers'],
    restaurant_contribution: 5, tamam_contribution: 3, is_demo: true, demo_batch_id: BATCH,
  });
  await SR.entities.Campaign.update(campActive.id, { linked_offer_ids: [offerActive.id] });

  // (B) READY — عرض جاهز — شاورما Mix (next GREEN period)
  const campReady = await SR.entities.Campaign.create({
    restaurant_id, campaign_name: 'عرض جاهز — شاورما Mix', objective: 'NEW_CUSTOMERS',
    status: 'READY', start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    primary_audience: ['new_to_restaurant'], why_tamam_json: whyJson, channels: ['home', 'offers'],
    is_demo: true, demo_batch_id: BATCH,
  });
  const offerReady = await SR.entities.CampaignOffer.create({
    campaign_id: campReady.id, restaurant_id, offer_title: 'عرض جاهز — شاورما Mix',
    offer_type: 'FIRST_TRIAL', restaurant_item_id: shawarmaId, mealset_variant_id: 'mix',
    customer_price: 51, normal_reference_price: 59,
    start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    quota_total: 10, quota_used: 0, unlock_type: 'none', audience_rule: ['new_to_restaurant'],
    audience_size: 0, status: 'ready', priority: 50, channels: ['home', 'offers'],
    restaurant_contribution: 5, tamam_contribution: 3, is_demo: true, demo_batch_id: BATCH,
  });

  // (C) VALUE_ADD — شاورما + تشيبس هدية (REACTIVATION, no price reduction)
  const campVA = await SR.entities.Campaign.create({
    restaurant_id, campaign_name: 'قيمة مضافة — شاورما + تشيبس هدية', objective: 'REACTIVATION',
    status: 'READY', start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    primary_audience: ['returning_customer'], channels: ['home', 'offers'],
    is_demo: true, demo_batch_id: BATCH,
  });
  const offerVA = await SR.entities.CampaignOffer.create({
    campaign_id: campVA.id, restaurant_id, offer_title: 'شاورما + تشيبس هدية',
    offer_type: 'VALUE_ADD', restaurant_item_id: shawarmaId, mealset_variant_id: 'classic',
    customer_price: 45, normal_reference_price: 45, value_add_description: 'تشيبس هدية مع شاورما — بدون تنزيل السعر',
    start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    quota_total: 20, quota_used: 0, unlock_type: 'none', audience_rule: ['returning_customer'],
    audience_size: 0, status: 'ready', priority: 40, channels: ['home', 'offers'],
    restaurant_contribution: 0, tamam_contribution: 8, is_demo: true, demo_batch_id: BATCH,
  });

  // (D) 30-MINUTE — عرض نص ساعة 🔥 (IMMEDIATE_DEMAND, شاورما+كولا, 46₪, 30 min, quota 10)
  const start30 = new Date(nowMs + 3600000); const end30 = new Date(nowMs + 3600000 + 1800000);
  const camp30 = await SR.entities.Campaign.create({
    restaurant_id, campaign_name: 'عرض نص ساعة 🔥', objective: 'IMMEDIATE_DEMAND',
    status: 'SCHEDULED', start_at: start30.toISOString(), end_at: end30.toISOString(),
    primary_audience: ['public'], channels: ['home', 'push'],
    is_demo: true, demo_batch_id: BATCH,
  });
  const offer30 = await SR.entities.CampaignOffer.create({
    campaign_id: camp30.id, restaurant_id, offer_title: 'عرض نص ساعة 🔥',
    offer_type: 'LIMITED_TIME', restaurant_item_id: shawarmaId, mealset_variant_id: 'classic',
    customer_price: 46, normal_reference_price: 51, value_add_description: 'شاورما + كولا لمدة 30 دقيقة فقط',
    start_at: start30.toISOString(), end_at: end30.toISOString(),
    quota_total: 10, quota_used: 0, unlock_type: 'none', audience_rule: ['public'],
    audience_size: 0, status: 'scheduled', priority: 90, channels: ['home', 'push'],
    restaurant_contribution: 3, tamam_contribution: 2, is_demo: true, demo_batch_id: BATCH,
  });

  // (E) POINTS-LOCKED — خبايا TAMAM (LOYALTY, POINT_LOCKED, 40 points, 51₪, quota 30)
  const campPts = await SR.entities.Campaign.create({
    restaurant_id, campaign_name: 'خبايا TAMAM', objective: 'LOYALTY_ENGAGEMENT',
    status: 'SCHEDULED', start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    primary_audience: ['mood_eligible'], channels: ['home', 'khabya'],
    is_demo: true, demo_batch_id: BATCH,
  });
  const offerPts = await SR.entities.CampaignOffer.create({
    campaign_id: campPts.id, restaurant_id, offer_title: 'خبايا TAMAM — عرض حصري بالنقاط',
    offer_type: 'POINT_LOCKED', restaurant_item_id: shawarmaId, mealset_variant_id: 'mix',
    customer_price: 51, normal_reference_price: 59, value_add_description: 'شاورما + تشيبس + كولا — فتح بـ 40 نقطة TAMAM',
    start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    quota_total: 30, quota_used: 0, unlock_type: 'point_locked', unlock_points: 40,
    audience_rule: ['mood_eligible'], audience_size: 0, status: 'scheduled', priority: 60,
    channels: ['home', 'khabya'], restaurant_contribution: 5, tamam_contribution: 3,
    is_demo: true, demo_batch_id: BATCH,
  });

  // (F) LIMITED TIME + QUANTITY — عرض وقت وكمية (51₪, quota 20, 15:00-17:00)
  const campLQ = await SR.entities.Campaign.create({
    restaurant_id, campaign_name: 'عرض وقت وكمية', objective: 'IMMEDIATE_DEMAND',
    status: 'SCHEDULED', start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    primary_audience: ['public'], channels: ['home', 'offers'],
    is_demo: true, demo_batch_id: BATCH,
  });
  const offerLQ = await SR.entities.CampaignOffer.create({
    campaign_id: campLQ.id, restaurant_id, offer_title: 'عرض وقت وكمية — شاورما Mix',
    offer_type: 'TIME_AND_QUANTITY', restaurant_item_id: shawarmaId, mealset_variant_id: 'mix',
    customer_price: 51, normal_reference_price: 59,
    start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    quota_total: 20, quota_used: 7, unlock_type: 'none', audience_rule: ['public'],
    audience_size: 0, status: 'scheduled', priority: 70, channels: ['home', 'offers'],
    restaurant_contribution: 5, tamam_contribution: 3, is_demo: true, demo_batch_id: BATCH,
  });

  // (G) ONE-USER — عرض شخصي — زبون واحد (REACTIVATION, PERSONALIZED_VALUE, audience_size=1)
  const camp1 = await SR.entities.Campaign.create({
    restaurant_id, campaign_name: 'عرض شخصي — زبون واحد', objective: 'REACTIVATION',
    status: 'SCHEDULED', start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    primary_audience: ['targeted'], channels: ['push', 'whatsapp'],
    is_demo: true, demo_batch_id: BATCH,
  });
  const offer1 = await SR.entities.CampaignOffer.create({
    campaign_id: camp1.id, restaurant_id, offer_title: 'عرض شخصي — زبون مهتم بالشاورما',
    offer_type: 'REACTIVATION', restaurant_item_id: shawarmaId, mealset_variant_id: 'classic',
    customer_price: 45, normal_reference_price: 45, value_add_description: 'عرض مخصص لزبون واحد مناسب — بدون بيانات شخصية',
    start_at: tmrw15.toISOString(), end_at: tmrw17.toISOString(),
    quota_total: 1, quota_used: 0, unlock_type: 'none', audience_rule: ['targeted'],
    audience_size: 1, status: 'scheduled', priority: 30, channels: ['push', 'whatsapp'],
    restaurant_contribution: 0, tamam_contribution: 5, is_demo: true, demo_batch_id: BATCH,
  });

  // (H) SURPLUS — فائض الكمية (already completed for story — shows in "خلصت")
  const campSurplus = await SR.entities.Campaign.create({
    restaurant_id, campaign_name: 'فائض الكمية — شاورما', objective: 'SURPLUS',
    status: 'COMPLETED', start_at: new Date(nowMs - 86400000).toISOString(), end_at: new Date(nowMs - 7200000).toISOString(),
    primary_audience: ['public'], channels: ['home'],
    is_demo: true, demo_batch_id: BATCH,
  });
  const offerSurplus = await SR.entities.CampaignOffer.create({
    campaign_id: campSurplus.id, restaurant_id, offer_title: 'فائض الكمية — شاورما بـ 38 ₪',
    offer_type: 'SURPLUS', restaurant_item_id: shawarmaId, mealset_variant_id: 'classic',
    customer_price: 38, normal_reference_price: 45,
    start_at: new Date(nowMs - 86400000).toISOString(), end_at: new Date(nowMs - 7200000).toISOString(),
    quota_total: 15, quota_used: 15, unlock_type: 'none', audience_rule: ['public'],
    audience_size: 0, status: 'completed', priority: 20, channels: ['home'],
    restaurant_contribution: 7, tamam_contribution: 0, is_demo: true, demo_batch_id: BATCH,
  });

  // ---- 5. DemandDecisions (the intelligence story) ----
  // (A) The main NEW_CUSTOMERS decision (PREPARE → accepted → active campaign)
  await SR.entities.DemandDecision.create({
    restaurant_id, window_start: today15.toISOString(), window_end: today17.toISOString(),
    valid_until: today17.toISOString(), demand_state: 'NEEDS_DEMAND',
    baseline_orders: 4, projected_natural_orders: 4, safe_operational_target: 14,
    safe_additional_capacity: 10, existing_campaign_commitment: 0,
    demand_gap: 10, audience_segment: 'new_to_restaurant', audience_size: 120, audience_intent_score: 0.72,
    commercial_safety_score: 0.85, commercial_safe: true, cannibalization_risk: 'LOW', cannibalization_risk_score: 0.15,
    campaign_fatigue_score: 0.1, restaurant_priority_score: 70, data_confidence_score: 0.65, urgency_score: 60,
    capacity_source: 'restaurant_default', opportunity_score: 78,
    score_components: '{}', hard_blockers: [], decision: 'PREPARE',
    recommended_objective: 'NEW_CUSTOMERS', recommended_strategy: 'FIRST_TRIAL', recommended_variant: 'mix',
    recommended_quota: 8, explore_exploit: 'EXPLOIT', learning_mode: false, automation_mode: 'MANUAL',
    intervention_cost_score: 0.3, expected_incremental_orders: 6, expected_incremental_revenue: 306,
    expected_tamam_contribution_cost: 24, expected_restaurant_settlement: 264,
    strategy_alternatives: '[]', data_sources: '{}', campaign_safety_recommendation: '',
    explanation_internal: 'Monday 15-17 is weak; high shawarma intent audience available; mix strategy avoids price burn',
    explanation_partner: 'الإثنين 15:00–17:00 فترة هادية عندك، وفي جمهور مهتم بالشاورما لسه ما جرب المطعم. TAMAM بتقترح ميكس شاورما + تشيبس + كولا بـ 51 ₪ لأول 8 طلبات — بدون ما نحرق سعر الشاورما.',
    source_signal_ids: [], scenario_key: 'F_high_intent_new_customer', is_demo: true, demo_batch_id: BATCH,
  });

  // (B) NO_ACTION — the RED pressure block (18:00-21:00)
  await SR.entities.DemandDecision.create({
    restaurant_id, window_start: today18.toISOString(), window_end: today21.toISOString(),
    valid_until: today21.toISOString(), demand_state: 'OVERLOADED',
    baseline_orders: 22, projected_natural_orders: 22, safe_operational_target: 22,
    safe_additional_capacity: 0, existing_campaign_commitment: 0,
    demand_gap: 0, audience_segment: '', audience_size: 0, audience_intent_score: 0,
    commercial_safety_score: 0, commercial_safe: false, cannibalization_risk: 'HIGH', cannibalization_risk_score: 0.8,
    campaign_fatigue_score: 0.3, restaurant_priority_score: 50, data_confidence_score: 0.8, urgency_score: 20,
    capacity_source: 'restaurant_default', opportunity_score: 15,
    score_components: '{}', hard_blockers: ['kitchen_pressure'], decision: 'NO_ACTION',
    recommended_objective: '', recommended_strategy: '', recommended_quota: 0,
    explore_exploit: 'EXPLOIT', learning_mode: false, automation_mode: 'MANUAL',
    intervention_cost_score: 0.9, expected_incremental_orders: 0, expected_incremental_revenue: 0,
    expected_tamam_contribution_cost: 0, expected_restaurant_settlement: 0,
    strategy_alternatives: '[]', data_sources: '{}', campaign_safety_recommendation: '',
    explanation_internal: '18-21 is historically a pressure period; no additional demand should be created',
    explanation_partner: 'هي عادة فترة ضغط عندك. ما بدنا نجيب طلبات زيادة تأثر على الشغل. TAMAM ما رح تشغّل عروض هسّا.',
    source_signal_ids: [], scenario_key: 'B_pressure_no_action', is_demo: true, demo_batch_id: BATCH,
  });

  // (C) NEEDS_RESTAURANT_APPROVAL — commercial unsafe
  await SR.entities.DemandDecision.create({
    restaurant_id, window_start: tmrw15.toISOString(), window_end: tmrw17.toISOString(),
    valid_until: tmrw17.toISOString(), demand_state: 'NEEDS_DEMAND',
    baseline_orders: 3, projected_natural_orders: 3, safe_operational_target: 13,
    safe_additional_capacity: 10, existing_campaign_commitment: 0,
    demand_gap: 10, audience_segment: 'public', audience_size: 200, audience_intent_score: 0.5,
    commercial_safety_score: 0.3, commercial_safe: false, cannibalization_risk: 'MEDIUM', cannibalization_risk_score: 0.4,
    campaign_fatigue_score: 0.2, restaurant_priority_score: 60, data_confidence_score: 0.5, urgency_score: 50,
    capacity_source: 'restaurant_default', opportunity_score: 55,
    score_components: '{}', hard_blockers: ['commercial_unsafe'], decision: 'NEEDS_RESTAURANT_APPROVAL',
    recommended_objective: 'IMMEDIATE_DEMAND', recommended_strategy: 'DIRECT_PRICE', recommended_variant: 'classic',
    recommended_quota: 15, explore_exploit: 'EXPLOIT', learning_mode: false, automation_mode: 'MANUAL',
    intervention_cost_score: 0.6, expected_incremental_orders: 8, expected_incremental_revenue: 280,
    expected_tamam_contribution_cost: 40, expected_restaurant_settlement: 240,
    strategy_alternatives: '[]', data_sources: '{}', campaign_safety_recommendation: '',
    explanation_internal: 'Proposed discount exceeds restaurant contribution cap; needs approval',
    explanation_partner: 'السعر المقترح خارج الحد المتفق عليه. بدك توافق على تعديل الحد ولا نشتغل بطريقة تانية؟',
    source_signal_ids: [], scenario_key: 'I_commercial_unsafe', is_demo: true, demo_batch_id: BATCH,
  });

  // ---- 6. CampaignEvents for performance (demo-only) ----
  // 6 purchases: 4 unique new customers (with user_id) + 2 walk-ins (no user_id)
  // → campaign_orders=6, campaign_revenue=306₪, new_customers=4
  const ev = SR.entities.CampaignEvent;
  const newCustomerIds = ['demo-cust-1', 'demo-cust-2', 'demo-cust-3', 'demo-cust-4'];
  for (const uid of newCustomerIds) {
    await ev.create({ campaign_id: campActive.id, offer_id: offerActive.id, restaurant_id,
      channel: 'home', event_type: 'purchase', amount: 51, restaurant_settlement: 48,
      tamam_revenue: 3, user_id: uid, is_demo: true, demo_batch_id: BATCH });
  }
  for (let i = 0; i < 2; i++) {
    await ev.create({ campaign_id: campActive.id, offer_id: offerActive.id, restaurant_id,
      channel: 'home', event_type: 'purchase', amount: 51, restaurant_settlement: 48,
      tamam_revenue: 3, is_demo: true, demo_batch_id: BATCH });
  }
  for (let i = 0; i < 2; i++) {
    await ev.create({ campaign_id: campActive.id, offer_id: offerActive.id, restaurant_id,
      channel: 'home', event_type: 'unlock', is_demo: true, demo_batch_id: BATCH });
  }
  for (let i = 0; i < 45; i++) {
    await ev.create({ campaign_id: campActive.id, offer_id: offerActive.id, restaurant_id,
      channel: 'home', event_type: 'impression', is_demo: true, demo_batch_id: BATCH });
  }
  // Surplus campaign: 15 purchases (sold out → stopped_by_limit)
  for (let i = 0; i < 15; i++) {
    await ev.create({ campaign_id: campSurplus.id, offer_id: offerSurplus.id, restaurant_id,
      channel: 'home', event_type: 'purchase', amount: 38, restaurant_settlement: 38,
      tamam_revenue: 0, is_demo: true, demo_batch_id: BATCH });
  }

  // ---- 7. Ensure day profiles + capacity ----
  const existing = await SR.entities.DemandDayProfile.filter({ restaurant_id }).catch(() => []);
  const profile = (await SR.entities.WeeklyDemandProfile.filter({ restaurant_id }).catch(() => []))[0];
  const profileId = profile?.id || 'demo-profile';
  // Mon=quiet(GREEN), Tue=quiet(GREEN), Wed=medium(YELLOW), Thu=medium(YELLOW), Fri=busy(RED), Sat=busy(RED), Sun=medium
  const pattern = ['medium', 'quiet', 'quiet', 'medium', 'medium', 'busy', 'busy']; // Sun..Sat
  for (let d = 0; d < 7; d++) {
    const dp = (existing || []).find((x) => x.day_of_week === d);
    const level = pattern[d];
    if (dp) await SR.entities.DemandDayProfile.update(dp.id, { effective_demand_level: level, manual_demand_level: level, is_demo: true, demo_batch_id: BATCH }).catch(() => {});
    else await SR.entities.DemandDayProfile.create({
      weekly_demand_profile_id: profileId, restaurant_id, day_of_week: d,
      manual_demand_level: level, suggested_demand_level: level, effective_demand_level: level,
      source: 'merchant', explanation: '', is_demo: true, demo_batch_id: BATCH,
    }).catch(() => {});
  }
  await SR.entities.Restaurant.update(restaurant_id, {
    capacity_normal_additional_per_hour: 10, capacity_max_additional_per_hour: 15,
    capacity_source: 'restaurant_default', current_status: 'open', accepts_orders: true,
  }).catch(() => {});

  // ---- 8. Refresh demo orders with fresh timestamps ----
  await refreshDemoOrders(base44, restaurant_id);

  return { ok: true, batch: BATCH, campaigns: 8, decisions: 3, events: 68 };
}

// Refresh demo-only orders so their created_date stays recent (no stale "قبل 1790 دقيقة").
// Deletes old demo orders and recreates them with fresh timestamps relative to now.
async function refreshDemoOrders(base44, restaurant_id) {
  const SR = base44.asServiceRole;
  const old = await SR.entities.RestaurantSubOrder
    .filter({ restaurant_id, is_demo: true }, '-created_date', 50).catch(() => []);
  for (const o of (old || [])) await SR.entities.RestaurantSubOrder.delete(o.id).catch(() => {});
  const now = Date.now();
  const item = (name, qty, price) => ({ name, quantity: qty, price, modifiers: [] });
  const defs = [
    { minsAgo: 2, status: 'pending', items: [item('شاورما', 1, 45), item('تشيبس', 1, 8), item('كولا', 1, 6)], total: 59, number: 'DEMO-1001' },
    { minsAgo: 7, status: 'preparing', items: [item('شاورما', 2, 45)], total: 90, number: 'DEMO-1002' },
    { minsAgo: 18, status: 'ready', items: [item('برجر لحم كلاسيك', 1, 45), item('بطاطا مقلية', 1, 15)], total: 60, number: 'DEMO-1003' },
    { minsAgo: 35, status: 'delivered', items: [item('وجبة برجر دجاج', 1, 42)], total: 42, number: 'DEMO-1004' },
  ];
  for (const d of defs) {
    await SR.entities.RestaurantSubOrder.create({
      parent_order_id: `demo-${d.number}`, parent_order_number: d.number, restaurant_id,
      restaurant_name_snapshot: 'مطعم البركة التجريبي', items_json: JSON.stringify(d.items),
      products_subtotal: d.total, total: d.total, status: d.status,
      customer_name: 'زبون تجريبي', customer_phone: '', customer_notes: '',
      is_demo: true, demo_batch_id: 'tamam-partner-demo-v2',
      created_date: new Date(now - d.minsAgo * 60000).toISOString(),
    }).catch(() => {});
  }
  return { created: defs.length };
}

async function resetPartnerDemo(base44, { restaurant_id }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'view_dashboard');
  if (user.role !== 'admin') throw authError(403, 'admin_only');
  const SR = base44.asServiceRole;
  const restaurant = await SR.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!restaurant || !restaurant.is_demo) throw authError(400, 'not_demo_restaurant');
  // Resolve all active signals + reset restaurant status
  const signals = await SR.entities.RestaurantOperationalSignal
    .filter({ restaurant_id, status: 'active' }).catch(() => []);
  for (const s of (signals || [])) {
    await SR.entities.RestaurantOperationalSignal.update(s.id, { status: 'resolved', resolved_at: new Date().toISOString() }).catch(() => {});
  }
  await SR.entities.Restaurant.update(restaurant_id, { current_status: 'open', accepts_orders: true }).catch(() => {});
  // Re-seed to restore the active offer
  return await seedPartnerDemo(base44, { restaurant_id });
}

// ---- Demo pressure/clear: real engine state changes for the sales demo ----
async function applyDemoPressure(base44, { restaurant_id }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_operational_status');
  const SR = base44.asServiceRole;
  const restaurant = await SR.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!restaurant || !restaurant.is_demo) throw authError(400, 'not_demo_restaurant');
  const nowMs = Date.now();
  // 1. Create pressure signal
  const sig = await SR.entities.RestaurantOperationalSignal.create({
    restaurant_id, type: 'pressure', reason: 'ضغط بالمطبخ', status: 'active',
    starts_at: new Date().toISOString(), created_by: user.id, is_demo: true,
  }).catch(() => null);
  // 2. Set restaurant busy
  await SR.entities.Restaurant.update(restaurant_id, { current_status: 'busy' }).catch(() => {});
  // 3. Pause all active demo offers
  const offers = await SR.entities.CampaignOffer.filter({ restaurant_id, is_demo: true, status: 'active' }).catch(() => []);
  let paused = 0;
  for (const o of (offers || [])) {
    if (o.end_at && new Date(o.end_at).getTime() > nowMs) {
      await SR.entities.CampaignOffer.update(o.id, { status: 'paused' }).catch(() => {});
      paused++;
    }
  }
  return { ok: true, signal_id: sig?.id || null, paused_offers: paused };
}

async function clearDemoPressure(base44, { restaurant_id }) {
  const { user } = await resolveMembership(base44, restaurant_id, 'manage_operational_status');
  const SR = base44.asServiceRole;
  const restaurant = await SR.entities.Restaurant.get(restaurant_id).catch(() => null);
  if (!restaurant || !restaurant.is_demo) throw authError(400, 'not_demo_restaurant');
  const nowMs = Date.now();
  // 1. Resolve pressure signals
  const signals = await SR.entities.RestaurantOperationalSignal
    .filter({ restaurant_id, status: 'active', type: 'pressure' }).catch(() => []);
  for (const s of (signals || [])) {
    await SR.entities.RestaurantOperationalSignal.update(s.id, { status: 'resolved', resolved_at: new Date().toISOString() }).catch(() => {});
  }
  // 2. Set restaurant open
  await SR.entities.Restaurant.update(restaurant_id, { current_status: 'open', accepts_orders: true }).catch(() => {});
  // 3. Resume paused offers that are still within their time window
  const offers = await SR.entities.CampaignOffer.filter({ restaurant_id, is_demo: true, status: 'paused' }).catch(() => []);
  let resumed = 0;
  for (const o of (offers || [])) {
    const end = o.end_at ? new Date(o.end_at).getTime() : Infinity;
    if (end > nowMs) {
      await SR.entities.CampaignOffer.update(o.id, { status: 'active' }).catch(() => {});
      resumed++;
    }
  }
  return { ok: true, resumed_offers: resumed };
}

function safeJSON(s) { try { return typeof s === 'string' ? JSON.parse(s) : (s || null); } catch { return null; } }

const ROUTES = {
  getMyContext,
  submitPartnerApplication,
  getHome,
  getOpportunities,
  getCampaignResults,
  listMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  listOffers,
  getOffer,
  pauseOfferRequest,
  listOrders,
  getOrder,
  updateOrderStatus,
  listSignals,
  createSignal,
  resolveSignal,
  listGuardrails,
  saveGuardrail,
  submitOfferRequest,
  listOfferRequests,
  getPerformance,
  updateRestaurantSettings,
  updateRestaurantCapacity,
  getRestaurantCapacity,
  toggleAcceptingOrders,
  createImportJob,
  listImportJobs,
  listOfferCalendar,
  listMonthlyPlan,
  getRestaurantReadiness,
  submitGuardrailChange,
  listGuardrailChanges,
  getDemandProfile,
  getDemandSummary,
  saveDemandSlots,
  setDemandDayLevel,
  acceptDaySuggestion,
  copyDemandDay,
  saveDemandOverride,
  listDemandOverrides,
  requestDemandOpportunity,
  createMenuSession,
  saveMenuCandidates,
  listMenuCandidates,
  updateMenuCandidate,
  resolveDuplicate,
  publishMenuCandidates,
  listMenuTemplates,
  getMenuTemplate,
  getPartnerDemo,
  listPartnerCampaigns,
  getPartnerCampaignDetail,
  getWhyTamam,
  getPartnerTimeMap,
  getPartnerCapacity,
  getPartnerDataStatus,
  seedPartnerDemo,
  resetPartnerDemo,
  applyDemoPressure,
  clearDemoPressure,
};