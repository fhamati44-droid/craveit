import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import { getExtraGroups } from '@/lib/api';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function ItemModal({ item, restaurant, onClose, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const [extraGroups, setExtraGroups] = useState([]);
  const [selected, setSelected] = useState({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const groupRefs = useRef({});

  useEffect(() => {
    if (!item) return;
    setQuantity(1); setSelected({}); setNote(''); setError('');
    setLoading(true);
    getExtraGroups(item.id)
      .then(g => setExtraGroups(g || []))
      .catch(() => setExtraGroups([]))
      .finally(() => setLoading(false));
    track('meal_opened', { meal_id: item.id, restaurant_id: restaurant?.id });
  }, [item?.id]);

  const toggle = (groupId, opt, multi) => {
    setError('');
    setSelected(prev => {
      const cur = prev[groupId] || [];
      if (multi) {
        const exists = cur.some(o => o.id === opt.id);
        return { ...prev, [groupId]: exists ? cur.filter(o => o.id !== opt.id) : [...cur, opt] };
      }
      return { ...prev, [groupId]: [opt] };
    });
  };

  const extrasTotal = Object.values(selected).flat().reduce((s, e) => s + (e.price || 0), 0);
  const unitPrice = (item?.price || 0) + extrasTotal;
  const total = unitPrice * quantity;

  const handleAdd = () => {
    const missing = extraGroups.find(g => g.required && !(selected[g.id] || []).length);
    if (missing) {
      setError(`اختار ${missing.group_name || 'الخيار المطلوب'} قبل الإضافة.`);
      const el = groupRefs.current[missing.id];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const extras = Object.values(selected).flat();
    track('meal_customization_completed', { meal_id: item.id });
    track('meal_added_to_cart', { meal_id: item.id, restaurant_id: restaurant?.id, quantity, total });
    onAdd({ ...item, quantity, extras, note, price: item.price });
    onClose();
  };

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-[90]" />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-[90] bg-surface-container-high rounded-t-[28px] max-h-[92vh] overflow-y-auto max-w-[480px] mx-auto"
          >
            <div className="relative h-56 bg-surface-container-highest">
              {item.image_url
                ? <img src={item.image_url} alt={item.name_ar || item.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>}
              <button onClick={onClose} aria-label="إغلاق" className="absolute top-3 left-3 w-9 h-9 rounded-full bg-surface/70 backdrop-blur flex items-center justify-center">
                <X size={18} className="text-on-surface" />
              </button>
            </div>

            <div className="px-5 pt-4">
              <h2 className="text-xl font-bold text-on-surface">{item.name_ar || item.name}</h2>
              {item.description && <p className="text-sm text-on-surface-variant mt-1">{item.description}</p>}
              <p className="text-primary font-bold text-lg mt-2">₪{item.price}</p>
            </div>

            <div className="px-5 py-4 space-y-5">
              {loading && <div className="h-20 skeleton-t rounded-xl" />}
              {extraGroups.map(g => {
                const multi = g.max_select > 1;
                const sel = selected[g.id] || [];
                return (
                  <div key={g.id} ref={el => { groupRefs.current[g.id] = el; }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-on-surface text-sm">{g.group_name}</h3>
                      {g.required && <span className="text-[10px] bg-tertiary/20 text-tertiary px-2 py-0.5 rounded-full font-bold">مطلوب</span>}
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-outline-variant/30">
                      {(g.menu_extra_options || []).map(opt => {
                        const on = sel.some(o => o.id === opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggle(g.id, opt, multi)}
                            className={`w-full flex items-center justify-between px-4 py-3.5 text-right border-b border-outline-variant/20 last:border-0 ${on ? 'bg-primary/10' : 'bg-surface-container'}`}
                          >
                            <div className={`w-5 h-5 ${multi ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center ${on ? 'border-primary bg-primary' : 'border-outline'}`}>
                              {on && <Icon name="check" className="text-on-primary text-[14px]" />}
                            </div>
                            <div className="flex-1 flex justify-between items-center mx-3">
                              <span className="text-on-surface-variant text-sm">{opt.price > 0 ? `+₪${opt.price}` : 'بدون مقابل'}</span>
                              <span className="text-on-surface text-sm font-medium">{opt.name}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div>
                <h3 className="font-bold text-on-surface text-sm mb-2">ملاحظات</h3>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="مثلاً: بدون بصل، صوص زيادة..."
                  className="w-full bg-surface-container rounded-xl p-3 outline-none resize-none text-sm border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant"
                />
              </div>

              {error && <p className="text-error text-sm">{error}</p>}
            </div>

            <div className="sticky bottom-0 bg-surface-container-high px-4 pt-3 pb-4 border-t border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-surface-container rounded-full px-3 py-2 border border-outline-variant/30">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="إنقاص"><Minus size={18} className="text-on-surface" /></button>
                  <span className="text-on-surface font-bold w-5 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} aria-label="زيادة"><Plus size={18} className="text-on-surface" /></button>
                </div>
                <button onClick={handleAdd} className="flex-1 bg-primary text-on-primary rounded-2xl font-bold flex items-center justify-between px-5 py-3.5 active:scale-[0.98] transition-transform">
                  <span>إضافة للسلة</span>
                  <span>₪{Math.round(total)}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}