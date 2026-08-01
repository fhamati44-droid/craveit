// Package normalization + display adapter for TAMAM suggestions.
// DB keeps its own values (classic/mix/plus); this only normalizes URLs/labels and aliases.

export function normalizePackage(value) {
  const n = String(value || '').trim().toLowerCase();
  if (n === 'classic' || n === 'كلاسيك') return 'classic';
  if (n === 'mix' || n === 'ميكس') return 'mix';
  if (n === 'plus' || n === 'بلس' || n === 'max' || n === 'ماكس' || n === 'premium') return 'plus';
  return 'all';
}

export const PACKAGE_LABEL = { all: 'الكل', classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };
export const PACKAGES = ['all', 'classic', 'mix', 'plus'];

export function packageBadge(pkg, isRecommended = false) {
  if (pkg === 'mix' && isRecommended) return { text: 'ميكس · الأنسب', tone: 'tertiary', star: true };
  return { text: PACKAGE_LABEL[pkg] || pkg, tone: pkg === 'plus' ? 'primary' : 'secondary', star: false };
}