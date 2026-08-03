import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { resolvePublicImage } from '@/lib/imageUtils';

export default function MealDetailSheet({ meal, open, onClose, onAddToTable, inTable, onRemoveFromTable }) {
  if (!meal) return null;
  const img = resolvePublicImage(meal.image_url, null);
  const hasExtras = meal.has_required_extras === true;

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-tamam-surface rounded-t-3xl max-h-[80vh] overflow-y-auto pb-safe"
            dir="rtl"
          >
            <div className="sticky top-0 bg-tamam-surface z-10 px-4 py-2 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-tamam-outline/40" />
            </div>

            {img && (
              <div className="relative h-40 bg-tamam-surface-low">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full bg-tamam-ink/60 text-white">
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="p-4 space-y-3">
              <div>
                <h2 className="text-tamam-text font-bold text-lg">{meal.name}</h2>
                {meal.restaurant_name && <p className="text-tamam-text-muted text-xs mt-0.5">{meal.restaurant_name}</p>}
                <p className="text-tamam-green-bright font-bold text-lg mt-1">₪{Math.round(meal.price || 0)}</p>
              </div>

              {meal.description && (
                <p className="text-tamam-text-muted text-sm leading-relaxed">{meal.description}</p>
              )}

              {/* Ingredients */}
              <div>
                <h3 className="text-tamam-text font-semibold text-xs mb-1">المكونات</h3>
                <p className="text-tamam-text-muted text-xs">
                  {meal.ingredients || meal.ingredients_ar || 'تفاصيل المكونات غير متوفرة حاليًا'}
                </p>
              </div>

              {/* Customization indicator */}
              {hasExtras && (
                <div className="bg-tamam-teal/20 rounded-lg p-2 text-tamam-cream text-xs">
                  📋 هذا الطبق يحتوي إضافات قابلة للتخصيص
                </div>
              )}

              {/* Actions */}
              {inTable ? (
                <button
                  onClick={onRemoveFromTable}
                  className="w-full bg-tamam-surface-high text-tamam-error font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <X size={16} /> إزالة من الطاولة
                </button>
              ) : (
                <button
                  onClick={onAddToTable}
                  className="w-full bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <ShoppingCart size={16} /> ضيف للطاولة
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}