import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { getOffersForMeal, pickDefaultOffer, computeCartTotals } from '@/lib/restaurantOfferApi';

const CartContext = createContext(null);

// Capture the FULL restaurant-specific version of the meal (Part 2 / Part 15).
// All snapshots are replaced together when the restaurant changes — never just the price.
function applyOffer(item, o) {
  const now = new Date().toISOString();
  return {
    ...item,
    selected_restaurant_id: o.restaurant_id,
    selected_restaurant_offer_id: o.offer_id,
    restaurant_menu_item_id: o.restaurant_menu_item_id,
    restaurant_unit_price: o.price,
    compare_at_price_snapshot: o.compare_at_price,
    restaurant_name_snapshot: o.restaurant_name,
    restaurant_logo_snapshot: o.restaurant_logo,
    restaurant_delivery_fee_snapshot: o.restaurant_delivery_fee,
    restaurant_free_delivery_threshold_snapshot: o.restaurant_free_delivery_threshold,
    restaurant_delivery_time_min_snapshot: o.restaurant_delivery_time_min,
    restaurant_delivery_time_max_snapshot: o.restaurant_delivery_time_max,
    restaurant_preparation_time_snapshot: o.preparation_time_override || o.restaurant_delivery_time_max || o.restaurant_delivery_time_min,
    // Restaurant-specific product snapshots
    restaurant_item_image_snapshot: o.restaurant_item_image || o.restaurant_item_thumbnail || null,
    restaurant_item_gallery_snapshot: o.gallery_images || [],
    restaurant_item_name_snapshot: o.restaurant_item_name || o.restaurant_product_name || null,
    restaurant_item_description_snapshot: o.restaurant_item_description || o.customer_visible_description || null,
    restaurant_item_full_description_snapshot: o.full_description_ar || null,
    ingredients_snapshot: o.ingredients_ar || null,
    included_items_snapshot: o.included_items || null,
    portion_snapshot: o.portion_description_ar || null,
    packaging_snapshot: o.packaging_description_ar || null,
    allergens_snapshot: o.allergens_ar || null,
    dietary_labels_snapshot: o.dietary_labels || [],
    restaurant_price_snapshot: o.price,
    mapped_tamam_product_id_snapshot: o.mapped_tamam_product_id || o.mapped_tamam_product_id || item?.id,
    selected_tier_snapshot: o.mapped_tier || null,
    price_checked_at: now,
    availability_checked_at: now,
    restaurant_price_updated_at: now,
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null); // primary source restaurant (for upsell / legacy display)
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false); // brief loading state while a restaurant switch settles
  const resolving = useRef(new Set());

  const addItem = useCallback((item, restaurant_info) => {
    const key = JSON.stringify(item.extras || []);
    const existing = items.find((i) => i.id === item.id && JSON.stringify(i.extras || []) === key);
    const targetCartId = existing ? existing.cartId : Date.now() + Math.floor(Math.random() * 1000);

    setItems((prev) => {
      const ex = prev.find((i) => i.id === item.id && JSON.stringify(i.extras || []) === key);
      if (ex) {
        return prev.map((i) => (i.cartId === ex.cartId ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i));
      }
      return [...prev, { ...item, cartId: targetCartId, quantity: item.quantity || 1 }];
    });

    if (!restaurant && restaurant_info) setRestaurant(restaurant_info);

    // Async resolve a default fulfillment restaurant offer for this meal (does not block the add).
    if (!existing?.selected_restaurant_id && !resolving.current.has(targetCartId)) {
      resolving.current.add(targetCartId);
      const existingRestaurantIds = items
        .filter((i) => i.selected_restaurant_id && i.cartId !== targetCartId)
        .map((i) => i.selected_restaurant_id);
      getOffersForMeal(item.id)
        .then((offers) => {
          const pick = pickDefaultOffer(offers, existingRestaurantIds);
          if (pick) {
            setItems((prev) => prev.map((i) => (i.cartId === targetCartId && !i.selected_restaurant_id ? applyOffer(i, pick) : i)));
          }
        })
        .catch(() => {})
        .finally(() => resolving.current.delete(targetCartId));
    }
  }, [restaurant, items]);

  // Manually switch the fulfillment restaurant for one cart item.
  // Replaces ALL restaurant-specific snapshots together (image, title, description,
  // ingredients, price, restaurant info) in one transaction — never only the price.
  const setItemRestaurant = useCallback((cartId, offer) => {
    setSwitching(true);
    setItems((prev) => prev.map((i) => (i.cartId === cartId ? applyOffer(i, offer) : i)));
    // Brief loading state so the UI can animate the content transition together.
    setTimeout(() => setSwitching(false), 350);
  }, []);

  const removeItem = useCallback((cartId) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.cartId !== cartId);
      if (next.length === 0) setRestaurant(null);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((cartId, quantity) => {
    if (quantity <= 0) { removeItem(cartId); return; }
    setItems((prev) => prev.map((i) => (i.cartId === cartId ? { ...i, quantity } : i)));
  }, [removeItem]);

  const clearCart = useCallback(() => { setItems([]); setRestaurant(null); }, []);

  // Checkout fallback: when a UnifiedOffer is expired/sold_out at checkout and
  // the customer accepts the normal price, strip the offer metadata and reprice
  // the item so the order proceeds as a NORMAL purchase (no offer, no quota).
  const overrideItemToNormal = useCallback((cartId, normalPrice) => {
    setItems((prev) => prev.map((i) => (i.cartId === cartId ? {
      ...i,
      price: normalPrice,
      unified_offer_source: null,
      unified_offer_id: null,
      campaign_id: null,
    } : i)));
  }, []);

  const restaurantTotals = useMemo(() => computeCartTotals(items, restaurant), [items, restaurant]);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = restaurantTotals.products_subtotal;
  const deliveryFee = restaurantTotals.delivery_total;
  const total = restaurantTotals.total;

  return (
    <CartContext.Provider value={{
      items, restaurant, isOpen, setIsOpen,
      addItem, removeItem, updateQuantity, clearCart,
      setItemRestaurant, overrideItemToNormal, restaurantTotals, switching,
      totalItems, subtotal, deliveryFee, total,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};