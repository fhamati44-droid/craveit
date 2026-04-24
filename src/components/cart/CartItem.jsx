import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

export default function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCart();
  const extrasTotal = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
  const itemPrice = (item.price + extrasTotal) * item.quantity;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      {/* Qty controls */}
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-2 py-1.5">
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(item.cartId, item.quantity - 1)}>
          <Minus size={14} className="text-gray-600" />
        </motion.button>
        <span className="text-gray-900 font-bold text-sm w-4 text-center">{item.quantity}</span>
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(item.cartId, item.quantity + 1)}>
          <Plus size={14} className="text-blue" />
        </motion.button>
      </div>

      {/* Item info - RTL */}
      <div className="flex-1 mx-3 text-right">
        <p className="text-gray-900 font-semibold text-sm">{item.name}</p>
        {item.extras && item.extras.length > 0 && (
          <p className="text-gray-400 text-xs mt-0.5">{item.extras.map(e => e.name).join(', ')}</p>
        )}
      </div>

      {/* Price */}
      <span className="text-gray-900 font-bold text-sm">₪{itemPrice.toFixed(0)}</span>
    </div>
  );
}