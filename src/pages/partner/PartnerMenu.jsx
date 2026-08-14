import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listMenuItems, updateMenuItem } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import Toggle from '@/components/partner/Toggle';
import AddMenuSheet from '@/components/partner/menu/AddMenuSheet';

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'available', label: 'متوفر' },
  { key: 'unavailable', label: 'غير متوفر' },
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
  const [togglingId, setTogglingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

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

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((it) => {
      const cat = it.restaurant_category_name || it.category_name_snapshot || 'أخرى';
      (map[cat] ||= []).push(it);
    });
    return Object.entries(map);
  }, [filtered]);

  const toggleAvailable = async (item) => {
    setTogglingId(item.id);
    try { await updateMenuItem(rid, item.id, { available: !item.available }); load(); } catch {} finally { setTogglingId(null); }
  };

  return (
    <div className="pb-28">
      <div className="px-4 pt-4 sticky top-16 z-20 bg-tamam-bg/95 backdrop-blur pb-3">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-tamam-text-muted/60 pointer-events-none text-[20px]">search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن وجبة..." className="w-full h-11 pr-10 pl-4 rounded-full bg-tamam-surface-low text-tamam-text placeholder:text-tamam-text-muted/60 focus:outline-none focus:ring-2 focus:ring-tamam-green/40 text-sm" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-3">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`shrink-0 h-8 px-4 rounded-full text-xs font-bold whitespace-nowrap transition-colors active:scale-95 ${filter === f.key ? (f.key === 'incomplete' ? 'bg-tamam-error/20 text-tamam-error' : 'bg-tamam-green-bright text-tamam-ink') : 'bg-tamam-surface text-tamam-text-muted'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-2 space-y-4">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton-t rounded-2xl" />)}</div>
        ) : error ? (
          <EmptyState icon="⚠️" title="ما قدرنا نحمّل المنيو" actionLabel="إعادة" onAction={load} />
        ) : grouped.length === 0 ? (
          <EmptyState icon="🍽️" title="ما في أصناف" subtitle="ابدأ بإضافة صنف أو استيراد ملف" actionLabel="أضف أصناف" onAction={() => setShowAdd(true)} />
        ) : (
          grouped.map(([cat, list]) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-tamam-text">{cat}</h2>
                <button onClick={() => navigate('/partner/menu/import')} className="text-tamam-green-bright text-xs font-bold flex items-center gap-1">تعديل <span className="material-symbols-outlined text-[16px]">edit</span></button>
              </div>
              <div className="space-y-2">
                {list.map((it) => {
                  const hasImage = !!it.primary_image;
                  const hasDesc = !!(it.customer_visible_description || it.short_description_ar);
                  const incomplete = !hasImage || !hasDesc;
                  return (
                    <div key={it.id} className={`bg-tamam-surface-lowest rounded-2xl p-3 flex gap-3 relative overflow-hidden ${!it.available ? 'opacity-75' : ''} ${filter === 'incomplete' && incomplete ? 'ring-1 ring-tamam-error/30' : ''}`}>
                      <button onClick={() => navigate(`/partner/menu/items/${it.id}`)} className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-tamam-surface flex items-center justify-center">
                        {hasImage ? <img src={it.primary_image} alt="" className={`w-full h-full object-cover ${!it.available ? 'grayscale' : ''}`} /> : <div className="flex flex-col items-center text-tamam-text-muted/50"><span className="material-symbols-outlined text-[24px]">add_a_photo</span></div>}
                      </button>
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <button onClick={() => navigate(`/partner/menu/items/${it.id}`)} className="text-right min-w-0"><h3 className="font-bold text-sm text-tamam-text truncate">{it.name || 'صنف'}</h3></button>
                            <button onClick={() => navigate(`/partner/menu/items/${it.id}`)} className="w-7 h-7 rounded-full bg-tamam-surface flex items-center justify-center text-tamam-text-muted active:scale-90 shrink-0"><span className="material-symbols-outlined text-[16px]">more_vert</span></button>
                          </div>
                          {hasDesc ? (
                            <p className="text-tamam-text-muted text-[11px] line-clamp-2 mt-0.5 leading-snug">{it.customer_visible_description || it.short_description_ar}</p>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-tamam-error mt-1 bg-tamam-error/10 px-2 py-0.5 rounded w-fit"><span className="material-symbols-outlined text-[12px]">warning</span>ناقص بيانات{!hasImage ? ' (صورة)' : ''}</span>
                          )}
                          {it.mapping_status === 'unmapped' && <span className="text-tamam-gold text-[10px] block mt-0.5">بحاجة لربط من TAMAM</span>}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-tamam-green-bright text-base" dir="ltr">{it.price != null ? `${Math.round(it.price)} ₪` : '—'}</span>
                            <span className={`text-[10px] font-bold ${it.available ? 'text-tamam-green-bright' : 'text-tamam-text-muted'}`}>{it.available ? 'متوفر' : 'غير متوفر'}</span>
                          </div>
                          <Toggle checked={!!it.available} onChange={() => toggleAvailable(it)} disabled={togglingId === it.id} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-24 inset-x-0 z-30 pointer-events-none">
        <div className="max-w-[430px] mx-auto px-4 flex justify-start gap-2">
          <button onClick={() => setShowAdd(true)} className="pointer-events-auto h-12 px-5 bg-tamam-green-bright text-tamam-ink rounded-full shadow-lg flex items-center gap-2 font-bold text-sm active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-[20px]">add</span> أضف أصناف
          </button>
          <button onClick={() => navigate('/partner/menu/drafts')} className="pointer-events-auto h-12 px-4 bg-tamam-surface border border-tamam-outline/40 text-tamam-text rounded-full shadow-lg flex items-center gap-1.5 font-bold text-sm active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-[18px]">edit_note</span> المراجعة
          </button>
        </div>
      </div>

      <AddMenuSheet open={showAdd} onClose={() => setShowAdd(false)} onNavigate={(to) => navigate(to)} />
    </div>
  );
}