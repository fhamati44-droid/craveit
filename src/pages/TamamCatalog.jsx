import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { trackEvent } from '@/lib/tamamApi';
import { moodIconFor } from '@/lib/moodIcons';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const TIER_LABEL = { all: 'الكل', classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };

export default function TamamCatalog() {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [moods, setMoods] = useState([]);
  const [mealNames, setMealNames] = useState({});
  const [moodOf, setMoodOf] = useState({});
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState('all');
  const [moodFilter, setMoodFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [all, moodList] = await Promise.all([
          base44.entities.TamamSuggestionSet.filter({ is_active: true }).catch(() => []),
          base44.entities.TamamMood.list().catch(() => []),
        ]);
        const s = (all || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setSets(s);
        setMoods((moodList || []).filter(m => m.is_active));
        const moodMap = {};
        (moodList || []).forEach(m => { moodMap[m.id] = m; });
        setMoodOf(moodMap);
        const items = await base44.entities.TamamSuggestionItem.list('sort_order', 1000).catch(() => []);
        const ids = [...new Set((items || []).map(i => i.meal_id).filter(Boolean))];
        let names = {};
        if (ids.length) {
          const res = await base44.functions.invoke('supabaseProxy', { action: 'getMenuItemsByIds', payload: { ids } });
          (res?.data?.data || []).forEach(m => { names[m.id] = m.name; });
        }
        const bySet = {};
        (items || []).forEach(it => {
          if (!bySet[it.suggestion_set_id]) bySet[it.suggestion_set_id] = [];
          if (names[it.meal_id]) bySet[it.suggestion_set_id].push(names[it.meal_id]);
        });
        setMealNames(bySet);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => sets.filter(s => {
    if (pkg !== 'all' && s.package_level !== pkg) return false;
    if (moodFilter !== 'all' && s.mood_id !== moodFilter) return false;
    if (query && !(s.title_ar || '').includes(query)) return false;
    return true;
  }), [sets, pkg, moodFilter, query]);

  return (
    <div className="pt-4 pb-8">
      <div className="px-4 mb-4">
        <div className="flex items-center gap-1 mb-1"><Icon name="auto_awesome" className="text-primary text-[18px]" /><span className="text-primary text-label-lg font-semibold">اقتراحات TAMAM</span></div>
        <h1 className="text-headline-lg-mobile font-bold">كل الاقتراحات قدامك</h1>
        <p className="text-body-md text-on-surface-variant">اختار حسب مودك، ميزانيتك، وعدد الأشخاص.</p>
      </div>

      <div className="px-4 mb-4">
        <div className="relative">
          <input value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-surface-container-high text-on-surface py-4 pr-12 pl-4 rounded-xl border border-outline-variant focus:border-primary focus:outline-none transition-all" placeholder="دوّر على اقتراح أو نوع أكل..." type="text" />
          <Icon name="search" className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        </div>
      </div>

      <div className="px-4 flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
        {['all', 'classic', 'mix', 'plus'].map(t => (
          <button key={t} onClick={() => setPkg(t)} className={`px-6 py-2 rounded-xl font-label-lg whitespace-nowrap ${pkg === t ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface rounded-xl border border-outline-variant'}`}>{TIER_LABEL[t]}</button>
        ))}
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-2 px-4 mb-2">
        <button onClick={() => setMoodFilter('all')} className={`flex items-center gap-1 px-4 py-2 rounded-full whitespace-nowrap ${moodFilter === 'all' ? 'bg-secondary-container text-on-secondary-container border border-primary/20' : 'bg-surface-container-high text-on-surface-variant'}`}>
          <Icon name="temp_preferences_custom" className="text-[18px]" /><span className="font-label-sm">الكل</span>
        </button>
        {moods.map(m => (
          <button key={m.id} onClick={() => setMoodFilter(m.id)} className={`flex items-center gap-1 px-4 py-2 rounded-full whitespace-nowrap ${moodFilter === m.id ? 'bg-secondary-container text-on-secondary-container border border-primary/20' : 'bg-surface-container-high text-on-surface-variant'}`}>
            <Icon name={moodIconFor(m)} className="text-[18px]" /><span className="font-label-sm">{m.name_ar}</span>
          </button>
        ))}
      </div>

      <div className="px-4 mt-6 flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-1"><h2 className="text-headline-sm font-bold">الاقتراحات</h2><span className="text-label-sm text-on-surface-variant">{filtered.length} اقتراح</span></div>
        <div className="flex items-center gap-1 text-primary font-label-lg"><span>الأنسب</span><Icon name="expand_more" className="text-[18px]" /></div>
      </div>

      <div className="px-4 space-y-5">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-72 skeleton-t rounded-3xl" />)
        ) : filtered.length ? (
          filtered.map(s => {
            const mood = moodOf[s.mood_id];
            const names = mealNames[s.id] || [];
            return (
              <div key={s.id} className="bg-surface-container rounded-2xl overflow-hidden shadow-xl border border-primary/5 active:scale-[0.98] transition-transform">
                <div className="relative h-52 w-full">
                  {s.hero_image_url ? <img className="w-full h-full object-cover" src={s.hero_image_url} alt={s.title_ar} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-5xl">🍽️</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-highest via-transparent to-transparent" />
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <span className="px-3 py-1 bg-tertiary text-on-tertiary rounded-full font-label-sm shadow-lg flex items-center gap-1"><Icon name="star" className="text-[14px]" />{TIER_LABEL[s.package_level]}</span>
                    {mood && <span className="px-3 py-1 bg-surface-container-high/90 backdrop-blur-md text-on-surface rounded-full font-label-sm border border-white/10">{mood.name_ar}</span>}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-headline-sm">{s.title_ar || 'اقتراح'}</h3>
                    {s.display_price != null && <span className="text-primary font-bold text-headline-sm">₪{Math.round(s.display_price)}</span>}
                  </div>
                  {s.description_ar && <p className="text-body-md text-on-surface-variant line-clamp-2 mb-3">{s.description_ar}</p>}
                  {names.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {names.slice(0, 4).map((n, i) => <span key={i} className="bg-surface-container-high px-2 py-1 rounded text-on-surface-variant text-[12px] border border-outline-variant/30">{n}</span>)}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-3 py-3 border-y border-outline-variant/20">
                    {s.people_count && <div className="flex items-center gap-1"><Icon name="groups" className="text-[18px] text-on-surface-variant" /><span className="font-label-sm text-on-surface-variant">{s.people_count} أشخاص</span></div>}
                    <div className="flex items-center gap-1"><Icon name="schedule" className="text-[18px] text-on-surface-variant" /><span className="font-label-sm text-on-surface-variant">30–40 د</span></div>
                  </div>
                  <button onClick={() => { trackEvent({ action: 'package_selected', suggestion_set_id: s.id, package_level: s.package_level }); navigate(`/tamam-order/${s.id}`); }}
                    className="w-full py-3.5 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95">
                    <span>اختار هذا</span><Icon name="add_shopping_cart" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 text-on-surface-variant"><p className="text-4xl mb-2">🔍</p><p>ما في اقتراحات بهالفلاتر</p></div>
        )}
      </div>
    </div>
  );
}