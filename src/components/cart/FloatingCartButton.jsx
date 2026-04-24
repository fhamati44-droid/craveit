import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

export default function FloatingCartButton() {
  const { totalItems, total, setIsOpen } = useCart();

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed bottom-24 left-4 right-4 z-30"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsOpen(true)}
            className="w-full bg-orange text-white rounded-2xl py-4 px-5 font-bold shadow-orange-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag size={20} />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-white text-orange text-[10px] font-black rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <span>View Cart</span>
            </div>
            <span>₪{total.toFixed(0)}</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}