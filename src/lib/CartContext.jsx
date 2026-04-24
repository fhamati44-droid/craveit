import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((item, restaurant_info) => {
    if (restaurant && restaurant.id !== restaurant_info.id) {
      // Different restaurant - clear cart
      setItems([{ ...item, cartId: Date.now() }]);
      setRestaurant(restaurant_info);
      return;
    }
    if (!restaurant) setRestaurant(restaurant_info);
    
    setItems(prev => {
      // Try to find matching item (same id + same extras)
      const key = JSON.stringify(item.extras || []);
      const existing = prev.find(i => i.id === item.id && JSON.stringify(i.extras || []) === key);
      if (existing) {
        return prev.map(i =>
          i.cartId === existing.cartId ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
      }
      return [...prev, { ...item, cartId: Date.now(), quantity: item.quantity || 1 }];
    });
  }, [restaurant]);

  const removeItem = useCallback((cartId) => {
    setItems(prev => {
      const next = prev.filter(i => i.cartId !== cartId);
      if (next.length === 0) setRestaurant(null);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((cartId, quantity) => {
    if (quantity <= 0) {
      removeItem(cartId);
      return;
    }
    setItems(prev => prev.map(i => i.cartId === cartId ? { ...i, quantity } : i));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setRestaurant(null);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => {
    const extrasTotal = (i.extras || []).reduce((s, e) => s + (e.price || 0), 0);
    return sum + (i.price + extrasTotal) * i.quantity;
  }, 0);
  const deliveryFee = restaurant?.delivery_fee || 0;
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider value={{
      items, restaurant, isOpen, setIsOpen,
      addItem, removeItem, updateQuantity, clearCart,
      totalItems, subtotal, deliveryFee, total
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