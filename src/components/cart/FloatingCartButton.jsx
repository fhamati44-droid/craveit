import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';

export default function FloatingCartButton() {
  const { totalItems, total } = useCart();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed bottom-20 left-4 right-4 z-30 max-w-[480px] mx-auto"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/cart')}
            className="w-full bg-tamam-green text-tamam-ink py-4 px-5 text-base rounded-2xl flex items-center justify-between shadow-card-lg font-bold"
          >
            <span className="bg-tamam-ink/20 text-tamam-ink text-sm font-bold px-2 py-0.5 rounded-lg">
              {totalItems}
            </span>
            <span>شوف السلة</span>
            <span>₪{total.toFixed(0)}</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}