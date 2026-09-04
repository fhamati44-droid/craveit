/**
 * homePageConfig — pure slot resolution for the unified homepage.
 *
 * The homepage structure is controlled by HomePageContent (fixed slot order).
 * CMS sections control VISIBILITY (enabled + time window) and CONTENT of each
 * slot. Legacy section keys act as fallbacks so existing drafts/published
 * snapshots keep working without migration.
 */

const parseJSON = (s, fallback = {}) => {
  try { return JSON.parse(s) || fallback; } catch { return fallback; }
};

// Slot order = the customer homepage layout. Keys are the new marketing-first
// CMS slots; fallbackKeys are legacy section keys that already control them.
export const HOME_SLOTS = [
  { key: 'home_hero', fallbackKeys: ['hero'], defaultVisible: true },
  { key: 'active_order', defaultVisible: true },
  { key: 'active_deal', defaultVisible: true },
  { key: 'unified_offers', defaultVisible: true },
  { key: 'time_suggestions', defaultVisible: true },
  { key: 'home_campaign_offers', fallbackKeys: ['suggestions'], defaultVisible: true },
  { key: 'home_categories', fallbackKeys: ['popular_categories'], defaultVisible: false },
  { key: 'home_featured_menus', defaultVisible: false },
  { key: 'featured_restaurants', defaultVisible: true },
  { key: 'mood_game', defaultVisible: true },
  { key: 'tamam_game', defaultVisible: true },
  { key: 'khabya', defaultVisible: true },
  { key: 'community_moods', defaultVisible: true },
  { key: 'home_secondary_banner', defaultVisible: false },
  { key: 'rewards', defaultVisible: true },
  { key: 'home_trust', fallbackKeys: ['trust_payments'], defaultVisible: true },
];

export function resolveHomeSlots(config) {
  const sections = [...(config?.sections || [])].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );
  const allItems = config?.items || [];
  const mediaMap = config?.media_map || {};
  const now = Date.now();

  const inWindow = (s) =>
    (!s.starts_at || new Date(s.starts_at).getTime() <= now) &&
    (!s.ends_at || new Date(s.ends_at).getTime() >= now);

  const slots = {};
  for (const def of HOME_SLOTS) {
    let section = null;
    for (const key of [def.key, ...(def.fallbackKeys || [])]) {
      const found = sections.find((s) => s.section_key === key);
      if (found) { section = found; break; }
    }
    const items = section
      ? allItems
          .filter((it) => it.homepage_section_id === section.id && it.enabled !== false)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      : [];
    slots[def.key] = {
      key: def.key,
      section,
      settings: section ? parseJSON(section.settings_json, {}) : {},
      items,
      mediaMap,
      // No section at all → default layout behavior (preserves the classic Home).
      // Section present → its enabled flag + schedule are honored in BOTH modes.
      visible: section ? section.enabled !== false && inWindow(section) : !!def.defaultVisible,
    };
  }
  return slots;
}