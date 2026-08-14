import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listMenuItems, updateMenuItem } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import MenuItemSheet from '@/components/partner/MenuItemSheet';

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'available', label: 'متوفر' },
  { key: 'unavailable', label: 'مش متوفر' },
  { key: 'incomplete', label: 'ناقص بيانات' },
];

export default function PartnerMenu() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    listMenuItems(rid, filter).then(setItems).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid, filter]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim();
    return items.filter((i) => (i.name || '').includes(q) || (i.restaurant_sku || '').includes(q));
  }, [items, query]);

  const toggleAvailable = async (item) => {
    setTogglingId(item.id);
    try {
      await updateMenuItem(rid, item.id, { available: !item.available });
      load();
    } catch {} finally { setTogglingId(null); }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-lg">المنيو</h1>
        <button onClick={() => navigate('/partner/menu/import')} className="text-tamam-green-bright text-xs font-bold">استيراد ملف</button>
      </div>

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في المنيو…" className="w-full bg-tamam-surface border border-tamam-outline/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-tamam-green/50 text-right" />

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === f.key ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface text-tamam-text-muted border border-tamam-outline/30'}`}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 skeleton-t rounded-2xl" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title="ما قدرنا نحمّل المنيو" actionLabel="إعادة" onAction={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🍽️" title="ما في أصناف" subtitle="ابدأ بإضافة صنف أو استيراد ملف" actionLabel="إضافة صنف" onAction={() => setCreating(true)} />
      ) : (
        <div className="space-y-2">
          {filtered.map((it) => (
            <div key={it.id} className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-2.5 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-tamam-surface-high flex items-center justify-center overflow-hidden flex-shrink-0">
                {it.primary_image ? <img src={it.primary_image} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">🍽️</span>}
              </div>
              <button onClick={() => setEditing(it)} className="flex-1 min-w-0 text-right">
                <p className="font-bold text-sm truncate">{it.name || 'صنف'}</p>
                <p className="text-[11px] text-tamam-text-muted truncate">{it.restaurant_category_name || ''}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-primary text-xs font-bold" dir="ltr">₪{Math.round(it.price || 0)}</span>
                  {it.mapping_status === 'unmapped' && <span className="text-tamam-gold text-[10px]">ناقص ربط</span>}
                  {it.available === false && <span className="text-error text-[10px]">غير متوفر</span>}
                </div>
              </button>
              <button onClick={() => toggleAvailable(it)} disabled={togglingId === it.id} className={`w-11 h-7 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${it.available ? 'bg-tamam-green justify-end' : 'bg-surface-container-high justify-start'}`}>
                <span className="w-6 h-6 rounded-full bg-tamam-cream flex-shrink-0" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setCreating(true)} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 w-[88%] h-12 bg-tamam-green text-tamam-ink rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-[20px]">add</span> إضافة صنف
      </button>

      <MenuItemSheet open={creating} restaurantId={rid} onClose={() => setCreating(false)} onSaved={load} />
      <MenuItemSheet open={!!editing} restaurantId={rid} item={editing} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  );
}