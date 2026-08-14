import { getMoodWithSuggestions } from '@/lib/tamamApi';
import { getOffersForMeal, pickDefaultOffer } from '@/lib/restaurantOfferApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import { getMoodMealSets, TIERS } from '@/lib/mealSetApi';

const TIER_WEIGHT = { classic: 1, mix: 2, plus: 3 };

/**
 * Food Mood Lab recommendation engine.
 * Uses the 3 lab answers (mood, companions, priority) to rank real, available
 * meal-set variants (Classic/Mix/Plus) for the selected mood, enriched with
 * live restaurant offers. Returns up to 3 diverse picks (different restaurants
 * where possible) plus an optional active group deal for family/friends.
 *
 * Reuses existing entities/APIs only — no new records are created.
 */
export async function runMoodLab({ mood, companions, priority }) {
  if (!mood?.id) return { picks: [], groupDeal: null };

  const [ms, legacy] = await Promise.all([
    getMoodMealSets(mood.id).catch(() => ({ sets: [], variantsBySet: {}, assignments: [] })),
    getMoodWithSuggestions(mood.id).catch(() => ({ mood: null, sets: [], items: [] })),
  ]);

  const candidates = [];

  // Preferred model: MealSet variants (Classic/Mix/Plus affect price & content).
  (ms.assignments || []).forEach((a) => {
    const set = (ms.sets || []).find((s) => s.id === a.meal_set_id);
    const variants = ms.variantsBySet[a.meal_set_id] || {};
    TIERS.forEach((tier) => {
      const v = variants[tier];
      if (!v || !v.active || !v.available) return;
      const mealId = v.existing_product_id;
      if (mealId == null) return;
      candidates.push({
        source: 'mealset',
        setId: a.meal_set_id,
        tier,
        variantId: v.id,
        mealId,
        title: v.title_ar || set?.display_name_ar || 'وجبة TAMAM',
        image: v.image || set?.set_cover_image || null,
        basePrice: v.marketing_price ?? v.starting_price ?? null,
        description: v.short_description_ar || set?.set_short_description_ar || null,
        featured: !!a.featured_for_mood,
        weight: a.recommendation_weight || 0,
        audienceMax: set?.audience_size_max || null,
      });
    });
  });

  // Legacy fallback only when the MealSet model is empty for this mood.
  if (candidates.length === 0 && legacy?.sets?.length) {
    const itemsBySet = {};
    (legacy.items || []).forEach((it) => {
      (itemsBySet[it.suggestion_set_id] ||= []).push(it);
    });
    legacy.sets.forEach((s) => {
      const items = itemsBySet[s.id] || [];
      const mealId = items[0]?.meal_id;
      if (mealId == null) return;
      candidates.push({
        source: 'legacy', setId: s.id, tier: null, variantId: null, mealId,
        title: s.title_ar || 'وجبة TAMAM', image: s.hero_image_url || null,
        basePrice: s.display_price ?? null, description: s.description_ar || null,
        featured: false, weight: 0, audienceMax: s.people_count || null,
      });
    });
  }

  if (candidates.length === 0) return { picks: [], groupDeal: null };

  // Enrich with real restaurant offers (cap distinct meal ids to stay fast).
  const distinctMealIds = [...new Set(candidates.map((c) => c.mealId))].slice(0, 12);
  const offerMap = {};
  await Promise.all(distinctMealIds.map(async (mid) => {
    offerMap[mid] = await getOffersForMeal(mid).catch(() => []);
  }));

  let enriched = candidates
    .map((c) => {
      const offers = offerMap[c.mealId] || [];
      if (!offers.length) return null; // no available restaurant -> excluded
      const offer = pickDefaultOffer(offers, []);
      if (!offer) return null;
      return { ...c, offer };
    })
    .filter(Boolean);

  if (enriched.length === 0) return { picks: [], groupDeal: null };

  // Score by the user's priority + companions.
  enriched = enriched.map((c) => {
    let score = (c.featured ? 50 : 0) + (c.weight || 0);
    const price = c.offer.price ?? c.basePrice ?? 0;
    const delivery = c.offer.restaurant_delivery_time_min ?? 30;
    const compareAt = c.offer.compare_at_price;
    const discountPct = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;

    if (priority === 'fastest') score += Math.max(0, 60 - delivery);
    if (priority === 'budget') {
      score += Math.max(0, 300 - price);
      score += c.tier === 'classic' ? 20 : c.tier === 'mix' ? 5 : -10;
    }
    if (priority === 'satisfying') {
      score += (TIER_WEIGHT[c.tier] || 1) * 15;
      if (c.audienceMax) score += Math.min(20, c.audienceMax);
    }
    if (priority === 'deal') {
      score += discountPct * 5;
      if (!compareAt) score -= 30;
    }
    if (priority === 'surprise') score += Math.random() * 40;

    if (companions === 'family' || companions === 'friends') {
      score += (TIER_WEIGHT[c.tier] || 1) * 10;
      if (c.audienceMax && c.audienceMax >= 4) score += 15;
    } else if (c.tier === 'plus') {
      score -= 5;
    }

    return { ...c, price, delivery, compareAt, discountPct, score };
  });

  enriched.sort((a, b) => b.score - a.score);

  // Diversify: prefer different restaurants; fall back to different sets.
  const picks = [];
  const usedRestaurants = new Set();
  const usedSets = new Set();
  for (const c of enriched) {
    const rid = c.offer.restaurant_id;
    if (usedRestaurants.has(rid)) continue;
    usedRestaurants.add(rid);
    usedSets.add(c.setId);
    picks.push(c);
    if (picks.length >= 3) break;
  }
  if (picks.length < 3) {
    for (const c of enriched) {
      if (picks.includes(c) || usedSets.has(c.setId)) continue;
      usedSets.add(c.setId);
      picks.push(c);
      if (picks.length >= 3) break;
    }
  }

  const reasonFor = (c) => {
    const r = [];
    if (priority === 'fastest') r.push('أسرع توصيل لمودك');
    else if (priority === 'budget') r.push('ضمن ميزانيتك');
    else if (priority === 'satisfying') r.push('مشبعة وكافية');
    else if (priority === 'deal') r.push('فيها عرض وتوفير');
    else if (priority === 'surprise') r.push('مفاجئة على مزاجك');
    if (companions === 'family') r.push('مناسبة للعيلة');
    else if (companions === 'friends') r.push('مناسبة لمة الأصحاب');
    return 'اخترناها لأنها ' + (r.join(' و ') || 'على مزاجك') + '.';
  };

  const result = picks.map((c) => ({
    id: `${c.setId}-${c.tier || 'x'}-${c.mealId}`,
    mealId: c.mealId,
    setId: c.setId,
    tier: c.tier,
    variantId: c.variantId,
    title: c.title,
    image: c.offer.restaurant_item_image || c.image,
    restaurantName: c.offer.restaurant_name,
    restaurantId: c.offer.restaurant_id,
    rating: c.offer.restaurant_rating,
    price: c.price,
    compareAt: c.compareAt,
    discountPct: c.discountPct,
    deliveryMin: c.offer.restaurant_delivery_time_min,
    deliveryMax: c.offer.restaurant_delivery_time_max,
    reason: reasonFor(c),
    route: `/tamam-suggestions/${mood.id}?set=${c.setId}${c.tier ? `&tier=${c.tier}` : ''}`,
  }));

  // Active group deal surfaces only for family/friends (non-intrusive banner).
  let groupDeal = null;
  if (companions === 'family' || companions === 'friends') {
    try {
      const deals = await listPublicDeals();
      const active = (deals || []).find((v) => v.status === 'active');
      if (active) groupDeal = { deal: active.deal, thresholds: active.thresholds, participants: active.participants };
    } catch {}
  }

  return { picks: result, groupDeal };
}