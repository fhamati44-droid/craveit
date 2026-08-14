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
  toggleAcceptingOrders,
  createImportJob,
  listImportJobs,
  listOfferCalendar,
  listMonthlyPlan,
  getRestaurantReadiness,
  submitGuardrailChange,
  listGuardrailChanges,
};