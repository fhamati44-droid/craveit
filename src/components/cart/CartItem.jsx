import { motion } from 'framer-motion';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

export default function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCart();
  const extrasTotal = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
  const itemPrice = (item.price + extrasTotal) * item.quantity;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{item.name}</p>
          {item.extras && item.extras.length > 0 && (
            <p className="text-white/40 text-xs mt-0.5">
              {item.extras.map(e => e.name).join(', ')}
            </p>
          )}
        </div>
        <span className="text-white font-bold text-sm">₪{itemPrice.toFixed(0)}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Minus size={14} className="text-white/70" />
          </motion.button>
          <span className="text-white font-bold text-sm w-5 text-center">{item.quantity}</span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
            className="w-8 h-8 rounded-full bg-orange flex items-center justify-center"
          >
            <Plus size={14} className="text-white" />
          </motion.button>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => removeItem(item.cartId)}
          className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center"
        >
          <Trash2 size={14} className="text-red-400" />
        </motion.button>
      </div>
    </div>
  );
}