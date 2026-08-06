import { base44 } from '@/api/base44Client';

/**
 * Fetch all active+available restaurant offers for a TAMAM meal (Supabase meal id),
 * merged with their (active, order-accepting) Base44 Restaurant data.
 * Returns [] when nothing is available.
 */
export async function getOffersForMeal(mealId) {
  if (mealId == null) return [];
  let offers = [];
  try {
    offers = await base44.entities.RestaurantMealOffer.filter({ meal_id: mealId, active: true, available: true });
  } catch { return []; }
  if (!offers || !offers.length) return [];

  const restIds = [...new Set(offers.map((o) => o.restaurant_id).filter(Boolean))];
  if (!restIds.length) return [];
  let restaurants = [];
  try {
    restaurants = await base44.entities.Restaurant.filter({ id: { $in: restIds }, active: true, accepts_orders: true });
  } catch { return []; }
  const restMap = new Map((restaurants || []).map((r) => [r.id, r]));

  return offers
    .filter((o) => restMap.has(o.restaurant_id))
    .filter((o) => {
      const r = restMap.get(o.restaurant_id);
      return r.current_status !== 'closed' && r.current_status !== 'temporarily_unavailable';
    })
    .map((o) => {
      const r = restMap.get(o.restaurant_id);
      return {
        offer_id: o.id,
        restaurant_id: r.id,
        restaurant_name: r.name_ar || r.name,
        restaurant_logo: r.logo_url,
        restaurant_rating: r.rating,
        restaurant_verified: r.verified,
        restaurant_delivery_fee: r.delivery_fee || 0,
        restaurant_free_delivery_threshold: r.free_delivery_threshold,
        restaurant_delivery_time_min: r.delivery_time_min,
        restaurant_delivery_time_max: r.delivery_time_max,
        restaurant_current_status: r.current_status,
        price: o.price,
        compare_at_price: o.compare_at_price,
        preparation_time_override: o.preparation_time_override,
        customer_visible_description: o.customer_visible_description,
        image_override_url: o.image_override_url,
        supports_classic: o.supports_classic,
        supports_mix: o.supports_mix,
        supports_plus: o.supports_plus,
        available_quantity: o.available_quantity,
        restaurant_product_name: o.restaurant_product_name,
        restaurant_item_name: o.restaurant_product_name || o.name_ar,
        restaurant_item_image: o.primary_image || (o.gallery_images && o.gallery_images[0]) || o.image_override_url,
        restaurant_item_thumbnail: o.thumbnail_image || o.primary_image,
        restaurant_item_description: o.customer_visible_description || o.short_description_ar,
        full_description_ar: o.full_description_ar,
        ingredients_ar: o.ingredients_ar,
        included_items: o.included_items,
        portion_description_ar: o.portion_description_ar,
        allergens_ar: o.allergens_ar,
        packaging_description_ar: o.packaging_description_ar,
        dietary_labels: o.dietary_labels || [],
        gallery_images: o.gallery_images || [],
        sold_out: o.sold_out,
        available_days: o.available_days,
        available_from_time: o.available_from_time,
        available_until_time: o.available_until_time,
        daily_capacity: o.daily_capacity,
        delivery_fee_override: o.delivery_fee_override,
        minimum_order_override: o.minimum_order_override,
        free_delivery_threshold_override: o.free_delivery_threshold_override,
        mapping_status: o.mapping_status,
        mapped_meal_set_variant_id: o.mapped_meal_set_variant_id,
        restaurant_menu_item_id: o.id,
        restaurant_sku: o.restaurant_sku,
        mapped_tamam_product_id: o.mapped_tamam_product_id || o.meal_id,
        mapped_tier: o.mapped_tier || o.package_id,
        mapped_meal_set_id: o.mapped_meal_set_id,
        mapped_meal_set_variant_id: o.mapped_meal_set_variant_id,
      };
    });
}

/**
 * Pick the recommended default offer.
 * Priority: a restaurant already used by another cart item, then lowest price,
 * then shorter delivery, then higher rating.
 */
export function pickDefaultOffer(offers, existingRestaurantIds = []) {
  if (!offers || !offers.length) return null;
  const same = offers.filter((o) => existingRestaurantIds.includes(o.restaurant_id));
  const pool = same.length ? same : offers;
  return pool.slice().sort((a, b) => {
    if ((a.price || 0) !== (b.price || 0)) return (a.price || 0) - (b.price || 0);
    const aDel = a.restaurant_delivery_time_min ?? 99;
    const bDel = b.restaurant_delivery_time_min ?? 99;
    if (aDel !== bDel) return aDel - bDel;
    return (b.restaurant_rating || 0) - (a.restaurant_rating || 0);
  })[0];
}

/**
 * Group cart items by their selected fulfillment restaurant and compute per-restaurant
 * and global totals. Delivery is charged once per restaurant (not per product), and waived
 * when the group subtotal reaches the restaurant's free-delivery threshold.
 * Legacy items (no restaurant selection) fall back to their marketing price and the
 * primary restaurant delivery fee, grouped together.
 */
export function computeCartTotals(items, primaryRestaurant = null) {
  const groups = new Map();
  const ensure = (rid) => {
    if (!groups.has(rid)) groups.set(rid, { restaurant_id: rid, items: [], delivery_fee: 0, free_threshold: null, name: '', logo: '', prep: 0 });
    return groups.get(rid);
  };

  for (const it of items) {
    const rid = it.selected_restaurant_id || '__legacy__';
    const g = ensure(rid);
    g.items.push(it);
    if (it.selected_restaurant_id) {
      if (it.restaurant_delivery_fee_snapshot != null) g.delivery_fee = Math.max(g.delivery_fee, it.restaurant_delivery_fee_snapshot || 0);
      if (it.restaurant_free_delivery_threshold_snapshot != null) g.free_threshold = it.restaurant_free_delivery_threshold_snapshot;
      if (it.restaurant_name_snapshot) g.name = it.restaurant_name_snapshot;
      if (it.restaurant_logo_snapshot) g.logo = it.restaurant_logo_snapshot;
      if (it.restaurant_preparation_time_snapshot) g.prep = Math.max(g.prep, it.restaurant_preparation_time_snapshot || 0);
    } else {
      if (primaryRestaurant) {
        g.name = primaryRestaurant.name || g.name || 'بانتظار تحديد مطعم منفّذ';
        g.logo = primaryRestaurant.image_url || primaryRestaurant.logo_url || g.logo;
        g.delivery_fee = Math.max(g.delivery_fee, primaryRestaurant.delivery_fee || 0);
        g.free_threshold = g.free_threshold ?? primaryRestaurant.free_delivery_threshold ?? null;
      } else {
        g.name = g.name || 'بانتظار تحديد مطعم منفّذ';
      }
    }
  }

  let products_subtotal = 0;
  let delivery_total = 0;
  const groupDetails = [];
  for (const g of groups.values()) {
    const sub = g.items.reduce((s, it) => {
      const unit = it.selected_restaurant_id ? (it.restaurant_unit_price || 0) : (it.price || 0);
      const extras = (it.extras || []).reduce((acc, e) => acc + (e.price || 0), 0);
      return s + (unit + extras) * it.quantity;
    }, 0);
    const fee = g.free_threshold != null && sub >= g.free_threshold ? 0 : (g.delivery_fee || 0);
    delivery_total += fee;
    products_subtotal += sub;
    groupDetails.push({
      restaurant_id: g.restaurant_id,
      restaurant_name: g.name,
      restaurant_logo: g.logo,
      items: g.items,
      products_subtotal: sub,
      delivery_fee: fee,
      total: sub + fee,
      prep: g.prep,
      is_legacy: g.restaurant_id === '__legacy__',
    });
  }

  return {
    products_subtotal,
    delivery_total,
    total: products_subtotal + delivery_total,
    groupDetails,
    restaurant_count: groupDetails.length,
  };
}

/**
 * Real cart impact of switching one item to a given offer:
 * item total (offer price × qty + extras) plus the incremental delivery fee the new
 * restaurant would add (0 if that restaurant is already used by another cart item).
 */
export function offerImpact(offer, item, allItems) {
  const others = (allItems || []).filter((i) => i.cartId !== item.cartId);
  const otherRestaurantIds = new Set(others.filter((i) => i.selected_restaurant_id).map((i) => i.selected_restaurant_id));
  const incrementalDelivery = otherRestaurantIds.has(offer.restaurant_id) ? 0 : (offer.restaurant_delivery_fee || 0);
  const extras = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
  const itemTotal = (offer.price + extras) * (item.quantity || 1);
  const impact = itemTotal + incrementalDelivery;

  const currentUnit = item.selected_restaurant_id ? (item.restaurant_unit_price ?? 0) : (item.price ?? 0);
  const currentItemTotal = (currentUnit + extras) * (item.quantity || 1);
  const currentIncremental = item.selected_restaurant_id && !otherRestaurantIds.has(item.selected_restaurant_id) ? (item.restaurant_delivery_fee_snapshot || 0) : 0;
  const currentImpact = currentItemTotal + currentIncremental;
  const diff = impact - currentImpact;

  return { impact, diff, incrementalDelivery, itemTotal, sameRestaurant: otherRestaurantIds.has(offer.restaurant_id) };
}

/**
 * Smart consolidation: find a single restaurant (already serving the cart or another
 * active one) that can ALSO fulfill items currently spread across other restaurants,
 * so consolidating reduces the restaurant count and the total (mainly delivery fees).
 * Returns null when there's no meaningful saving. Pure data — no UI.
 */
export async function findConsolidation(items) {
  const realItems = (items || []).filter((i) => i.selected_restaurant_id && i.id != null);
  if (realItems.length < 2) return null;
  const restIds = [...new Set(realItems.map((i) => i.selected_restaurant_id))];
  if (restIds.length < 2) return null;

  const offerCache = {};
  for (const it of realItems) {
    if (offerCache[it.id] == null) {
      try { offerCache[it.id] = await getOffersForMeal(it.id); } catch { offerCache[it.id] = []; }
    }
  }

  const candidateIds = new Set();
  Object.values(offerCache).forEach((list) => (list || []).forEach((o) => candidateIds.add(o.restaurant_id)));

  const currentTotals = computeCartTotals(items);
  let best = null;

  for (const targetId of candidateIds) {
    const plan = realItems.map((it) => {
      const off = (offerCache[it.id] || []).find((o) => o.restaurant_id === targetId);
      return { cartId: it.cartId, item: it, offer: off || null };
    });
    const movable = plan.filter((p) => p.offer);
    if (movable.length < 1) continue;

    const remaining = new Set();
    plan.forEach((p) => remaining.add(p.offer ? targetId : p.item.selected_restaurant_id));
    if (remaining.size >= restIds.length) continue; // no restaurant reduction

    const simItems = items.map((i) => {
      const p = plan.find((x) => x.item.cartId === i.cartId);
      if (p && p.offer) {
        return {
          ...i,
          selected_restaurant_id: targetId,
          selected_restaurant_offer_id: p.offer.offer_id,
          restaurant_unit_price: p.offer.price,
          restaurant_name_snapshot: p.offer.restaurant_name,
          restaurant_logo_snapshot: p.offer.restaurant_logo,
          restaurant_delivery_fee_snapshot: p.offer.restaurant_delivery_fee,
          restaurant_free_delivery_threshold_snapshot: p.offer.restaurant_free_delivery_threshold,
          restaurant_preparation_time_snapshot: p.offer.preparation_time_override || p.offer.restaurant_delivery_time_min,
        };
      }
      return i;
    });
    const newTotals = computeCartTotals(simItems);
    const saving = currentTotals.total - newTotals.total;
    if (saving <= 0) continue;

    const name = movable[0].offer.restaurant_name;
    if (!best || saving > best.saving) {
      best = {
        targetId,
        targetName: name,
        targetLogo: movable[0].offer.restaurant_logo,
        movedCount: movable.length,
        totalCount: realItems.length,
        currentTotal: currentTotals.total,
        newTotal: newTotals.total,
        saving,
        remainingCount: remaining.size,
        changes: movable.map((p) => ({
          cartId: p.cartId,
          name: p.item.name,
          fromRestaurant: p.item.restaurant_name_snapshot,
          toRestaurant: name,
          oldPrice: p.item.restaurant_unit_price,
          newPrice: p.offer.price,
          offer: p.offer,
        })),
      };
    }
  }
  return best;
}