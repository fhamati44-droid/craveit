import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function SuggestionSelector({ selectedIds = [], onChange, multiple = true }) {
  const [sets, setSets] = useState([]);
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.TamamSuggestionSet.list('-sort_order', 200).catch(() => []),
      base44.entities.TamamMood.list('-sort_order', 100).catch(() => []),
    ]).then(([s, m]) => { setSets(s || []); setMoods((m || []).filter((x) => x.is_active)); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter((s) => (s.title_ar || '').toLowerCase().includes(q) || (s.package_level || '').toLowerCase().includes(q));
  }, [sets, query]);

  const moodName = (id) => moods.find((m) => m.id === id)?.name_ar || '';
  const toggle = (id) => {
    if (multiple) onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    else onChange([id]);
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-3 flex items-center justify-between">
        <span className="text-sm font-bold">{selectedIds.length} اقتراح مختار</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
      </button>
      {open && (
        <div className="mt-2 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
          <div className="p-2 border-b border-outline-variant/20">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالعنوان أو المستوى" className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <p className="text-sm text-on-surface-variant p-4 text-center">عم نحمّل...</p>}
            {!loading && !filtered.length && <p className="text-sm text-on-surface-variant p-4 text-center">لا توجد اقتراحات</p>}
            {filtered.map((s) => {
              const sel = selectedIds.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggle(s.id)} className={`w-full flex items-center gap-3 p-2.5 text-right border-b border-outline-variant/10 last:border-0 ${sel ? 'bg-primary/10' : 'hover:bg-surface-container-high'}`}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">{s.hero_image_url ? <img src={s.hero_image_url} alt="" className="w-full h-full object-cover" /> : null}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{s.title_ar || `اقتراح ${s.package_level}`}</p>
                    <p className="text-[11px] text-on-surface-variant">{s.package_level} · {moodName(s.mood_id)} · {s.display_price ? `₪${Math.round(s.display_price)}` : ''}</p>
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