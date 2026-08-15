import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMoodWithSuggestions, trackEvent, normalizePackage } from '@/lib/tamamApi';
import { getMoodMealSets, pickNextMealSet, resolveDefaultTier, TIERS } from '@/lib/mealSetApi';
import { useCart } from '@/lib/CartContext';
import { moodIconFor } from '@/lib/moodIcons';
import { resolvePublicImage, handleImageError } from '@/lib/imageUtils';
import { resolveUnifiedOffer, unlockUnifiedOffer, recordUnifiedOfferEvent, UNIFIED_CARD_STATE_LABEL, effectivePrice } from '@/lib/unifiedOfferApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const TIER_LABEL = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };

export default function TamamSuggestions() {
  const { moodId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();

  const [mood, setMood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [moodNotFound, setMoodNotFound] = useState(false);
  const [noSuggestions, setNoSuggestions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // MealSet model state
  const [mealSets, setMealSets] = useState({ sets: [], variantsBySet: {}, assignments: [] });
  const [currentSetId, setCurrentSetId] = useState(null);
  const [tier, setTier] = useState('mix');
  const [seenIds, setSeenIds] = useState([]);
  const [unified, setUnified] = useState(null); // UnifiedOffer overlay for current variant (null = normal)
  const [unifiedLoading, setUnifiedLoading] = useState(false);

  // Legacy model state (fallback)
  const [legacySets, setLegacySets] = useState({ classic: [], mix: [], plus: [] });
  const [legacyItems, setLegacyItems] = useState({});
  const [legacyIdx, setLegacyIdx] = useState({ classic: 0, mix: 0, plus: 0 });
  const [legacyMeals, setLegacyMeals] = useState([]);

  const useMealSetMode = mealSets.assignments.length > 0;

  const load = async () => {
    setLoading(true); setError(false); setMoodNotFound(false); setNoSuggestions(false);
    try {
      const urlTier = searchParams.get('tier');
      const urlSet = searchParams.get('set');

      const legacy = await getMoodWithSuggestions(moodId).catch(() => ({ mood: null, sets: [], items: [] }));
      const ms = await getMoodMealSets(moodId).catch(() => ({ sets: [], variantsBySet: {}, assignments: [] }));

      if (!legacy.mood && !ms.assignments.length && !legacy.sets.length) {
        setMoodNotFound(true); setLoading(false); return;
      }
      setMood(legacy.mood || null);

      if (ms.assignments.length) {
        setMealSets(ms);
        let initTier = (urlTier && TIERS.includes(urlTier)) ? urlTier : resolveDefaultTier(ms.assignments[0], null);
        const urlSetValid = urlSet && ms.assignments.find((a) => a.meal_set_id === urlSet);
        const firstValid = ms.assignments.find((a) => ms.variantsBySet[a.meal_set_id]?.[initTier]);
        let initSet = urlSetValid ? urlSet : (firstValid?.meal_set_id || ms.assignments[0]?.meal_set_id);
        if (initSet && !ms.variantsBySet[initSet]?.[initTier]) {
          const alt = TIERS.find((t) => ms.variantsBySet[initSet]?.[t]);
          if (alt) initTier = alt;
        }
        setTier(initTier);
        setCurrentSetId(initSet);
        trackEvent({ action: 'mood_selected', mood_id: moodId });
        setLoading(false);
        return;
      }

      // Legacy fallback
      if (!legacy.mood) { setMoodNotFound(true); setLoading(false); return; }
      const grouped = { classic: [], mix: [], plus: [] };
      legacy.sets.forEach((s) => { const pkg = normalizePackage(s.package_level); if (grouped[pkg]) grouped[pkg].push(s); });
      Object.values(grouped).forEach((a) => a.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setLegacySets(grouped);
      let initTier = (urlTier && TIERS.includes(urlTier)) ? urlTier : 'mix';
      if (!grouped[initTier].length) {
        if (grouped.classic.length) initTier = 'classic';
        else if (grouped.plus.length) initTier = 'plus';
      }
      setTier(initTier);
      if (urlSet && grouped[initTier].some((s) => s.id === urlSet)) {
        const i = grouped[initTier].findIndex((s) => s.id === urlSet);
        setLegacyIdx((p) => ({ ...p, [initTier]: Math.max(0, i) }));
      }
      const bySet = {};
      (legacy.items || []).forEach((i) => { const sid = i.suggestion_set_id; if (!bySet[sid]) bySet[sid] = []; bySet[sid].push(i); });
      setLegacyItems(bySet);
      if (!legacy.sets.length) setNoSuggestions(true);
      trackEvent({ action: 'mood_selected', mood_id: moodId });
    } catch (e) {
      console.error('PUBLIC_MOOD_DATA_LOAD_FAILED', { moodId, error: e?.message });
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [moodId]);

  // Persist MealSet mode state in URL (refresh-safe)
  useEffect(() => {
    if (!useMealSetMode || !currentSetId) return;
    const p = new URLSearchParams(searchParams);
    p.set('set', currentSetId); p.set('tier', tier);
    setSearchParams(p, { replace: true });
  }, [currentSetId, tier, useMealSetMode]);

  // Current variant (MealSet mode)
  const currentVariant = useMealSetMode ? (mealSets.variantsBySet[currentSetId]?.[tier] || null) : null;
  const currentSet = useMealSetMode ? mealSets.sets.find((s) => s.id === currentSetId) : null;
  const tierAvailable = useMealSetMode ? mealSets.assignments.some((a) => mealSets.variantsBySet[a.meal_set_id]?.[tier]) : false;

  // Legacy current
  const legacyCurrent = !useMealSetMode ? (legacySets[tier]?.[legacyIdx[tier] % Math.max(1, legacySets[tier].length)] || null) : null;

  useEffect(() => {
    if (useMealSetMode || !legacyCurrent) { setLegacyMeals([]); return; }
    (async () => {
      try {
        const its = legacyItems[legacyCurrent.id] || [];
        const ids = [...new Set(its.map((i) => i.meal_id).filter(Boolean))];
        if (!ids.length) { setLegacyMeals([]); return; }
        const res = await base44.functions.invoke('supabaseProxy', { action: 'getMenuItemsByIds', payload: { ids } });
        setLegacyMeals(res?.data?.data || []);
      } catch { setLegacyMeals([]); }
    })();
  }, [legacyCurrent?.id, legacyItems, useMealSetMode]);

  // Missing-variant rule: current set lacks the selected tier → move to another set that has it
  useEffect(() => {
    if (!useMealSetMode || !currentSetId || currentVariant) return;
    if (!tierAvailable) return;
    const alt = mealSets.assignments.find((a) => a.meal_set_id !== currentSetId && mealSets.variantsBySet[a.meal_set_id]?.[tier]);
    if (alt) setCurrentSetId(alt.meal_set_id);
  }, [useMealSetMode, currentSetId, tier, currentVariant, tierAvailable, mealSets]);

  // ---- Unified offer overlay (Phase 1.5) ----
  // Resolve a UnifiedOffer for the current variant when a restaurant context is
  // available. TAMAM-level MealSets have no restaurant, so in the normal Mood
  // flow this returns null and the customer sees the normal variant behavior
  // (no offer required). Per-restaurant/demo contexts pass ?restaurant=&demo=1.
  const phone = (typeof localStorage !== 'undefined' && localStorage.getItem('user_phone')) || '';
  const unifiedRestaurantId = searchParams.get('restaurant') || currentSet?.restaurant_id || null;
  const includeDemo = searchParams.get('demo') === '1';
  useEffect(() => {
    if (!useMealSetMode || !currentVariant || !unifiedRestaurantId) { setUnified(null); return; }
    let cancelled = false;
    resolveUnifiedOffer({ restaurant_id: unifiedRestaurantId, variant: tier, phone, include_demo: includeDemo })
      .then((res) => {
        if (cancelled) return;
        const sel = res?.selected || null;
        setUnified(sel);
        if (sel) recordUnifiedOfferEvent({ source_type: sel.source_type, id: sel.id, event_type: 'impression', channel: 'mood_game', phone, campaign_id: sel.campaign_id, restaurant_id: sel.restaurant_id }).catch(() => {});
      })
      .catch(() => { if (!cancelled) setUnified(null); });
    return () => { cancelled = true; };
  }, [useMealSetMode, currentSetId, tier, currentVariant, unifiedRestaurantId, includeDemo, phone]);

  const unlockUnified = async () => {
    if (!unified || !phone) { navigate('/profile'); return; }
    setUnifiedLoading(true);
    try {
      const r = await unlockUnifiedOffer({ source_type: unified.source_type, id: unified.id, phone, channel: 'mood_game' });
      if (r?.unlocked || r?.already_unlocked) {
        recordUnifiedOfferEvent({ source_type: unified.source_type, id: unified.id, event_type: 'unlock', channel: 'mood_game', phone, campaign_id: unified.campaign_id, restaurant_id: unified.restaurant_id }).catch(() => {});
        const res = await resolveUnifiedOffer({ restaurant_id: unifiedRestaurantId, variant: tier, phone, include_demo: includeDemo });
        setUnified(res?.selected || null);
      }
    } finally { setUnifiedLoading(false); }
  };

  // "اقتراح آخر" — changes the MealSet, preserves the tier
  const refresh = () => {
    if (useMealSetMode) {
      const next = pickNextMealSet(mealSets.assignments, mealSets.variantsBySet, currentSetId, tier, seenIds);
      if (next) {
        setCurrentSetId(next.meal_set_id);
        setSeenIds((prev) => (prev.includes(next.meal_set_id) ? prev : [...prev, next.meal_set_id]));
      }
      trackEvent({ action: 'suggestion_refreshed', mood_id: moodId, package_level: tier });
    } else {
      const arr = legacySets[tier];
      if (arr.length > 1) setLegacyIdx((p) => ({ ...p, [tier]: (p[tier] + 1) % arr.length }));
      trackEvent({ action: 'suggestion_refreshed', mood_id: moodId, package_level: tier });
    }
  };

  // Tier switch — keeps the current MealSet
  const switchTier = (t) => {
    setTier(t);
    trackEvent({ action: 'tier_switched', mood_id: moodId, package_level: t });
  };

  const choose = () => {
    if (useMealSetMode && currentVariant) {
      const uSel = unified;
      const useOffer = uSel && uSel.eligible && uSel.card_state !== 'LOCKED_POINTS';
      trackEvent({ action: 'package_selected', meal_set_id: currentSetId, meal_set_variant_id: currentVariant.id, package_level: tier });
      trackEvent({ action: 'order_started', meal_set_id: currentSetId, package_level: tier });
      if (useOffer) {
        recordUnifiedOfferEvent({ source_type: uSel.source_type, id: uSel.id, event_type: 'add_to_cart', channel: 'mood_game', phone, campaign_id: uSel.campaign_id, restaurant_id: uSel.restaurant_id }).catch(() => {});
      }
      addItem({
        id: currentVariant.existing_product_id || null,
        name: currentVariant.title_ar || currentSet?.display_name_ar || 'وجبة TAMAM',
        price: useOffer ? (effectivePrice(uSel) || currentVariant.marketing_price || currentVariant.starting_price || 0) : (currentVariant.marketing_price || currentVariant.starting_price || 0),
        image_url: currentVariant.image || currentSet?.set_cover_image || null,
        quantity: 1,
        extras: [],
        mood_id: moodId,
        meal_set_id: currentSetId,
        meal_set_variant_id: currentVariant.id,
        selected_tier: tier,
        unified_offer_source: useOffer ? uSel.source_type : null,
        unified_offer_id: useOffer ? uSel.id : null,
        campaign_id: useOffer ? uSel.campaign_id : null,
      });
      navigate('/cart');
      return;
    }
    if (legacyCurrent) {
      trackEvent({ action: 'package_selected', suggestion_set_id: legacyCurrent.id, package_level: tier });
      trackEvent({ action: 'order_started', suggestion_set_id: legacyCurrent.id, package_level: tier });
      navigate(`/tamam-order/${legacyCurrent.id}`);
    }
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

  // MealSet mode — no set has the selected tier at all
  const showMissingTier = useMealSetMode && !tierAvailable;
  const altTiers = TIERS.filter((t) => t !== tier && mealSets.assignments.some((a) => mealSets.variantsBySet[a.meal_set_id]?.[t]));

  // Resolve the visible card data
  const card = useMealSetMode && currentVariant ? {
    title: currentVariant.title_ar || currentSet?.display_name_ar || 'اقتراح TAMAM',
    image: currentVariant.image || currentSet?.set_cover_image,
    description: currentVariant.short_description_ar || currentSet?.set_short_description_ar,
    price: currentVariant.marketing_price,
    included: currentVariant.included_items_ar,
    audience: currentSet?.audience_size_min ? `${currentSet.audience_size_min}${currentSet.audience_size_max ? '–' + currentSet.audience_size_max : '+'} أشخاص` : '2–3 أشخاص',
    details: currentVariant.full_description_ar || currentVariant.ingredients_ar,
  } : null;
  const legacyCard = !useMealSetMode && legacyCurrent ? legacyCurrent : null;

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
            {TIERS.map((t) => (
              <button key={t} onClick={() => switchTier(t)}
                className={`flex-1 py-4 text-sm border-b-2 relative ${tier === t ? 'font-bold border-primary' : 'font-medium text-on-surface-variant border-transparent'}`}>
                {TIER_LABEL[t]}
                {t === 'mix' && <span className="absolute top-1 left-1/2 -translate-x-1/2 -translate-y-full text-[8px] bg-primary text-on-primary px-1.5 rounded-full py-0.5">الأنسب</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 mt-8">
        {showMissingTier ? (
          <div className="text-center py-16 text-on-surface-variant">
            <p className="text-4xl mb-2">🛠️</p>
            <p className="mb-4 font-bold">ما في اقتراحات {TIER_LABEL[tier]} متوفرة بهذا المود إسا</p>
            <div className="flex gap-2 justify-center">
              {altTiers.map((t) => (
                <button key={t} onClick={() => switchTier(t)} className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-full text-sm font-bold">شوف {TIER_LABEL[t]}</button>
              ))}
              {altTiers.length === 0 && (
                <button onClick={() => navigate('/tamam-suggestions?package=all')} className="px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold">شوف كل الاقتراحات</button>
              )}
            </div>
          </div>
        ) : card ? (
          <div className="bg-surface-container-high rounded-3xl overflow-hidden shadow-2xl border border-white/5">
            <div className="relative aspect-[4/3] w-full">
              {card.image ? <img alt={card.title} className="w-full h-full object-cover" src={resolvePublicImage(card.image)} onError={handleImageError} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-5xl">🍽️</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent" />
            </div>
            <div className="p-5">
              {unified && (
                <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold text-sm">عرض TAMAM · {UNIFIED_CARD_STATE_LABEL[unified.card_state] || ''}</span>
                    {unified.unlock_type === 'point_locked' && <span className="material-symbols-outlined text-tertiary text-[18px]">lock</span>}
                  </div>
                  {unified.value_add && <p className="text-xs text-on-surface-variant mt-1">{unified.value_add}</p>}
                  {unified.unlock_type === 'point_locked' && <p className="text-xs text-tertiary mt-1">يفتح بـ {unified.unlock_points} نقطة · رصيدك {unified.points_balance ?? '—'} نقطة</p>}
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-white">{card.title}</h3>
                <div className="text-left">
                  {unified && effectivePrice(unified) != null ? (
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <div className="text-primary font-bold text-xl">₪{Math.round(effectivePrice(unified))}</div>
                      {unified.normal_price && effectivePrice(unified) < unified.normal_price && <span className="text-sm text-on-surface-variant line-through">₪{Math.round(unified.normal_price)}</span>}
                    </div>
                  ) : (card.price != null && <div className="text-primary font-bold text-xl">₪{Math.round(card.price)}</div>)}
                </div>
              </div>
              {card.description && <p className="text-sm text-on-surface-variant mb-4">{card.description}</p>}
              <div className="space-y-2 mb-6">
                {card.included && <div className="flex items-center gap-2 text-sm text-on-surface"><Icon name="check_circle" className="text-primary text-lg" /><span>{card.included}</span></div>}
                <div className="flex items-center gap-2 text-sm text-on-surface"><Icon name="group" className="text-primary text-lg" /><span>مناسب لـ {card.audience}</span></div>
              </div>
              <div className="flex flex-col gap-3">
                {unified && unified.card_state === 'LOCKED_POINTS' ? (
                  <button onClick={unlockUnified} disabled={unifiedLoading} className="w-full bg-tertiary text-on-tertiary h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-lg active:scale-[0.98] transition-transform disabled:opacity-50">
                    {unifiedLoading ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="lock_open" />}
                    {unifiedLoading ? 'جاري الفتح…' : `افتح العرض بـ ${unified.unlock_points} نقطة`}
                  </button>
                ) : (
                  <button onClick={choose} className="w-full bg-primary text-on-primary h-14 rounded-2xl flex items-center justify-center font-bold text-lg active:scale-[0.98] transition-transform">اختار هذا</button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={refresh} className="h-12 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium active:bg-white/5"><Icon name="refresh" className="text-sm" />اقتراح آخر</button>
                  <button onClick={() => setShowDetails(true)} className="h-12 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium active:bg-white/5"><Icon name="info" className="text-sm" />شوف التفاصيل</button>
                </div>
              </div>
            </div>
          </div>
        ) : legacyCard ? (
          <div className="bg-surface-container-high rounded-3xl overflow-hidden shadow-2xl border border-white/5">
            <div className="relative aspect-[4/3] w-full">
              {legacyCard.hero_image_url ? <img alt={legacyCard.title_ar} className="w-full h-full object-cover" src={resolvePublicImage(legacyCard.hero_image_url)} onError={handleImageError} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-5xl">🍽️</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent" />
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-white">{legacyCard.title_ar || 'اقتراح TAMAM'}</h3>
                {legacyCard.display_price != null && <div className="text-primary font-bold text-xl">₪{Math.round(legacyCard.display_price)}</div>}
              </div>
              {legacyCard.description_ar && <p className="text-sm text-on-surface-variant mb-4">{legacyCard.description_ar}</p>}
              {legacyMeals.length > 0 && (
                <div className="space-y-2 mb-6">
                  {legacyMeals.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm text-on-surface"><Icon name="check_circle" className="text-primary text-lg" /><span>{m.name}</span></div>
                  ))}
                  <div className="flex items-center gap-2 text-sm text-on-surface"><Icon name="group" className="text-primary text-lg" /><span>مناسب لـ {legacyCard.people_count || '2–3'} أشخاص</span></div>
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
              {TIERS.filter((t) => t !== tier && (useMealSetMode ? mealSets.assignments.some((a) => mealSets.variantsBySet[a.meal_set_id]?.[t]) : legacySets[t]?.length > 0)).map((t) => (
                <button key={t} onClick={() => switchTier(t)} className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-full text-sm font-bold">{TIER_LABEL[t]}</button>
              ))}
              {TIERS.filter((t) => t !== tier && (useMealSetMode ? mealSets.assignments.some((a) => mealSets.variantsBySet[a.meal_set_id]?.[t]) : legacySets[t]?.length > 0)).length === 0 && (
                <button onClick={() => navigate('/tamam-suggestions?package=all')} className="px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold">شوف كل الاقتراحات</button>
              )}
            </div>
          </div>
        )}
      </section>

      {showDetails && (
        <div className="fixed inset-0 z-[100]" onClick={() => setShowDetails(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-0 left-0 w-full bg-surface-container-high rounded-t-[32px] p-6 max-w-[480px] mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-4">تفاصيل الوجبة</h3>
            <div className="space-y-4 mb-8 max-h-[50vh] overflow-auto">
              {card ? (
                <>
                  {card.description && <p className="text-sm text-on-surface-variant">{card.description}</p>}
                  {card.details && <div className="border-t border-white/5 pt-3"><p className="text-xs text-on-surface-variant mb-1">المكونات / التفاصيل</p><p className="text-sm text-white whitespace-pre-line">{card.details}</p></div>}
                  {card.included && <div className="border-t border-white/5 pt-3"><p className="text-xs text-on-surface-variant mb-1">العناصر المشمولة</p><p className="text-sm text-white">{card.included}</p></div>}
                </>
              ) : legacyMeals.length ? legacyMeals.map((m) => (
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