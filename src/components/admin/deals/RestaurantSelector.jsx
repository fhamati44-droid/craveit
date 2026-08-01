import { useState, useEffect, useMemo } from 'react';
import { fetchRestaurantsForSelect } from '@/lib/groupDealApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function RestaurantSelector({ value, onChange }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchRestaurantsForSelect()
      .then((list) => setRestaurants(list || []))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) =>
      [r.name_ar || r.name, r.city, r.category, r.cuisine].filter(Boolean).some((f) => String(f).toLowerCase().includes(q))
    );
  }, [restaurants, query]);

  const selected = restaurants.find((r) => r.id === value) || null;

  return (
    <div>
      <label className="block text-sm font-bold mb-2">اختيار المطعم</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-3 flex items-center gap-3 text-right"
      >
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0 flex items-center justify-center">
          {selected?.image_url ? (
            <img src={selected.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon name="restaurant" className="text-on-surface-variant" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{selected ? selected.name_ar || selected.name : 'اختار مطعم'}</p>
          <p className="text-[11px] text-on-surface-variant truncate">
            {selected ? [selected.city, selected.category].filter(Boolean).join(' · ') : loading ? 'عم نحمّل...' : 'اضغط للاختيار'}
          </p>
        </div>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
      </button>

      {open && (
        <div className="mt-2 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
          <div className="p-2 border-b border-outline-variant/20">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم أو المدينة أو التصنيف"
              className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 && <p className="text-sm text-on-surface-variant p-4 text-center">لا توجد نتائج</p>}
            {filtered.map((r) => {
              const active = r.active !== false;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onChange(r);
                    setOpen(false);
                    setQuery('');
                  }}
                  disabled={!active}
                  className={`w-full flex items-center gap-3 p-2.5 text-right border-b border-outline-variant/10 last:border-0 ${
                    active ? 'hover:bg-surface-container-high' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                    {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{r.name_ar || r.name}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">
                      {[r.city, r.category].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-primary/15 text-primary' : 'bg-error/15 text-error'}`}>
                    {active ? 'نشط' : 'متوقف'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}