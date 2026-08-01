const KEY = 'tamam_favorites';

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function isFavorite(id) {
  return getFavorites().map(String).includes(String(id));
}

export function toggleFavorite(id) {
  const list = getFavorites().map(String);
  const s = String(id);
  const i = list.indexOf(s);
  let added;
  if (i >= 0) { list.splice(i, 1); added = false; }
  else { list.push(s); added = true; }
  localStorage.setItem(KEY, JSON.stringify(list));
  return added;
}