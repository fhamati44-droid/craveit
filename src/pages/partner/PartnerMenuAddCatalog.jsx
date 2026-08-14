import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { fetchAllTamamProducts, searchTamamProducts } from '@/lib/restaurantMenuApi';
import { createMenuSession } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';

export default function PartnerMenuAddCatalog() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [selected, setSelected] = useState(() => new Map());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAllTamamProducts(300)
      .then((list) => alive && setAll(list || []))
      .catch(() => alive && setAll([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    (all || []).forEach((p) => { const c = p.category_name || p.category; if (c) set.add(c); });
    return [...set].sort();
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;
    if (category) list = list.filter((p) => (p.category_name || p.category) === category);
    if (selectedOnly) list = list.filter((p) => selected.has(p.id));
    if (query.trim()) {
      const q = query.trim();
      list = list.filter((p) => (p.name_ar || p.name || '').includes(q) || (p.description || '').includes(q));
    }
    return list;
  }, [all, category, selectedOnly, query, selected]);

  // Live search against Supabase when query is specific
  useEffect(() => {
    if (query.trim().length < 3) return;
    let alive = true;
    const t = setTimeout(() => {
      searchTamamProducts(query.trim()).then((res) => { if (alive) setAll((prev) => mergeUnique(res, prev)); }).catch(() => {});
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  const toggle = (p) => setSelected((prev) => {
    const m = new Map(prev);
    if (m.has(p.id)) m.delete(p.id); else m.set(p.id, p);
    return m;
  });

  const goReview = async () => {
    if (!selected.size || !rid) return;
    setCreating(true);
    try {
      const { session_id } = await createMenuSession(rid, { source_type: 'tamam_master_catalog' });
      navigate('/partner/menu/add/review', { state: { session_id, source_type: 'tamam_master_catalog', selected: [...selected.values()] } });
    } catch { setCreating(false); }
  };

  return (
    <div className="pb-32" dir="rtl">
      <div className="sticky top-0 z-20 bg-tamam-bg/95 backdrop-blur-xl border-b border-tamam-outline/20 px-3 py-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="w-10 h-10 flex items-center justify-center rounded-xl bg-tamam-surface"><span className="material-symbols-outlined text-tamam-text text-[22px]">arrow_forward</span></button>
        <div className="flex-1"><h1 className="font-bold text-sm text-tamam-text">كتالوج تمام</h1><p className="text-[10px] text-tamam-text-muted">اختار الأصناف القريبة من منيوك، وبعدها عدّلها حسب مطعمك.</p></div>
      </div>

      <div className="px-4 pt-3 sticky top-[64px] z-10 bg-tamam-bg/95 backdrop-blur pb-2">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-tamam-text-muted/60 pointer-events-none text-[20px]">search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن صنف..." className="w-full h-12 pr-10 pl-4 rounded-full bg-tamam-surface-low text-tamam-text placeholder:text-tamam-text-muted/60 focus:outline-none focus:ring-2 focus:ring-tamam-green/40 text-sm" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-2">
          <button onClick={() => { setCategory(''); setSelectedOnly(false); }} className={`shrink-0 h-9 px-3 rounded-full text-xs font-bold ${!category && !selectedOnly ? 'bg-tamam-green-bright text-tamam-ink' : 'bg-tamam-surface text-tamam-text-muted'}`}>الكل</button>
          <button onClick={() => setSelectedOnly((v) => !v)} className={`shrink-0 h-9 px-3 rounded-full text-xs font-bold ${selectedOnly ? 'bg-tamam-green-bright text-tamam-ink' : 'bg-tamam-surface text-tamam-text-muted'}`}>عرض المختار فقط</button>
          {categories.map((c) => (
            <button key={c} onClick={() => { setCategory(c); setSelectedOnly(false); }} className={`shrink-0 h-9 px-3 rounded-full text-xs font-bold whitespace-nowrap ${category === c ? 'bg-tamam-green-bright text-tamam-ink' : 'bg-tamam-surface text-tamam-text-muted'}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-44 skeleton-t rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🍽️" title="ما في أصناف بهالمعايير" subtitle="جرّب كلمة تانية أو غيّر الفلتر." />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((p) => {
              const on = selected.has(p.id);
              const name = p.name_ar || p.name || 'صنف';
              return (
                <div key={p.id} className={`relative bg-tamam-surface-low rounded-2xl border overflow-hidden ${on ? 'border-tamam-green ring-1 ring-tamam-green/40' : 'border-tamam-outline/30'}`}>
                  <div className="h-24 bg-tamam-surface flex items-center justify-center overflow-hidden">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-tamam-text-muted/40 text-[28px]">fastfood</span>}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[12px] font-bold text-tamam-text leading-tight line-clamp-1">{name}</p>
                    <p className="text-[10px] text-tamam-text-muted line-clamp-2 leading-snug mt-0.5">{p.description || p.category_name || ''}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-[9px] bg-tamam-surface-high text-tamam-text-muted px-1.5 py-0.5 rounded">{p.category_name || 'كتالوج'}</span>
                    </div>
                    <button onClick={() => toggle(p)} aria-label={on ? `شيل ${name} من المختار` : `اختار ${name}`} aria-pressed={on}
                      className={`w-full h-11 mt-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 transition-transform active:scale-95 ${on ? 'bg-tamam-green/15 text-tamam-green-bright border border-tamam-green/40' : 'bg-tamam-green text-tamam-ink'}`}>
                      <span className="material-symbols-outlined text-[16px]">{on ? 'check' : 'add'}</span>{on ? 'شيل من المختار' : 'اختار'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-16 inset-x-0 z-30 pointer-events-none">
          <div className="max-w-[430px] mx-auto px-3 flex justify-center">
            <div className="pointer-events-auto bg-tamam-surface-low border border-tamam-outline/40 rounded-2xl shadow-lg flex items-center gap-2 p-2 pr-3">
              <span className="text-[12px] font-bold text-tamam-text">اخترت {selected.size} أصناف</span>
              <button onClick={goReview} disabled={creating} className="h-11 px-4 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">list_alt_check</span>{creating ? 'جاري…' : 'راجع الأصناف المختارة'}
              </button>
              <button onClick={() => setSelected(new Map())} className="h-11 px-3 rounded-xl bg-tamam-surface-high text-tamam-text-muted font-bold text-xs">إلغاء الاختيار</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mergeUnique(a, b) {
  const map = new Map();
  [...(b || []), ...(a || [])].forEach((p) => { if (p && p.id != null && !map.has(p.id)) map.set(p.id, p); });
  return [...map.values()];
}