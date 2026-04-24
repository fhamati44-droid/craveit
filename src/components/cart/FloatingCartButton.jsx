import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/CartContext';

export default function FloatingCartButton() {
  const { totalItems, total, setIsOpen } = useCart();

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed bottom-20 left-4 right-4 z-30 max-w-lg mx-auto"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsOpen(true)}
            className="w-full btn-green py-4 px-5 text-base rounded-2xl flex items-center justify-between shadow-card-lg"
          >
            <span className="bg-green-dark/30 text-white text-sm font-bold px-2 py-0.5 rounded-lg">
              {totalItems}
            </span>
            <span className="font-bold">הצג את הזמנתך</span>
            <span className="font-bold">₪{total.toFixed(0)}</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}