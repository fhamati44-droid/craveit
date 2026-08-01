import { resolvePublicMedia, PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

/** Project-owned fallback per package (Unsplash food photography). */
const PKG_FALLBACK = {
  classic: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
  mix: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  plus: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80',
};

export function suggestionFallback(pkg) {
  return PKG_FALLBACK[pkg] || PLACEHOLDER_IMAGE;
}

/**
 * Shared suggestion display-image selector — same resolver + priority as the homepage.
 * Priority: direct suggestion media → suggestion-item media → included meal media → restaurant media → fallback.
 * Uses resolvePublicMedia so Google Drive links, JSON strings, objects and arrays all normalize correctly.
 */
export function getSuggestionDisplayImage({ suggestion, suggestionItems = [], meals = [], restaurant = null, fallback = null }) {
  const directSources = [
    suggestion?.hero_image_url,
    suggestion?.published_image,
    suggestion?.base44_media,
    suggestion?.uploaded_image,
    suggestion?.cover_image,
    suggestion?.image,
    suggestion?.image_url,
    suggestion?.media,
    suggestion?.images,
  ];
  for (const src of directSources) {
    const resolved = resolvePublicMedia(src, null);
    if (resolved) return resolved;
  }
  for (const item of (suggestionItems || [])) {
    const resolved = resolvePublicMedia(item?.image_url ?? item?.image ?? item?.media ?? item?.hero_image_url, null);
    if (resolved) return resolved;
  }
  for (const meal of (meals || [])) {
    const resolved = resolvePublicMedia(meal?.image_url ?? meal?.image ?? meal?.media ?? meal?.images ?? meal?.cover_image, null);
    if (resolved) return resolved;
  }
  const restImg = resolvePublicMedia(restaurant?.image_url ?? restaurant?.cover_url ?? restaurant?.image ?? restaurant?.logo, null);
  if (restImg) return restImg;
  return fallback;
}