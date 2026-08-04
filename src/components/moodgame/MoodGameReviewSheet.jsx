import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, ClipboardList } from 'lucide-react';
import { resolvePublicImage } from '@/lib/imageUtils';
import { getTotalPrice, getRestaurantNames, calculateScore } from '@/lib/moodGameEngine';

export default function MoodGameReviewSheet({ open, placedMeals, onClose, onSubmit, submitting, draftSaving, error }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const total = getTotalPrice(placedMeals);
  const restaurants = getRestaurantNames(placedMeals);
  const score = calculateScore(placedMeals);

  const handlePublish = () => {
    if (!title.trim()) return;
    onSubmit({ title_ar: title.trim(), description_ar: description.trim() });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 bg-tamam-ink/80 z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-tamam-surface rounded-t-3xl max-h-[88vh] overflow-y-auto pb-safe"
            dir="rtl"
          >
            <div className="sticky top-0 bg-tamam-surface z-10 px-4 py-2 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-tamam-outline/40" />
            </div>

            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tamam-green-bright text-[10px] font-semibold">مراجعة المود</p>
                  <h2 className="text-tamam-text font-bold text-base">لمسة أخيرة!</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-tamam-gold font-bold text-sm">🪙 {score}</span>
                  <button onClick={onClose} className="p-1.5 rounded-full bg-tamam-surface-high text-tamam-text-muted">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <p className="text-tamam-text-muted text-[11px]">قم بتسمية المود الخاص بك ومراجعته قبل النشر.</p>

              {/* Hero preview — circular frame with meal thumbnails */}
              <div className="flex justify-center py-2">
                <div className="relative w-32 h-32 rounded-full border-2 border-tamam-green-bright/50 bg-tamam-surface-low flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(137,219,120,0.2)' }}>
                  {placedMeals.slice(0, 4).map((m, i) => {
                    const angle = (i * 90 - 90) * Math.PI / 180;
                    const r = 40;
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    const img = resolvePublicImage(m.image_url, null);
                    return (
                      <div key={m.id} className="absolute w-9 h-9 rounded-full overflow-hidden border border-tamam-green/40" style={{ left: `calc(50% + ${x}px - 18px)`, top: `calc(50% + ${y}px - 18px)` }}>
                        {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-tamam-surface-high flex items-center justify-center text-xs">🍽️</div>}
                      </div>
                    );
                  })}
                  <span className="text-tamam-gold text-[9px] font-bold">مزاج رائع</span>
                </div>
              </div>

              {/* Form */}
              <div>
                <label className="text-tamam-text text-[11px] font-semibold mb-1 block">اسم المود *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                  placeholder="مثال: ليلة الأبطال، عشاء هادئ..."
                  className="w-full bg-tamam-surface-low text-tamam-text text-sm rounded-lg px-3 py-2.5 border border-tamam-outline/30 focus:outline-none focus:border-tamam-green"
                />
              </div>

              <div>
                <label className="text-tamam-text text-[11px] font-semibold mb-1 block">وصف قصير (اختياري)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                  placeholder="صف الأجواء التي تخلقها هذه الوجبة..."
                  rows={2}
                  className="w-full bg-tamam-surface-low text-tamam-text text-sm rounded-lg px-3 py-2.5 border border-tamam-outline/30 focus:outline-none focus:border-tamam-green resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-tamam-surface-low rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <ClipboardList size={12} className="text-tamam-text-muted" />
                  <span className="text-tamam-text text-[11px] font-bold">ملخص الطلب</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-tamam-text-muted">عدد الأصناف</span>
                  <span className="text-tamam-text font-semibold">{placedMeals.length}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-tamam-text-muted">المطاعم المختارة</span>
                  <span className="text-tamam-text font-semibold truncate max-w-[60%] text-left">{restaurants.join('، ') || '—'}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 border-t border-tamam-outline/20">
                  <span className="text-tamam-text-muted">الإجمالي المقدر</span>
                  <span className="text-tamam-gold font-bold text-sm">₪{Math.round(total)}</span>
                </div>
              </div>

              {error && (
                <div className="bg-tamam-error/15 border border-tamam-error/30 text-tamam-error text-[11px] rounded-lg px-3 py-2 text-center">
                  {error}
                </div>
              )}
              {/* Publish */}
              <button
                onClick={handlePublish}
                disabled={!title.trim() || submitting}
                className="w-full bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
              >
                {submitting ? 'جاري الإرسال...' : <><Rocket size={16} /> انشر المود</>}
              </button>
              <button
                onClick={onClose}
                disabled={submitting}
                className="w-full text-tamam-text-muted text-[11px] underline decoration-dashed"
              >
                {draftSaving ? 'محفوظ كمسودة' : 'حفظ كمسودة والعودة لاحقاً'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}