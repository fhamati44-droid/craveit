import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 z-50"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85vh] flex flex-col max-w-lg mx-auto shadow-card-lg"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header - RTL */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 rtl-text" dir="rtl">
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={16} className="text-gray-600" />
              </button>
              <h2 className="font-bold text-gray-900 text-lg">
                {restaurant?.name || 'ההזמנה שלי'}
              </h2>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" dir="rtl">
              {items.map(item => <CartItem key={item.cartId} item={item} />)}
            </div>

            {/* Summary */}
            <div className="px-5 py-3 border-t border-gray-100 space-y-1.5 rtl-text" dir="rtl">
              <div className="flex justify-between text-gray-500 text-sm">
                <span>₪{subtotal.toFixed(0)}</span>
                <span>סכום ביניים</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm">
                <span className={deliveryFee === 0 ? 'text-green-600 font-semibold' : ''}>
                  {deliveryFee === 0 ? 'חינם' : `₪${deliveryFee}`}
                </span>
                <span>משלוח</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-lg pt-1 border-t border-gray-100">
                <span>₪{total.toFixed(0)}</span>
                <span>סה"כ</span>
              </div>
            </div>

            {/* CTA - Green like HAAT/Sala */}
            <div className="px-4 pb-6 pt-2 safe-bottom">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCheckout}
                className="w-full btn-green py-4 text-lg rounded-2xl flex items-center justify-between px-5"
              >
                <span>₪{total.toFixed(0)}</span>
                <span>הצג את ההזמנה</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}