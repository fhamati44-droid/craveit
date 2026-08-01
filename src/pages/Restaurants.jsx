import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getRestaurants, getDeals, getAllMenuCategories } from '@/lib/api';
import { track } from '@/lib/analytics';
import { isFavorite, toggleFavorite } from '@/lib/favorites';
import RestaurantListCard from '@/components/tamam/customer/RestaurantListCard';
import { SkeletonCard, EmptyState, ErrorState } from '@/components/tamam/customer/States';

const QUICK = [
  { id: 'open', label: 'مفتوح هسا', icon: 'local_fire_department' },
  { id: 'fastest', label: 'الأسرع', icon: 'bolt' },
  { id: 'offers', label: 'عليها عروض', icon: 'local_offer' },
];
const SORTS = [
  { id: 'recommended', label: 'الأنسب' },
  { id: 'fastest', label: 'الأسرع (رسوم توصيل أقل)' },
];
const PAGE = 12;

export default function Restaurants() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [all, setAll] = useState([]);
  const [catMap, setCatMap] = useState({});
  const [categories, setCategories] = useState([]);
  const [dealIds, setDealIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const open = params.get('open') === '1';
  const fastest = params.get('fastest') === '1';
  const offers = params.get('offers') === '1';
  const sort = params.get('sort') || 'recommended';
  const [qInput, setQInput] = useState(q);
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => { track('restaurants_page_viewed', {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);
  useEffect(() => {
    setParams(prev => {
      const n = new URLSearchParams(prev);
      if (!debouncedQ) n.delete('q'); else n.set('q', debouncedQ);
      return n;
    }, { replace: true });
  }, [debouncedQ, setParams]);

  const load = () => {
    setLoading(true); setError(false);
    Promise.all([getRestaurants(), getAllMenuCategories(), getDeals()])
      .then(([rests, cats, deals]) => {
        setAll(rests || []);
        const map = {};
        (cats || []).forEach(c => {
          const name = (c.name_ar || c.name || '').trim();
          if (!name) return;
          if (!map[c.restaurant_id]) map[c.restaurant_id] = new Set();
          map[c.restaurant_id].add(name);
        });
        setCatMap(map);
        const counts = {};
        Object.values(map).forEach(set => set.forEach(n => { counts[n] = (counts[n] || 0) + 1; }));
        setCategories(Object.entries(counts).map(([label, count]) => ({ value: label, label, count })).sort((a, b) => b.count - a.count).slice(0, 12));
        setDealIds(new Set((deals || []).map(d => d.restaurant_id).filter(Boolean)));
      })
      .catch(e => { console.error(e); setError(true); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const setParam = useCallback((key, value) => {
    setParams(prev => {
      const n = new URLSearchParams(prev);
      if (!value || value === '') n.delete(key); else n.set(key, value);
      return n;
    });
    setVisible(PAGE);
  }, [setParams]);

  const toggleQuick = (id) => {
    const cur = id === 'open' ? open : id === 'fastest' ? fastest : offers;
    setParam(id, cur ? '' : '1');
    track('restaurant_filter_selected', { filter: id });
  };

  useEffect(() => { if (category) track('restaurant_category_selected', { category }); }, [category]);
  useEffect(() => { if (q) track('restaurant_search_used', { query: q }); }, [q]);

  const filtered = useMemo(() => {
    const ql = debouncedQ.trim().toLowerCase();
    let list = all.filter(r => {
      const name = (r.name_ar || r.name || '').toLowerCase();
      const desc = (r.description || r.description_ar || '').toLowerCase();
      if (ql && !name.includes(ql) && !desc.includes(ql)) return false;
      if (open && !r.active) return false;
      if (offers && !dealIds.has(r.id)) return false;
      if (category) {
        const set = catMap[r.id];
        if (!set || !set.has(category)) return false;
      }
      return true;
    });
    if (fastest || sort === 'fastest') list = [...list].sort((a, b) => (a.delivery_fee ?? 9999) - (b.delivery_fee ?? 9999));
    return list;
  }, [all, debouncedQ, open, offers, fastest, category, catMap, dealIds, sort]);

  const list = filtered.slice(0, visible);

  const onOpenCard = (r) => { track('restaurant_card_opened', { restaurant_id: r.id }); navigate(`/restaurants/${r.id}`); };
  const onToggleFav = (r) => { const added = toggleFavorite(r.id); track('restaurant_favorited', { restaurant_id: r.id, added }); setAll(prev => [...prev]); };

  if (error) return <ErrorState title="ما قدرنا نحمّل المطاعم." onRetry={load} />;

  return (
    <div className="pb-10">
      <div className="px-4 pt-4 mb-3">
        <h1 className="text-headline-lg font-bold text-on-surface">المطاعم</h1>
        <p className="text-body-md text-on-surface-variant">اختار المطعم وشوف كل وجباته.</p>
      </div>

      <div className="px-4 mb-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute inset-y-0 right-4 flex items-center text-on-surface-variant pointer-events-none">search</span>
          <input
            value={qInput}
            onChange={e => setQInput(e.target.value)}
            placeholder="دوّر على مطعم أو نوع أكل..."
            aria-label="بحث المطاعم"
            className="w-full h-14 bg-surface-container border border-outline-variant rounded-xl pr-12 pl-10 text-on-surface focus:border-primary focus:outline-none"
          />
          {qInput && (
            <button onClick={() => setQInput('')} aria-label="مسح البحث" className="absolute inset-y-0 left-4 flex items-center text-on-surface-variant">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1 mb-2">
          <button onClick={() => setParam('category', '')} className={`flex-none px-4 py-2 rounded-xl text-sm font-semibold ${!category ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface border border-outline-variant'}`}>الكل</button>
          {categories.map(c => (
            <button key={c.value} onClick={() => setParam('category', c.value)} className={`flex-none px-4 py-2 rounded-xl text-sm font-semibold ${category === c.value ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface border border-outline-variant'}`}>{c.label}</button>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mb-4">
        <button onClick={() => setShowSort(true)} className="flex-none flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container-high text-on-surface border border-outline-variant">
          <span className="material-symbols-outlined text-[16px]">tune</span> فلترة
        </button>
        {QUICK.map(f => {
          const active = f.id === 'open' ? open : f.id === 'fastest' ? fastest : offers;
          return (
            <button key={f.id} onClick={() => toggleQuick(f.id)} className={`flex-none flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold ${active ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface border border-outline-variant'}`}>
              <span className="material-symbols-outlined text-[16px]">{f.icon}</span> {f.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-on-surface">كل المطاعم</h2>
        <span className="text-xs text-on-surface-variant">{loading ? '…' : `${filtered.length} مطعم`}</span>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : list.length ? (
          list.map(r => (
            <RestaurantListCard key={r.id} r={r} hasOffer={dealIds.has(r.id)} isFav={isFavorite(r.id)} onToggleFav={() => onToggleFav(r)} onOpen={() => onOpenCard(r)} />
          ))
        ) : (
          <EmptyState icon="🍽️" title="ما لقينا مطاعم مطابقة." subtitle="جرّب تغيّر البحث أو الفلاتر" actionLabel="امسح البحث" onAction={() => { setQInput(''); setParams({}); }} />
        )}
        {!loading && filtered.length > visible && (
          <div className="flex justify-center py-4">
            <button onClick={() => setVisible(v => v + PAGE)} className="text-primary font-bold underline">عرض المزيد</button>
          </div>
        )}
      </div>

      {showSort && (
        <div className="fixed inset-0 z-[100]" onClick={() => setShowSort(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-0 inset-x-0 bg-surface-container-high rounded-t-[28px] p-6 max-w-[480px] mx-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold mb-4">ترتيب</h3>
            <div className="space-y-2 mb-6">
              {SORTS.map(s => (
                <button key={s.id} onClick={() => { setParam('sort', s.id === 'recommended' ? '' : s.id); setShowSort(false); }}
                  className={`w-full text-right px-4 py-3 rounded-xl border ${sort === s.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30 text-on-surface'}`}>{s.label}</button>
              ))}
            </div>
            <button onClick={() => setShowSort(false)} className="w-full h-12 bg-primary text-on-primary rounded-2xl font-bold">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}