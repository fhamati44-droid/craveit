import { useState, useEffect, useMemo } from 'react';
import { listPublicDeals } from '@/lib/groupDealApi';
import { base44 } from '@/api/base44Client';
import { STATUS_LABELS } from '@/lib/groupDealApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function GroupDealSelector({ selectedIds = [], onChange, multiple = false, statusFilter }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    base44.entities.GroupDeal.list('-updated_date', 200)
      .then((list) => setDeals(list || []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = deals;
    if (statusFilter) list = list.filter((d) => d.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((d) => (d.title || '').toLowerCase().includes(q) || (d.restaurant_name_snapshot || '').toLowerCase().includes(q));
    return list;
  }, [deals, query, statusFilter]);

  const toggle = (id) => {
    if (multiple) onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    else onChange(selectedIds[0] === id ? [] : [id]);
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-3 flex items-center justify-between">
        <span className="text-sm font-bold">{selectedIds.length} عرض مختار</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
      </button>
      {open && (
        <div className="mt-2 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
          <div className="p-2 border-b border-outline-variant/20">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالعنوان أو المطعم" className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <p className="text-sm text-on-surface-variant p-4 text-center">عم نحمّل...</p>}
            {!loading && !filtered.length && <p className="text-sm text-on-surface-variant p-4 text-center">لا توجد عروض</p>}
            {filtered.map((d) => {
              const sel = selectedIds.includes(d.id);
              return (
                <button key={d.id} type="button" onClick={() => toggle(d.id)} className={`w-full flex items-center gap-3 p-2.5 text-right border-b border-outline-variant/10 last:border-0 ${sel ? 'bg-primary/10' : 'hover:bg-surface-container-high'}`}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">{d.hero_image ? <img src={d.hero_image} alt="" className="w-full h-full object-cover" /> : null}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{d.title}</p>
                    <p className="text-[11px] text-on-surface-variant">{d.restaurant_name_snapshot} · {STATUS_LABELS[d.status] || d.status} · ₪{Math.round(d.reference_price || 0)}</p>
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