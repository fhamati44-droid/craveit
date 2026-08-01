import { useState, useEffect } from 'react';
import { getMenuCategories } from '@/lib/api';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function MenuCategorySelector({ restaurantId, value, onChange }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!restaurantId) { setCats([]); return; }
    setLoading(true);
    getMenuCategories(restaurantId)
      .then((list) => setCats(list || []))
      .catch(() => setCats([]))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const selected = cats.find((c) => String(c.id) === String(value)) || null;

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-3 flex items-center justify-between text-right">
        <span className="text-sm font-bold">{selected ? (selected.name_ar || selected.name) : 'اختار تصنيف'}</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
      </button>
      {open && (
        <div className="mt-2 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
          {loading && <p className="text-sm text-on-surface-variant p-4 text-center">عم نحمّل...</p>}
          {!loading && !cats.length && <p className="text-sm text-on-surface-variant p-4 text-center">لا توجد تصنيفات</p>}
          {cats.map((c) => (
            <button key={c.id} type="button" onClick={() => { onChange(c); setOpen(false); }} className={`w-full p-2.5 text-right border-b border-outline-variant/10 last:border-0 ${String(c.id) === String(value) ? 'bg-primary/10' : 'hover:bg-surface-container-high'}`}>
              <p className="font-semibold text-sm">{c.name_ar || c.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}