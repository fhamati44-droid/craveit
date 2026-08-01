import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function FoodCategorySelector({ selectedIds = [], onChange, multiple = true }) {
  const [allCats, setAllCats] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.functions.invoke('supabaseProxy', { action: 'getAllMenuCategories' }).then((r) => r?.data?.data || []).catch(() => []),
      base44.functions.invoke('supabaseProxy', { action: 'getRestaurants' }).then((r) => r?.data?.data || []).catch(() => []),
    ]).then(([cats, rests]) => { setAllCats(cats); setRestaurants(rests); })
      .finally(() => setLoading(false));
  }, []);

  // Build distinct category list with restaurant counts
  const categoryList = useMemo(() => {
    const counts = {};
    (allCats || []).forEach((c) => {
      const name = (c.name_ar || c.name || '').trim();
      if (!name) return;
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([label, count]) => ({ id: label, label, count })).sort((a, b) => b.count - a.count);
  }, [allCats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categoryList;
    return categoryList.filter((c) => c.label.toLowerCase().includes(q));
  }, [categoryList, query]);

  const toggle = (id) => {
    if (multiple) onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    else onChange([id]);
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-3 flex items-center justify-between">
        <span className="text-sm font-bold">{selectedIds.length} تصنيف مختار</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
      </button>
      {open && (
        <div className="mt-2 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
          <div className="p-2 border-b border-outline-variant/20">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن تصنيف" className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <p className="text-sm text-on-surface-variant p-4 text-center">عم نحمّل...</p>}
            {!loading && !filtered.length && <p className="text-sm text-on-surface-variant p-4 text-center">لا توجد تصنيفات</p>}
            {filtered.map((c) => {
              const sel = selectedIds.includes(c.id);
              return (
                <button key={c.id} type="button" onClick={() => toggle(c.id)} className={`w-full flex items-center gap-3 p-2.5 text-right border-b border-outline-variant/10 last:border-0 ${sel ? 'bg-primary/10' : 'hover:bg-surface-container-high'}`}>
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0"><Icon name="restaurant" className="text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.label}</p>
                    <p className="text-[11px] text-on-surface-variant">{c.count} مطاعم</p>
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