import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'tamam_session_id';

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Moods
export const getActiveMoods = async () => {
  const list = await base44.entities.TamamMood.list('sort_order', 100);
  return (list || []).filter(m => m.is_active);
};

export const getAllMoods = () => base44.entities.TamamMood.list('sort_order', 200);
export const createMood = (data) => base44.entities.TamamMood.create(data);
export const updateMood = (id, data) => base44.entities.TamamMood.update(id, data);
export const deleteMood = (id) => base44.entities.TamamMood.delete(id);

// Suggestion sets
export const getActiveSuggestionSets = async (moodId) => {
  const list = await base44.entities.TamamSuggestionSet.filter({ mood_id: moodId }, 'sort_order', 100);
  return (list || []).filter(s => s.is_active);
};

export const getAllSuggestionSets = (moodId) =>
  base44.entities.TamamSuggestionSet.filter({ mood_id: moodId }, 'sort_order', 200);

export const createSuggestionSet = (data) => base44.entities.TamamSuggestionSet.create(data);
export const updateSuggestionSet = (id, data) => base44.entities.TamamSuggestionSet.update(id, data);
export const deleteSuggestionSet = (id) => base44.entities.TamamSuggestionSet.delete(id);

// Suggestion items
export const getItemsForSet = (setId) =>
  base44.entities.TamamSuggestionItem.filter({ suggestion_set_id: setId }, 'sort_order', 200);

export const getItemsForSets = async (setIds) => {
  const all = await base44.entities.TamamSuggestionItem.list('sort_order', 500);
  return (all || []).filter(i => setIds.includes(i.suggestion_set_id));
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

export { getSessionId };