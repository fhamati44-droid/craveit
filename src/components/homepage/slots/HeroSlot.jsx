import HomeIntentHero from '@/components/tamam/customer/HomeIntentHero';
import { resolveRoute } from '@/components/admin/homepage/selectors/InternalRouteSelector';

/**
 * HeroSlot — feeds CMS hero content into the modern HomeIntentHero design.
 * CMS values are optional; anything unset falls back to the current default
 * (including the time-aware suggestion image). CMS media takes priority over
 * the time-aware image, per the time-aware content precedence rule.
 */
export default function HeroSlot({ slot, timeData }) {
  const { settings, items, mediaMap } = slot;
  const mediaItem = items.find((it) => it.item_type === 'media' && it.media_id);
  const mediaId = settings.media_id || mediaItem?.media_id || null;
  const media = mediaMap?.[mediaId] || null;

  const cms = {
    headline: settings.headline || '',
    subtitle: settings.supporting_text || '',
    cta_label: settings.cta_label || '',
    cta_route: settings.cta_route_key
      ? resolveRoute(settings.cta_route_key, settings.cta_route_params)
      : (settings.cta_label ? '/tamam-game' : ''),
    media_url: media?.file_url || null,
    media_kind: settings.media_kind || media?.media_type || 'image',
  };

  return <HomeIntentHero topSuggestion={timeData?.top_suggestions?.[0]} cms={cms} />;
}