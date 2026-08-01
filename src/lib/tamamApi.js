import { base44 } from '@/api/base44Client';
import { normalizeMood, extractRecords } from '@/lib/tamamAdapters';
import { normalizePackage } from '@/lib/packageUtils';

const SESSION_KEY = 'tamam_session_id';

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Service-role backend call (avoids 403 on published app)
const moodEngine = (action, payload = {}) =>
  base44.functions.invoke('homepageEngine', { action, payload }).then((r) => r.data?.data ?? r.data);

// Moods with suggestion availability — for the game
export const getPlayableMoods = async () => {
  const records = await moodEngine('getPublicMoods');
  return extractRecords(records).map(normalizeMood).filter(Boolean);
};

// All active suggestion sets + items — for the catalog
export const getAllPublicSuggestions = async () => {
  const result = await moodEngine('getPublicSuggestions');
  if (!result) return { sets: [], items: [] };
  return {
    sets: extractRecords(result.sets).filter((s) => s.is_active !== false),
    items: extractRecords(result.items),
  };
};

// Mood + its active suggestion sets + items — for the result page
export const getMoodWithSuggestions = async (moodId) => {
  const result = await moodEngine('getPublicMoodData', { mood_id: moodId });
  if (!result || !result.mood) return { mood: null, sets: [], items: [] };
  return {
    mood: normalizeMood(result.mood),
    sets: extractRecords(result.sets).filter((s) => s.is_active !== false),
    items: extractRecords(result.items),
  };
};

// All active moods via backend (for catalog filter dropdown)
export const getActiveMoods = async () => {
  const records = await moodEngine('getPublicMoods');
  return extractRecords(records).map(normalizeMood).filter(Boolean);
};

// Admin SDK helpers (admin-only)
export const getAllMoods = () => base44.entities.TamamMood.list('sort_order', 200);
export const createMood = (data) => base44.entities.TamamMood.create(data);
export const updateMood = (id, data) => base44.entities.TamamMood.update(id, data);
export const deleteMood = (id) => base44.entities.TamamMood.delete(id);

export const getAllSuggestionSets = (moodId) =>
  base44.entities.TamamSuggestionSet.filter({ mood_id: moodId }, 'sort_order', 200);

export const createSuggestionSet = (data) => base44.entities.TamamSuggestionSet.create(data);
export const updateSuggestionSet = (id, data) => base44.entities.TamamSuggestionSet.update(id, data);
export const deleteSuggestionSet = (id) => base44.entities.TamamSuggestionSet.delete(id);

export const getItemsForSet = (setId) =>
  base44.entities.TamamSuggestionItem.filter({ suggestion_set_id: setId }, 'sort_order', 200);

export const getItemsForSets = async (setIds) => {
  const all = await base44.entities.TamamSuggestionItem.list('sort_order', 500);
  return (all || []).filter((i) => setIds.includes(i.suggestion_set_id));
};

export const createItem = (data) => base44.entities.TamamSuggestionItem.create(data);
export const updateItem = (id, data) => base44.entities.TamamSuggestionItem.update(id, data);
export const deleteItem = (id) => base44.entities.TamamSuggestionItem.delete(id);

// Analytics
export const trackEvent = (data) =>
  base44.entities.TamamSuggestionClick.create({
    user_session_id: getSessionId(),
    source: 'tamam_game',
    ...data,
  }).catch(() => null);

export { getSessionId, normalizePackage };