import { useEffect, useState } from 'react';
import { getTimeAwareHomepage, clearTimeAwareCache } from '@/lib/homepageTimeApi';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/i18n/LanguageContext';

/**
 * Generic time-aware homepage slot wrapper.
 * Fetches time-aware content (shared across all slots via context cache).
 * Renders children (as render function receiving content) or fallback.
 *
 * Usage:
 * <TimeAwareHomepageSlot slotKey="homepage_hero" fallback={<StaticHero />}>
 *   {(content) => <TimeAwareHero content={content} />}
 * </TimeAwareHomepageSlot>
 *
 * Or use the individual TimeAwareHero / TimeAwareTopSuggestions / etc. components
 * which accept timeData directly.
 */
export default function TimeAwareHomepageSlot({ slotKey, fallback, children }) {
  const { locale } = useLanguage();
  const [timeData, setTimeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTimeAwareHomepage()
      .then((data) => {
        if (cancelled) return;
        setTimeData(data);
        if (data?.current_period) {
          track('homepage_time_period_viewed', {
            period_id: data.current_period.id,
            locale,
          });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [locale]);

  // Get slot-specific content
  const getSlotContent = () => {
    if (!timeData) return null;
    switch (slotKey) {
      case 'homepage_hero': return timeData.hero;
      case 'homepage_top_suggestions': return timeData.top_suggestions;
      case 'homepage_time_banner_1': return timeData.banners?.[0] || null;
      case 'homepage_time_banner_2': return timeData.banners?.[1] || null;
      case 'homepage_time_carousel_1': return timeData.carousels?.[0] || null;
      case 'homepage_time_carousel_2': return timeData.carousels?.[1] || null;
      default: return null;
    }
  };

  const content = getSlotContent();

  // While loading, show fallback (no blank area)
  if (loading || !content) return fallback || null;

  // Render children as function or directly
  if (typeof children === 'function') return children(content, timeData);
  return children || fallback || null;
}

/** Force refresh of time-aware cache (e.g., on browser foreground) */
export function refreshTimeAwareSlots() {
  clearTimeAwareCache();
}