import { useState, useEffect, useMemo } from 'react';
import { fetchMealsForRestaurant } from '@/lib/groupDealApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

// selected: array of draft items { meal_id, meal_name_snapshot, image_snapshot, base_price_snapshot, quantity_included }
export default function MealSelector({ restaurantId, selected, onChange, referencePrice, onReferencePrice }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    fetchMealsForRestaurant(restaurantId)
      .then((cats) => {
        const all = (cats || []).flatMap((c) => (c.items || []).map((it) => ({ ...it, category_name: c.name_ar || c.name })));
        setMeals(all);
      })
      .catch(() => setMeals([]))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter((m) => String(m.name_ar || m.name || '').toLowerCase().includes(q) || String(m.category_name || '').toLowerCase().includes(q));
  }, [meals, query]);

  const toggle = (meal) => {
    const exists = selected.find((s) => s.meal_id === meal.id);
    if (exists) {
      onChange(selected.filter((s) => s.meal_id !== meal.id));
    } else {
      const item = {
        meal_id: meal.id,
        restaurant_id: restaurantId,
        meal_name_snapshot: meal.name_ar || meal.name,
        image_snapshot: meal.image_url || meal.image || '',
        base_price_snapshot: meal.price || 0,
        quantity_included: 1,
      };
      onChange([...selected, item]);
      // default reference price = first meal's base price if unset
      if (!referencePrice && onReferencePrice) onReferencePrice(meal.price || 0);
    }
  };

  const setQty = (mealId, qty) =>
    onChange(selected.map((s) => (s.meal_id === mealId ? { ...s, quantity_included: Math.max(1, qty) } : s)));

  const isOn = (id) => selected.some((s) => s.meal_id === id);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold">اختيار الوجبات</label>
        {selected.length > 0 && <span className="text-[11px] text-primary font-bold">{selected.length} مختار</span>}
      </div>

      {selected.length > 0 && (
        <div className="space-y-2 mb-3">
          {selected.map((s) => (
            <div key={s.meal_id} className="flex items-center gap-3 bg-surface-container border border-primary/20 rounded-xl p-2.5">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                {s.image_snapshot ? <img src={s.image_snapshot} alt="" className="w-full h-full object-cover" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{s.meal_name_snapshot}</p>
                <p className="text-[11px] text-on-surface-variant">السعر الأساسي ₪{Math.round(s.base_price_snapshot || 0)}</p>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-high rounded-lg px-1">
                <button type="button" onClick={() => setQty(s.meal_id, (s.quantity_included || 1) - 1)} className="w-7 h-7 text-primary">−</button>
                <span className="w-6 text-center text-sm font-bold">{s.quantity_included || 1}</span>
                <button type="button" onClick={() => setQty(s.meal_id, (s.quantity_included || 1) + 1)} className="w-7 h-7 text-primary">+</button>
              </div>
              <button type="button" onClick={() => toggle({ id: s.meal_id })} className="text-error">
                <Icon name="delete" className="text-[20px]" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={!restaurantId}
        className="w-full h-11 rounded-xl border border-dashed border-outline-variant/50 text-sm font-semibold text-on-surface-variant disabled:opacity-40 flex items-center justify-center gap-1"
      >
        <Icon name="add_circle" className="text-[18px]" /> {restaurantId ? 'أضف وجبة من قائمة المطعم' : 'اختار مطعم أولًا'}
      </button>

      {open && restaurantId && (
        <div className="mt-2 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
          <div className="p-2 border-b border-outline-variant/20">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن وجبة..."
              className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading && <p className="text-sm text-on-surface-variant p-4 text-center">عم نحمّل وجبات المطعم...</p>}
            {!loading && filtered.length === 0 && <p className="text-sm text-on-surface-variant p-4 text-center">لا توجد وجبات</p>}
            {filtered.map((m) => {
              const on = isOn(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m)}
                  className={`w-full flex items-center gap-3 p-2.5 text-right border-b border-outline-variant/10 last:border-0 ${on ? 'bg-primary/10' : 'hover:bg-surface-container-high'}`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                    {m.image_url ? <img src={m.image_url} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{m.name_ar || m.name}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{m.category_name} · ₪{Math.round(m.price || 0)}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${on ? 'bg-primary text-on-primary' : 'border border-outline-variant/50'}`}>
                    {on && <Icon name="check" className="text-[14px]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}