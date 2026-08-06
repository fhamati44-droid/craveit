import { base44 } from '@/api/base44Client';

export const TIERS = ['classic', 'mix', 'plus'];
export const TIER_LABEL = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };

// ---- Admin CRUD ----
export const getAllMealSets = () => base44.entities.MealSet.list('display_priority', 200);
export const createMealSet = (data) => base44.entities.MealSet.create(data);
export const updateMealSet = (id, data) => base44.entities.MealSet.update(id, data);
export const deleteMealSet = (id) => base44.entities.MealSet.delete(id);

export const getVariantsForSet = (setId) => base44.entities.MealSetVariant.filter({ meal_set_id: setId }, 'display_priority', 10);
export const getVariantsForSets = async (setIds) => {
  if (!setIds.length) return [];
  const all = await base44.entities.MealSetVariant.list('display_priority', 500);
  return (all || []).filter((v) => setIds.includes(v.meal_set_id));
};
export const createVariant = (data) => base44.entities.MealSetVariant.create(data);
export const updateVariant = (id, data) => base44.entities.MealSetVariant.update(id, data);
export const deleteVariant = (id) => base44.entities.MealSetVariant.delete(id);

export const getAssignmentsForMood = (moodId) => base44.entities.MoodMealSetAssignment.filter({ mood_id: moodId }, 'display_priority', 200);
export const getAssignmentsForSet = (setId) => base44.entities.MoodMealSetAssignment.filter({ meal_set_id: setId }, 'display_priority', 200);
export const createAssignment = (data) => base44.entities.MoodMealSetAssignment.create(data);
export const updateAssignment = (id, data) => base44.entities.MoodMealSetAssignment.update(id, data);
export const deleteAssignment = (id) => base44.entities.MoodMealSetAssignment.delete(id);

/**
 * Customer: load mood -> active assignments -> active sets -> active variants.
 * Returns a normalized pool. Empty assignments => caller falls back to legacy.
 */
export async function getMoodMealSets(moodId) {
  const assignments = await base44.entities.MoodMealSetAssignment
    .filter({ mood_id: moodId, active: true }, 'display_priority', 200).catch(() => []);
  if (!assignments || !assignments.length) return { sets: [], variantsBySet: {}, assignments: [] };

  const setIds = [...new Set(assignments.map((a) => a.meal_set_id).filter(Boolean))];
  const sets = await base44.entities.MealSet.filter({ id: { $in: setIds }, active: true }).catch(() => []);
  const activeSetIds = new Set((sets || []).map((s) => s.id));

  const variants = await getVariantsForSets(setIds);
  const variantsBySet = {};
  (variants || []).forEach((v) => {
    if (!v.active || !v.available) return;
    if (!variantsBySet[v.meal_set_id]) variantsBySet[v.meal_set_id] = {};
    // enforce unique(meal_set_id, tier) — keep first active
    if (!variantsBySet[v.meal_set_id][v.tier]) variantsBySet[v.meal_set_id][v.tier] = v;
  });

  const validAssignments = assignments.filter((a) => activeSetIds.has(a.meal_set_id));
  return { sets: sets || [], variantsBySet, assignments: validAssignments };
}

/** Sort assignments by featured → priority → weight → not-seen-first. */
export function sortAssignments(assignments, seenIds = []) {
  return [...assignments].sort((a, b) => {
    if (!!b.featured_for_mood !== !!a.featured_for_mood) return (b.featured_for_mood ? 1 : 0) - (a.featured_for_mood ? 1 : 0);
    if ((a.display_priority || 0) !== (b.display_priority || 0)) return (a.display_priority || 0) - (b.display_priority || 0);
    if ((b.recommendation_weight || 0) !== (a.recommendation_weight || 0)) return (b.recommendation_weight || 0) - (a.recommendation_weight || 0);
    const aSeen = seenIds.includes(a.meal_set_id) ? 1 : 0;
    const bSeen = seenIds.includes(b.meal_set_id) ? 1 : 0;
    return aSeen - bSeen;
  });
}

/**
 * "اقتراح آخر": pick the next MealSet for the CURRENT tier, excluding the current set,
 * preferring unseen sets. The selected tier is preserved by the caller.
 */
export function pickNextMealSet(assignments, variantsBySet, currentSetId, tier, seenIds = []) {
  const valid = assignments.filter((a) => variantsBySet[a.meal_set_id]?.[tier]);
  if (!valid.length) return null;
  const sorted = sortAssignments(valid, seenIds);
  const notCurrent = sorted.filter((a) => a.meal_set_id !== currentSetId);
  const pool = notCurrent.length ? notCurrent : sorted;
  const unseen = pool.filter((a) => !seenIds.includes(a.meal_set_id));
  return unseen[0] || pool[0] || sorted[0];
}

export function resolveDefaultTier(assignment, sessionTier) {
  if (sessionTier && TIERS.includes(sessionTier)) return sessionTier;
  if (assignment?.default_tier && TIERS.includes(assignment.default_tier)) return assignment.default_tier;
  return 'mix';
}

/** A MealSet is publishable only when it has all three active variants. */
export function setCompleteness(variantsBySet, setId) {
  const v = variantsBySet[setId] || {};
  return {
    classic: !!v.classic,
    mix: !!v.mix,
    plus: !!v.plus,
    complete: !!v.classic && !!v.mix && !!v.plus,
  };
}