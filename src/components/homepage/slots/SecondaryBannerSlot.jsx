import HomepageEditorialBanner from '@/components/tamam/customer/HomepageEditorialBanner';
import { resolveRoute } from '@/components/admin/homepage/selectors/InternalRouteSelector';

/**
 * SecondaryBannerSlot — the home_secondary_banner editorial banner.
 * Reuses the existing HomepageEditorialBanner component so the visual style
 * matches the customer design system. Hidden until the admin enables and
 * configures it.
 */
export default function SecondaryBannerSlot({ slot }) {
  const { settings, items, mediaMap, section } = slot;
  const mediaItem = items.find((it) => it.item_type === 'media' && it.media_id);
  const mediaId = settings.media_id || mediaItem?.media_id || null;
  const media = mediaMap?.[mediaId] || null;
  const poster = settings.poster_media_id ? mediaMap?.[settings.poster_media_id] : null;

  const destination = settings.mood_id
    ? `/tamam-suggestions/${settings.mood_id}`
    : (settings.cta_route_key
        ? resolveRoute(settings.cta_route_key, settings.cta_route_params)
        : (section?.view_all_route || '/restaurants'));

  const banner = {
    key: 'home_secondary_banner',
    layout: settings.layout || 'large',
    media_kind: settings.media_kind || media?.media_type || 'image',
    file_url: media?.file_url || null,
    poster_url: poster ? (poster.file_url || poster.poster_image_url) : null,
    headline: settings.headline || section?.title || '',
    subtitle: settings.subtitle || section?.subtitle || '',
    badge: settings.badge || null,
    cta_label: settings.cta_label || 'شوف',
    destination,
    overlay_strength: settings.overlay_strength ?? 55,
  };

  if (!banner.headline && !banner.file_url) return null;
  return <HomepageEditorialBanner banner={banner} />;
}