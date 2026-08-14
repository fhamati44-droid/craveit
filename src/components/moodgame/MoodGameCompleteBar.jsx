import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { MIN_MEALS, MAX_MEALS } from '@/lib/moodGameEngine';

export default function MoodGameCompleteBar({ count, canComplete, isFull, onComplete }) {
  const empty = count < MIN_MEALS;

  return (
    <div className="px-3 pb-1.5" dir="rtl">
      <AnimatePresence mode="wait">
        {empty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className="w-full bg-tamam-surface-high/50 text-tamam-text-muted font-bold text-sm py-3 rounded-xl text-center border border-tamam-outline/25 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">restaurant_menu</span>
            اختار وجبة للبدء
          </motion.div>
        ) : isFull ? (
          <motion.div
            key="full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-1.5"
          >
            <div
              className="w-full bg-tamam-gold/15 text-tamam-gold font-bold text-sm py-2 rounded-xl text-center border border-tamam-gold/30"
              style={{ boxShadow: '0 0 14px rgba(234,196,92,0.2)' }}
            >
              هيك المود كامل 🔥
            </div>
            <button
              onClick={onComplete}
              className="w-full bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-tamam-green/40"
              style={{ boxShadow: '0 0 18px rgba(137,219,120,0.3)' }}
            >
              كمّل وسمّي المود <Check size={16} strokeWidth={3} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-1.5"
          >
            <button
              onClick={onComplete}
              className="w-full bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-tamam-green/40"
              style={{ boxShadow: '0 0 16px rgba(137,219,120,0.25)' }}
            >
              خلصت المود ✓
            </button>
            <p className="text-tamam-text-muted text-[10px] text-center font-semibold">
              خلصت؟ أو زيد كمان على مودك ({count}/{MAX_MEALS})
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}