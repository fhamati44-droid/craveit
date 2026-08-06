import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { getOffersForMeal, pickDefaultOffer, computeCartTotals } from '@/lib/restaurantOfferApi';

const CartContext = createContext(null);

function applyOffer(item, o) {
  return {
    ...item,
    selected_restaurant_id: o.restaurant_id,
    selected_restaurant_offer_id: o.offer_id,
    restaurant_unit_price: o.price,
    restaurant_name_snapshot: o.restaurant_name,
    restaurant_logo_snapshot: o.restaurant_logo,
    restaurant_delivery_fee_snapshot: o.restaurant_delivery_fee,
    restaurant_free_delivery_threshold_snapshot: o.restaurant_free_delivery_threshold,
    restaurant_preparation_time_snapshot: o.preparation_time_override || o.restaurant_delivery_time_max || o.restaurant_delivery_time_min,
    restaurant_price_updated_at: new Date().toISOString(),
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null); // primary source restaurant (for upsell / legacy display)
  const [isOpen, setIsOpen] = useState(false);
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
  const setItemRestaurant = useCallback((cartId, offer) => {
    setItems((prev) => prev.map((i) => (i.cartId === cartId ? applyOffer(i, offer) : i)));
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

  const restaurantTotals = useMemo(() => computeCartTotals(items, restaurant), [items, restaurant]);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = restaurantTotals.products_subtotal;
  const deliveryFee = restaurantTotals.delivery_total;
  const total = restaurantTotals.total;

  return (
    <CartContext.Provider value={{
      items, restaurant, isOpen, setIsOpen,
      addItem, removeItem, updateQuantity, clearCart,
      setItemRestaurant, restaurantTotals,
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