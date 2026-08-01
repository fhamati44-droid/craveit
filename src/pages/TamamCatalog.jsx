import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getActiveMoods, getItemsForSets, trackEvent } from '@/lib/tamamApi';
import { moodIconFor } from '@/lib/moodIcons';
import { normalizePackage, PACKAGE_LABEL, PACKAGES } from '@/lib/packageUtils';
import { useCart } from '@/lib/CartContext';
import SuggestionListCard from '@/components/tamam/customer/SuggestionListCard';
import FilterSheet from '@/components/tamam/customer/FilterSheet';
import { SkeletonCard, EmptyState, ErrorState } from '@/components/tamam/customer/States';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const PAGE_SIZE = 12;
const SORTS = [
  { value: 'recommended', label: 'الأنسب' },
  { value: 'price_asc', label: 'السعر الأقل' },
  { value: 'price_desc', label: 'السعر الأعلى' },
  { value: 'popular', label: 'الأكثر طلبًا' },
  { value: 'fastest', label: 'الأسرع' },
  { value: 'newest', label: 'الأحدث' },
];
const PEOPLE = [
  { value: '', label: 'الكل' },
  { value: '1', label: 'شخص واحد' },
  { value: '2', label: '2 أشخاص' },
  { value: '3-4', label: '3–4 أشخاص' },
  { value: '5-6', label: '5–6 أشخاص' },
  { value: '7+', label: '7+ أشخاص' },
];
const PRICE_RANGES = [
  { value: '', label: 'كل الأسعار', min: null, max: null },
  { value: '0-50', label: 'حتى ₪50', min: 0, max: 50 },
  { value: '50-100', label: '₪50 – ₪100', min: 50, max: 100 },
  { value: '100-150', label: '₪100 – ₪150', min: 100, max: 150 },
  { value: '150+', label: '₪150 فأكثر', min: 150, max: null },
];

async function proxy(action, payload) {
  const res = await base44.functions.invoke('supabaseProxy', { action, payload });
  return res?.data?.data ?? res?.data ?? res ?? [];
}

export default function TamamCatalog() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem, totalItems, subtotal } = useCart();

  const pkg = normalizePackage(params.get('package'));
  const moodId = params.get('mood') || '';
  const people = params.get('people') || '';
  const priceRange = params.get('price') || '';
  const foodType = params.get('food') || '';
  const sort = params.get('sort') || 'recommended';
  const [q, setQ] = useState(params.get('q') || '');
  const [debouncedQ, setDebouncedQ] = useState(q);

  const [moods, setMoods] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [foodTypes, setFoodTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [sheet, setSheet] = useState(null); // 'people' | 'price' | 'food' | 'sort' | 'moods'
  const [replace, setReplace] = useState({}); // originalId -> replacementId

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const setParam = useCallback((key, value) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (!value || value === '') next.delete(key); else next.set(key, value);
      return next;
    });
    setVisible(PAGE_SIZE);
  }, [setParams]);

  // keep debounced search in the URL (shareable, survives refresh) without per-keystroke navigation
  useEffect(() => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (!debouncedQ) next.delete('q'); else next.set('q', debouncedQ);
      return next;
    }, { replace: true });
  }, [debouncedQ, setParams]);

  // Load everything once
  useEffect(() => {
    (async () => {
      setLoading(true); setError(false);
      try {
        const [moodList, allSets] = await Promise.all([
          getActiveMoods(),
          base44.entities.TamamSuggestionSet.list('sort_order', 200).then(l => (l || []).filter(s => s.is_active)),
        ]);
        setMoods(moodList || []);
        const moodMap = {}; (moodList || []).forEach(m => { moodMap[m.id] = m; });
        const setIds = (allSets || []).map(s => s.id);
        const items = setIds.length ? await getItemsForSets(setIds) : [];
        const itemsBySet = {}; items.forEach(i => { (itemsBySet[i.suggestion_set_id] ||= []).push(i); });

        const mealIds = [...new Set(items.map(i => i.meal_id).filter(Boolean))];
        const restIds = [...new Set(items.map(i => i.restaurant_id).filter(Boolean))];
        const [mealsList, restsList] = await Promise.all([
          mealIds.length ? proxy('getMenuItemsByIds', { ids: mealIds }) : [],
          restIds.length ? proxy('getRestaurantsByIds', { ids: restIds }) : [],
        ]);
        const mealMap = {}; (mealsList || []).forEach(m => { mealMap[m.id] = m; });
        const restMap = {}; (restsList || []).forEach(r => { restMap[r.id] = r; });

        // categories per restaurant
        const catResults = await Promise.all(restIds.map(rid => proxy('getMenuCategories', { restaurantId: rid }).catch(() => [])));
        const catMap = {};
        restIds.forEach((rid, i) => (catResults[i] || []).forEach(c => { catMap[c.id] = c; }));

        const allFoodTypes = new Set();
        const enriched = (allSets || []).map(s => {
          const sItems = itemsBySet[s.id] || [];
          const meals = sItems.map(it => mealMap[it.meal_id]).filter(Boolean);
          const mealNames = meals.map(m => m.name).filter(Boolean);
          const restIdsForSet = [...new Set(sItems.map(i => i.restaurant_id).filter(Boolean))];
          const rests = restIdsForSet.map(id => restMap[id]).filter(Boolean);
          const multi = restIdsForSet.length > 1;
          const sourceName = multi ? 'TAMAM · متعدد المصادر' : (rests[0]?.name || 'TAMAM');
          const prep = rests[0]?.delivery_time ? `${rests[0].delivery_time} دقيقة` : '30–40 دقيقة';
          const foodCats = [...new Set(meals.map(m => catMap[m.category_id]?.name).filter(Boolean))];
          foodCats.forEach(c => allFoodTypes.add(c));
          const itemQty = sItems.reduce((sum, it) => sum + Number(it.quantity || 1), 0);
          const peopleCount = s.people_count != null ? Number(s.people_count) : (itemQty || null);
          const computedPrice = meals.reduce((sum, m, i) => sum + Number(m.price || 0) * Number(sItems[i]?.quantity || 1), 0);
          return {
            ...s,
            package_level: normalizePackage(s.package_level),
            mood: moodMap[s.mood_id] || null,
            items: sItems,
            mealNames,
            meals,
            sourceName,
            multiSource: multi,
            prepEstimate: prep,
            foodCats,
            peopleCount,
            display_price: s.display_price != null ? Number(s.display_price) : computedPrice,
            isAvailable: sItems.length > 0,
            isRecommended: s.package_level === 'mix',
          };
        });
        setFoodTypes([...allFoodTypes].sort());
        setSuggestions(enriched);
      } catch (e) { console.error(e); setError(true); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = suggestions.slice();
    if (pkg !== 'all') list = list.filter(s => s.package_level === pkg);
    if (moodId) list = list.filter(s => s.mood?.id === moodId);
    if (people) {
      list = list.filter(s => {
        if (s.peopleCount == null) return false;
        if (people === '7+') return s.peopleCount >= 7;
        if (people === '1') return s.peopleCount === 1;
        if (people === '2') return s.peopleCount === 2;
        if (people === '3-4') return s.peopleCount >= 3 && s.peopleCount <= 4;
        if (people === '5-6') return s.peopleCount >= 5 && s.peopleCount <= 6;
        return true;
      });
    }
    if (priceRange) {
      const r = PRICE_RANGES.find(p => p.value === priceRange);
      if (r) list = list.filter(s => (r.min == null || s.display_price >= r.min) && (r.max == null || s.display_price <= r.max));
    }
    if (foodType) list = list.filter(s => s.foodCats.includes(foodType));
    if (debouncedQ.trim()) {
      const needle = debouncedQ.trim().toLowerCase();
      list = list.filter(s => {
        const hay = [s.title_ar, s.description_ar, s.mood?.name_ar, PACKAGE_LABEL[s.package_level], s.sourceName, ...(s.mealNames || []), ...(s.foodCats || [])].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(needle);
      });
    }
    switch (sort) {
      case 'price_asc': list.sort((a, b) => a.display_price - b.display_price); break;
      case 'price_desc': list.sort((a, b) => b.display_price - a.display_price); break;
      case 'popular': list.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0)); break;
      case 'fastest': list.sort((a, b) => parseInt(a.prepEstimate) - parseInt(b.prepEstimate)); break;
      case 'newest': list.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)); break;
      default: list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return list;
  }, [suggestions, pkg, moodId, people, priceRange, foodType, debouncedQ, sort]);

  const shown = filtered.slice(0, visible);

  const chooseSuggestion = (s) => {
    const needsCustom = !s.items.length || s.items.some(i => i.is_required === false);
    if (needsCustom) { navigate(`/tamam-order/${s.id}`); return false; }
    trackEvent({ action: 'package_selected', suggestion_set_id: s.id, package_level: s.package_level, source: 'catalog' });
    addItem({
      id: `tamam_suggestion_${s.id}`,
      name: s.title_ar || 'اقتراح TAMAM',
      price: Number(s.display_price) || 0,
      quantity: 1,
      image_url: s.hero_image_url,
      extras: [],
      suggestion_id: s.id,
      package: s.package_level,
      included: s.mealNames,
      source: s.sourceName,
    }, { id: 'tamam', name: 'TAMAM', delivery_fee: 0, delivery_time: 30, image_url: s.hero_image_url });
    return true;
  };

  const findSimilar = (s) => {
    const pool = filtered.filter(o => o.id !== s.id && o.id !== replace[s.id]);
    if (!pool.length) return null;
    const score = o => Math.abs(o.display_price - s.display_price) + (o.package_level === s.package_level ? 0 : 1000) + (o.mood?.id === s.mood?.id ? 0 : 500);
    return pool.sort((a, b) => score(a) - score(b))[0];
  };
  const onSimilar = (s) => {
    const sim = findSimilar(s);
    if (sim) { setReplace(p => ({ ...p, [s.id]: sim.id })); trackEvent({ action: 'suggestion_refreshed', suggestion_set_id: sim.id, source: 'similar' }); }
  };
  const displayFor = (s) => {
    const rid = replace[s.id];
    return rid ? suggestions.find(o => o.id === rid) || s : s;
  };

  const activeSortLabel = SORTS.find(o => o.value === sort)?.label || 'الأنسب';

  return (
    <div className={`flex flex-col ${totalItems > 0 ? 'pb-48' : 'pb-28'}`}>
      {/* Hero */}
      <section className="px-4 pt-4 pb-5">
        <div className="flex items-center gap-1 mb-1"><Icon name="auto_awesome" className="text-primary text-[18px]" /><span className="text-primary text-sm font-semibold">اقتراحات TAMAM</span></div>
        <h1 className="text-headline-lg-mobile font-bold mb-1">كل الاقتراحات قدامك</h1>
        <p className="text-on-surface-variant text-sm">اختار حسب مودك، ميزانيتك، وعدد الأشخاص.</p>
      </section>

      {/* Search */}
      <div className="px-4 mb-5">
        <div className="relative">
          <input value={q} onChange={e => setQ(e.target.value)} className="w-full bg-surface-container-high text-on-surface py-4 pr-12 pl-10 rounded-xl border border-outline-variant focus:border-primary focus:outline-none transition-all placeholder:text-on-surface-variant/50" placeholder="دوّر على اقتراح أو نوع أكل..." type="text" />
          <Icon name="search" className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          {q && <button onClick={() => setQ('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"><Icon name="close" /></button>}
        </div>
      </div>

      {/* Package tabs */}
      <div className="px-4 flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-2">
        {PACKAGES.map(p => (
          <button key={p} onClick={() => setParam('package', p)} aria-pressed={pkg === p}
            className={`px-6 py-2 rounded-xl font-semibold whitespace-nowrap ${pkg === p ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface-container-high text-on-surface border border-outline-variant'}`}>
            {PACKAGE_LABEL[p]}
          </button>
        ))}
      </div>

      {/* Mood filters */}
      <div className="flex flex-col gap-2 mb-5">
        <div className="px-4 flex overflow-x-auto no-scrollbar gap-2">
          <button onClick={() => setParam('mood', '')} className={`flex items-center gap-1 px-4 py-2 rounded-full whitespace-nowrap ${!moodId ? 'bg-secondary-container text-on-secondary-container border border-primary/20' : 'bg-surface-container-high text-on-surface-variant'}`}>
            <Icon name="temp_preferences_custom" className="text-[18px]" /><span className="text-sm">الكل</span>
          </button>
          {moods.slice(0, 5).map(m => (
            <button key={m.id} onClick={() => setParam('mood', m.id)} className={`flex items-center gap-1 px-4 py-2 rounded-full whitespace-nowrap ${moodId === m.id ? 'bg-secondary-container text-on-secondary-container border border-primary/20' : 'bg-surface-container-high text-on-surface-variant'}`}>
              <Icon name={moodIconFor(m)} className="text-[18px]" /><span className="text-sm">{m.name_ar}</span>
            </button>
          ))}
        </div>
        <div className="px-4"><button onClick={() => setSheet('moods')} className="text-primary text-sm flex items-center gap-1">عرض كل المودات <Icon name="arrow_forward" className="text-[16px]" /></button></div>
      </div>

      {/* Quick filters */}
      <div className="px-4 flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-2">
        <FilterChip icon="person" label={people ? PEOPLE.find(p => p.value === people)?.label : 'عدد الأشخاص'} active={!!people} onClick={() => setSheet('people')} onClear={people ? () => setParam('people', '') : null} />
        <FilterChip icon="payments" label={priceRange ? PRICE_RANGES.find(p => p.value === priceRange)?.label : 'السعر'} active={!!priceRange} onClick={() => setSheet('price')} onClear={priceRange ? () => setParam('price', '') : null} />
        <FilterChip icon="fastfood" label={foodType || 'نوع الأكل'} active={!!foodType} onClick={() => setSheet('food')} onClear={foodType ? () => setParam('food', '') : null} />
        <FilterChip icon="sort" label={activeSortLabel} active={sort !== 'recommended'} onClick={() => setSheet('sort')} onClear={sort !== 'recommended' ? () => setParam('sort', '') : null} />
      </div>

      {/* Results header */}
      <div className="px-4 flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-1"><h2 className="font-bold text-headline-sm">الاقتراحات</h2><span className="text-sm text-on-surface-variant">{filtered.length} اقتراح</span></div>
        <button onClick={() => setSheet('sort')} className="flex items-center gap-1 text-primary font-semibold text-sm"><span>{activeSortLabel}</span><Icon name="expand_more" className="text-[18px]" /></button>
      </div>

      {/* List */}
      <div className="px-4 space-y-4">
        {loading ? (
          <div className="space-y-4">{[1, 2].map(i => <SkeletonCard key={i} kind="suggestion" />)}</div>
        ) : error ? (
          <ErrorState title="ما قدرنا نحمّل الاقتراحات." onRetry={() => window.location.reload()} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={debouncedQ ? 'ما لقينا اقتراح مطابق.' : 'ما في اقتراحات بهالباقة هسا'}
            subtitle={debouncedQ ? 'جرّب كلمة ثانية أو امسح البحث.' : 'جرّب باقة ثانية أو غيّر الفلاتر.'}
            actionLabel={debouncedQ ? 'امسح البحث' : 'شوف كل الباقات'}
            onAction={debouncedQ ? () => setQ('') : () => setParams(new URLSearchParams())} />
        ) : (
          shown.map(s => <SuggestionListCard key={s.id} s={displayFor(s)} onChoose={chooseSuggestion} onDetails={(it) => navigate(`/tamam-order/${it.id}`)} onSimilar={onSimilar} />)
        )}
        {!loading && visible < filtered.length && (
          <button onClick={() => setVisible(v => v + PAGE_SIZE)} className="w-full py-3 bg-surface-container-high text-on-surface rounded-xl font-semibold border border-outline-variant">عرض المزيد</button>
        )}
      </div>

      {/* Sticky cart bar */}
      {totalItems > 0 && (
        <div className="fixed left-4 right-4 z-40 max-w-[480px] mx-auto" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={() => navigate('/cart')} className="w-full bg-primary text-on-primary py-3 px-4 rounded-2xl shadow-[0_10px_30px_rgba(135,218,118,0.4)] flex items-center justify-between border-2 border-white/10">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-on-primary/10 rounded-lg flex items-center justify-center"><Icon name="shopping_bag" /></div><div className="flex flex-col items-start"><span className="font-semibold text-sm">{totalItems} أصناف</span><span className="text-sm opacity-80">₪{Math.round(subtotal)}</span></div></div>
            <span className="flex items-center gap-1 font-semibold text-sm">عرض السلة <Icon name="arrow_back" className="text-[18px]" /></span>
          </button>
        </div>
      )}

      {/* Filter sheets */}
      <FilterSheet open={sheet === 'people'} onClose={() => setSheet(null)} title="عدد الأشخاص" selected={people} onSelect={v => setParam('people', v)} options={PEOPLE} />
      <FilterSheet open={sheet === 'price'} onClose={() => setSheet(null)} title="السعر" selected={priceRange} onSelect={v => setParam('price', v)} options={PRICE_RANGES.map(r => ({ value: r.value, label: r.label }))} />
      <FilterSheet open={sheet === 'food'} onClose={() => setSheet(null)} title="نوع الأكل" selected={foodType} onSelect={v => setParam('food', v)} options={[{ value: '', label: 'الكل' }, ...foodTypes.map(f => ({ value: f, label: f }))]} />
      <FilterSheet open={sheet === 'sort'} onClose={() => setSheet(null)} title="الترتيب" selected={sort} onSelect={v => setParam('sort', v)} options={SORTS} />
      <FilterSheet open={sheet === 'moods'} onClose={() => setSheet(null)} title="كل المودات" selected={moodId} onSelect={v => setParam('mood', v)} options={[{ value: '', label: 'الكل' }, ...moods.map(m => ({ value: m.id, label: m.name_ar }))]} />
    </div>
  );
}

function FilterChip({ icon, label, active, onClick, onClear }) {
  return (
    <div className={`flex items-center gap-1 px-4 py-2 rounded-lg whitespace-nowrap border ${active ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant'}`}>
      <button onClick={onClick} className="flex items-center gap-1"><Icon name={icon} className="text-[18px]" /><span className="text-sm">{label}</span></button>
      {active && onClear && <button onClick={onClear} className="mr-1"><Icon name="close" className="text-[14px]" /></button>}
    </div>
  );
}