/**
 * TAMAM Avatar System — data layer (no JSX).
 * Avatar SVG rendering lives in TamamAvatarSVG.jsx
 */

export const TAMAM_COLORS = {
  green: '#6EBF5F',
  greenBright: '#89DB78',
  greenDark: '#1C6D17',
  cream: '#F4F0E5',
  surface: '#1C211E',
  surfaceHigh: '#262B29',
  gold: '#EAC45C',
  teal: '#0E3B40',
};

export const SKIN_TONES = ['#E8C5A0', '#D4A76A', '#C08B5C', '#A06B41', '#8B5A3C', '#6B4423'];

export const HAIR_COLORS = ['#1A1A1A', '#3D2817', '#6B4423', '#8B5A3C', '#A0522D', '#555555', '#2F1B14'];

const AVATAR_GROUPS = {
  f: { label: 'نسائي', count: 8 },
  m: { label: 'رجالي', count: 8 },
  n: { label: 'محايد', count: 8 },
};

export const AVATAR_KEYS = Object.entries(AVATAR_GROUPS).flatMap(([gender, info]) =>
  Array.from({ length: info.count }, (_, i) => `${gender}${i + 1}`)
);

export function getAvatarGroups() {
  return Object.entries(AVATAR_GROUPS).map(([key, info]) => ({ key, label: info.label, count: info.count }));
}

export function hashKey(key) {
  const match = /^([fmn])(\d+)$/.exec(key || 'n1');
  if (!match) return { gender: 'n', idx: 1 };
  return { gender: match[1], idx: parseInt(match[2], 10) };
}

export function getAvatarDisplay(avatarType, avatarKey, avatarUrl) {
  if (avatarType === 'profile' && avatarUrl) {
    return { type: 'profile', url: avatarUrl };
  }
  return { type: 'tamam', key: avatarKey || 'n1' };
}