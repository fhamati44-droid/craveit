import { useState, useEffect, useMemo } from 'react';
import { getMenuItemsByRestaurant } from '@/lib/api';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function MealSelector({ restaurantId, selectedIds = [], onChange, multiple = true }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!restaurantId) { setMeals([]); return; }
    setLoading(true);
    getMenuItemsByRestaurant(restaurantId)
      .then((list) => setMeals(list || []))
      .catch(() => setMeals([]))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter((m) => (m.name_ar || m.name || '').toLowerCase().includes(q));
  }, [meals, query]);

  const toggle = (id) => {
    if (multiple) {
      onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    } else {
      onChange([id]);
    }
  };

  if (!restaurantId) return <p className="text-sm text-on-surface-variant bg-surface-container rounded-xl p-3">اختر مطعم أولًا لعرض الوجبات.</p>;

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-3 flex items-center justify-between">
        <span className="text-sm font-bold">{selectedIds.length} وجبة مختارة</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
      </button>
      {open && (
        <div className="mt-2 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
          <div className="p-2 border-b border-outline-variant/20">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن وجبة" className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <p className="text-sm text-on-surface-variant p-4 text-center">عم نحمّل...</p>}
            {!loading && !filtered.length && <p className="text-sm text-on-surface-variant p-4 text-center">لا توجد وجبات</p>}
            {filtered.map((m) => {
              const sel = selectedIds.includes(m.id);
              const available = m.available !== false;
              return (
                <button key={m.id} type="button" onClick={() => toggle(m.id)} className={`w-full flex items-center gap-3 p-2.5 text-right border-b border-outline-variant/10 last:border-0 ${sel ? 'bg-primary/10' : 'hover:bg-surface-container-high'}`}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">{m.image_url ? <img src={m.image_url} alt="" className="w-full h-full object-cover" /> : null}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{m.name_ar || m.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{m.price ? `₪${Math.round(m.price)}` : ''} · {available ? 'متاح' : 'غير متاح'}</p>
                  </div>
                  {sel && <Icon name="check_circle" className="text-primary text-xl" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}