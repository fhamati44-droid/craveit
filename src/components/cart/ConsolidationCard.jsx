import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { resolvePublicMedia, handleImageError } from '@/lib/imageUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Smart consolidation card — shown only when a real saving exists from consolidating
 * items currently spread across multiple restaurants into fewer deliveries.
 * `opportunity` comes from findConsolidation() (real data, no hard-coded samples).
 */
export default function ConsolidationCard({ opportunity, loading, onAccept }) {
  const [confirm, setConfirm] = useState(false);

  if (loading && !opportunity) return null;
  if (!opportunity) return null;

  const { targetName, movedCount, totalCount, currentTotal, newTotal, saving, changes } = opportunity;

  return (
    <>
      <div className="mx-4 mb-4 rounded-2xl bg-surface-container-low p-4 border border-tertiary/30">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="savings" className="text-tertiary text-[20px]" />
          <h3 className="font-bold text-sm">وفر بتجميع الطلب</h3>
        </div>
        <p className="text-label-sm text-on-surface-variant leading-snug mb-3">
          {targetName} يقدر يجهّز {movedCount} من {totalCount} منتجات بتوصيلة وحدة
        </p>
        <div className="flex items-end gap-2 mb-3">
          <div>
            <p className="text-[10px] text-on-surface-variant">الإجمالي الحالي</p>
            <p className="text-sm text-on-surface-variant line-through">₪{Math.round(currentTotal)}</p>
          </div>
          <Icon name="arrow_back" className="text-on-surface-variant text-[18px] mb-1" />
          <div>
            <p className="text-[10px] text-on-surface-variant">بعد التجميع</p>
            <p className="text-lg font-bold text-tertiary">₪{Math.round(newTotal)}</p>
          </div>
          <span className="mr-auto text-[11px] font-bold text-primary bg-primary/15 px-2 py-1 rounded-full">توفير ₪{Math.round(saving)}</span>
        </div>
        <button onClick={() => setConfirm(true)} className="w-full h-11 rounded-full bg-tertiary text-on-tertiary font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          <Icon name="check_circle" className="text-[18px]" /> اعتماد الاقتراح
        </button>
      </div>

      <AnimatePresence>
        {confirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50" onClick={() => setConfirm(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-surface rounded-t-3xl max-h-[80vh] flex flex-col"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
                <h3 className="font-bold text-sm">تأكيد تجميع الطلب</h3>
                <button onClick={() => setConfirm(false)} className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant"><X size={18} /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 flex-1">
                <p className="text-label-sm text-on-surface-variant mb-2">راح تتغير المطاعم للمنتجات التالية:</p>
                {changes.map((c) => (
                  <div key={c.cartId} className="bg-surface-container-low rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">
                      {c.offer?.image_override_url ? <img src={resolvePublicMedia(c.offer.image_override_url)} onError={handleImageError} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">🍽️</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{c.name}</p>
                      <p className="text-[11px] text-on-surface-variant truncate">{c.fromRestaurant} ← {c.toRestaurant}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-on-surface-variant line-through">₪{Math.round(c.oldPrice)}</p>
                      <p className="font-bold text-sm text-primary">₪{Math.round(c.newPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low space-y-2">
                <div className="flex justify-between text-label-sm"><span className="text-on-surface-variant">الإجمالي بعد التحديث</span><span className="font-bold text-tertiary">₪{Math.round(newTotal)}</span></div>
                <button onClick={() => { setConfirm(false); onAccept(); }} className="w-full h-12 rounded-full bg-tertiary text-on-tertiary font-bold flex items-center justify-center gap-1.5">
                  <Check size={18} /> تأكيد وتحديث الطلب
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}