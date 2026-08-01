import { getRestaurantById, getMenuItemsByRestaurant } from '@/lib/api';

// Re-build a cart from a past order using CURRENT menu data (availability + prices).
// Returns { ok, restaurant, added, missing, changed, unchanged }.
export async function buildReorderCart(order, cart) {
  if (!order) return { ok: false, reason: 'الطلب غير متوفر.' };
  const restId = order.kitchen_id ?? order.restaurant_id;
  let restaurant;
  try { restaurant = await getRestaurantById(restId); } catch { restaurant = null; }
  if (!restaurant) return { ok: false, reason: 'المطعم مش متوفر حاليًا.' };
  if (restaurant.is_open === false || restaurant.active === false) return { ok: false, reason: 'المطعم مغلق حاليًا، جرّب لاحقًا.' };

  const cats = await getMenuItemsByRestaurant(restaurant.id);
  const allItems = (cats || []).flatMap(c => c.items || []);
  const added = [], missing = [], changed = [], unchanged = [];

  for (const it of (order.order_items || [])) {
    const match = allItems.find(m => (m.name_ar || m.name) === it.name);
    if (!match || match.is_available === false) { missing.push(it.name); continue; }
    const priceChanged = match.price !== it.price;
    if (priceChanged) changed.push(it.name);
    else unchanged.push(it.name);
    cart.addItem({
      id: match.id,
      name: match.name_ar || match.name,
      price: match.price,
      quantity: it.quantity || 1,
      extras: it.extras || [],
    }, restaurant);
    added.push(it.name);
  }

  if (!added.length) return { ok: false, reason: 'ما في أصناف متوفرة من هذا الطلب حاليًا.' };
  return { ok: true, restaurant, added, missing, changed, unchanged };
}