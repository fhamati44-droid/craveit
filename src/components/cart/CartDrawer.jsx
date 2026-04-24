import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import CartItem from './CartItem';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer() {
  const { isOpen, setIsOpen, items, subtotal, deliveryFee, total, restaurant } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0C0C0F] rounded-t-3xl border-t border-white/10 max-h-[85vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-orange" />
                <span className="text-white font-bold text-lg">Your Order</span>
                {restaurant && <span className="text-white/40 text-sm">• {restaurant.name}</span>}
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X size={16} className="text-white/70" />
              </motion.button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {items.map(item => <CartItem key={item.cartId} item={item} />)}
            </div>

            {/* Summary */}
            <div className="px-5 py-4 border-t border-white/8 space-y-2">
              <div className="flex justify-between text-white/60 text-sm">
                <span>Subtotal</span>
                <span>₪{subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-white/60 text-sm">
                <span>Delivery</span>
                <span className={deliveryFee === 0 ? 'text-green-400' : ''}>
                  {deliveryFee === 0 ? 'Free' : `₪${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/8">
                <span>Total</span>
                <span>₪{total.toFixed(0)}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pb-6 safe-bottom">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCheckout}
                className="w-full bg-orange text-white rounded-2xl py-4 font-bold text-base shadow-orange-lg flex items-center justify-between px-5"
              >
                <span>Continue to Checkout</span>
                <span>₪{total.toFixed(0)}</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}