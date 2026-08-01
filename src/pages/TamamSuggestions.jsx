import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMoodWithSuggestions, trackEvent, normalizePackage } from '@/lib/tamamApi';
import { moodIconFor } from '@/lib/moodIcons';
import { resolvePublicImage, handleImageError } from '@/lib/imageUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const TIER_LABEL = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };
const TIERS = ['classic', 'mix', 'plus'];

export default function TamamSuggestions() {
  const { moodId } = useParams();
  const navigate = useNavigate();
  const [mood, setMood] = useState(null);
  const [sets, setSets] = useState({ classic: [], mix: [], plus: [] });
  const [itemsBySet, setItemsBySet] = useState({});
  const [idx, setIdx] = useState({ classic: 0, mix: 0, plus: 0 });
  const [tier, setTier] = useState('mix');
  const [meals, setMeals] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [moodNotFound, setMoodNotFound] = useState(false);
  const [noSuggestions, setNoSuggestions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const load = async () => {
    setLoading(true); setError(false); setMoodNotFound(false); setNoSuggestions(false);
    try {
      const { mood: m, sets: allSets, items: allItems } = await getMoodWithSuggestions(moodId);
      if (!m) { setMoodNotFound(true); setLoading(false); return; }
      setMood(m);
      trackEvent({ action: 'mood_selected', mood_id: moodId });
      const grouped = { classic: [], mix: [], plus: [] };
      allSets.forEach(s => {
        const pkg = normalizePackage(s.package_level);
        if (grouped[pkg]) grouped[pkg].push(s);
      });
      Object.values(grouped).forEach(a => a.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setSets(grouped);
      if (!grouped.mix.length && grouped.classic.length) setTier('classic');
      else if (!grouped.mix.length && grouped.plus.length) setTier('plus');
      const bySet = {};
      (allItems || []).forEach(i => {
        const sid = i.suggestion_set_id;
        if (!bySet[sid]) bySet[sid] = [];
        bySet[sid].push(i);
      });
      setItemsBySet(bySet);
      if (allSets.length === 0) setNoSuggestions(true);
    } catch (e) {
      console.error('PUBLIC_MOOD_DATA_LOAD_FAILED', {
        moodId,
        entityName: 'TamamMood',
        errorName: e?.name,
        errorMessage: e?.message,
        status: e?.status,
        code: e?.code,
      });
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [moodId]);

  const current = sets[tier]?.[idx[tier] % Math.max(1, sets[tier].length)] || null;

  useEffect(() => {
    if (!current) { setMeals([]); setItems([]); return; }
    (async () => {
      try {
        const its = itemsBySet[current.id] || [];
        setItems(its);
        const ids = [...new Set(its.map(i => i.meal_id).filter(Boolean))];
        if (!ids.length) { setMeals([]); return; }
        const res = await base44.functions.invoke('supabaseProxy', { action: 'getMenuItemsByIds', payload: { ids } });
        setMeals((res?.data?.data || []));
      } catch { setMeals([]); }
    })();
  }, [current?.id, itemsBySet]);

  const refresh = () => {
    const arr = sets[tier];
    if (arr.length > 1) setIdx(p => ({ ...p, [tier]: (p[tier] + 1) % arr.length }));
    trackEvent({ action: 'suggestion_refreshed', mood_id: moodId, package_level: tier });
  };
  const choose = () => {
    trackEvent({ action: 'package_selected', suggestion_set_id: current?.id, package_level: tier });
    trackEvent({ action: 'order_started', suggestion_set_id: current?.id, package_level: tier });
    navigate(`/tamam-order/${current.id}`);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-on-surface-variant text-sm">عم نجهّز اقتراحاتك...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <div className="text-4xl mb-3">⚠️</div>
      <p className="font-bold mb-2">ما قدرنا نحمّل اقتراحات المود.</p>
      <div className="flex flex-col gap-3 mt-4 w-full max-w-xs">
        <button onClick={load} className="h-12 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-transform">حاول مرة ثانية</button>
        <button onClick={() => navigate('/tamam-suggestions?package=all')} className="h-12 bg-surface border border-outline-variant/30 font-bold rounded-xl active:scale-95 transition-transform">شوف كل الاقتراحات</button>
      </div>
    </div>
  );

  if (moodNotFound || !mood) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <p className="text-4xl mb-2">🤔</p>
      <p className="font-bold mb-2">المود غير موجود</p>
      <p className="text-on-surface-variant text-sm mb-4">هاد المود مو متوفر أو تم حذفه.</p>
      <button onClick={() => navigate('/tamam-game')} className="text-primary underline font-bold">العودة للعبة</button>
    </div>
  );

  if (noSuggestions) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <p className="text-4xl mb-2">🍽️</p>
      <p className="font-bold mb-2">{mood.name_ar || mood.name}</p>
      <p className="text-on-surface-variant text-sm mb-4">المود موجود، بس ما لقينا اقتراحات مرتبطة فيه.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={() => navigate('/tamam-suggestions?package=all')} className="h-12 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-transform">شوف كل الاقتراحات</button>
        <button onClick={() => navigate('/tamam-game')} className="h-12 bg-surface border border-outline-variant/30 font-bold rounded-xl active:scale-95 transition-transform">العودة للعبة</button>
      </div>
    </div>
  );

  return (
    <div className="pb-32">
      {/* Mood summary */}
      <section className="px-4 py-4 bg-surface-container/50 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center"><Icon name={moodIconFor(mood)} className="text-primary text-xl" /></div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">المود المختار</p>
              <h2 className="text-sm font-bold">{mood.name_ar}</h2>
            </div>
          </div>
          <button onClick={() => navigate('/tamam-game')} className="text-[10px] font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-full active:bg-primary/10">غيّر المود</button>
        </div>
      </section>

      <section className="pt-6">
        <div className="px-4 mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">اخترنا لك</h1>
          <p className="text-sm text-on-surface-variant">اختار الباقة اللي بتناسبك</p>
        </div>
        <div className="sticky top-14 z-50 bg-surface/95 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center justify-around">
            {TIERS.map(t => (
              <button key={t} onClick={() => setTier(t)}
                className={`flex-1 py-4 text-sm border-b-2 relative ${tier === t ? 'font-bold border-primary' : 'font-medium text-on-surface-variant border-transparent'}`}>
                {TIER_LABEL[t]}
                {t === 'mix' && <span className="absolute top-1 left-1/2 -translate-x-1/2 -translate-y-full text-[8px] bg-primary text-on-primary px-1.5 rounded-full py-0.5">الأنسب</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 mt-8">
        {current ? (
          <div className="bg-surface-container-high rounded-3xl overflow-hidden shadow-2xl border border-white/5">
            <div className="relative aspect-[4/3] w-full">
              {current.hero_image_url ? <img alt={current.title_ar} className="w-full h-full object-cover" src={resolvePublicImage(current.hero_image_url)} onError={handleImageError} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-5xl">🍽️</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent" />
              {current.restaurant_name && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                  <Icon name="store" className="text-primary text-sm" /><span className="text-[11px] font-medium text-white">{current.restaurant_name}</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-white">{current.title_ar || 'اقتراح TAMAM'}</h3>
                {current.display_price != null && <div className="text-primary font-bold text-xl">₪{Math.round(current.display_price)}</div>}
              </div>
              {current.description_ar && <p className="text-sm text-on-surface-variant mb-4">{current.description_ar}</p>}
              {meals.length > 0 && (
                <div className="space-y-2 mb-6">
                  {meals.map(m => (
                    <div key={m.id} className="flex items-center gap-2 text-sm text-on-surface">
                      <Icon name="check_circle" className="text-primary text-lg" /><span>{m.name}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-sm text-on-surface"><Icon name="group" className="text-primary text-lg" /><span>مناسب لـ {current.people_count || '2–3'} أشخاص</span></div>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <button onClick={choose} className="w-full bg-primary text-on-primary h-14 rounded-2xl flex items-center justify-center font-bold text-lg active:scale-[0.98] transition-transform">اختار هذا</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={refresh} className="h-12 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium active:bg-white/5"><Icon name="refresh" className="text-sm" />اقتراح آخر</button>
                  <button onClick={() => setShowDetails(true)} className="h-12 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium active:bg-white/5"><Icon name="info" className="text-sm" />شوف التفاصيل</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-on-surface-variant">
            <p className="text-4xl mb-2">🛠️</p>
            <p className="mb-4">ما في اقتراح متاح لهاي الباقة هسا.</p>
            <div className="flex gap-2 justify-center">
              {TIERS.filter(t => t !== tier && sets[t]?.length > 0).map(t => (
                <button key={t} onClick={() => setTier(t)} className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-full text-sm font-bold">{TIER_LABEL[t]}</button>
              ))}
              {TIERS.filter(t => t !== tier && sets[t]?.length > 0).length === 0 && (
                <button onClick={() => navigate('/tamam-suggestions?package=all')} className="px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold">شوف كل الاقتراحات</button>
              )}
            </div>
          </div>
        )}
      </section>

      {showDetails && (
        <div className="fixed inset-0 z-[100]" onClick={() => setShowDetails(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-0 left-0 w-full bg-surface-container-high rounded-t-[32px] p-6 max-w-[480px] mx-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-4">تفاصيل الوجبة</h3>
            <div className="space-y-4 mb-8 max-h-[50vh] overflow-auto">
              {meals.length ? meals.map(m => (
                <div key={m.id} className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-on-surface-variant">{m.name}</span>
                  <span className="font-medium text-white">{m.price != null ? `₪${m.price}` : '—'}</span>
                </div>
              )) : <p className="text-on-surface-variant text-sm">لا توجد تفاصيل إضافية</p>}
            </div>
            <button onClick={() => setShowDetails(false)} className="w-full bg-primary text-on-primary h-14 rounded-2xl flex items-center justify-center font-bold">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}