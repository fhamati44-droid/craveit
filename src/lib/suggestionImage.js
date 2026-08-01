import { resolvePublicMedia, PLACEHOLDER_IMAGE } from '@/lib/imageUtils';
import { normalizePackage } from '@/lib/packageUtils';

/** Project-owned fallback per package (Unsplash food photography). */
const PKG_FALLBACK = {
  classic: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
  mix: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  plus: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80',
};

export const TAMAM_SUGGESTION_FALLBACK_IMAGE = PLACEHOLDER_IMAGE;

export function suggestionFallback(pkg) {
  return PKG_FALLBACK[pkg] || PLACEHOLDER_IMAGE;
}

/**
 * Canonical suggestion image resolver — ONE pipeline used by the homepage,
 * All Suggestions page, mood-result page, and hero carousel.
 * Priority: direct suggestion media → suggestion-item media → included-meal media → restaurant media → fallback.
 * resolvePublicMedia normalizes Google Drive viewer links, JSON strings, objects and arrays.
 */
export function resolveSuggestionImage({ suggestion, sectionItem = null, suggestionItems = [], includedMeals = [], restaurant = null, mediaRecords = [], fallback = null }) {
  const directSources = [
    suggestion?.hero_image_url,
    suggestion?.published_image,
    suggestion?.base44_media,
    suggestion?.uploaded_image,
    suggestion?.cover_image,
    suggestion?.image,
    suggestion?.image_url,
    suggestion?.thumbnail,
    suggestion?.thumbnail_url,
    suggestion?.media,
    suggestion?.images,
    sectionItem?.image,
    sectionItem?.image_url,
    sectionItem?.media,
    ...(mediaRecords || []),
  ];
  for (const src of directSources) {
    const resolved = resolvePublicMedia(src, null);
    if (resolved) return resolved;
  }
  for (const item of (suggestionItems || [])) {
    const resolved = resolvePublicMedia(item?.image_url ?? item?.image ?? item?.media ?? item?.hero_image_url, null);
    if (resolved) return resolved;
  }
  for (const meal of (includedMeals || [])) {
    const resolved = resolvePublicMedia(meal?.image_url ?? meal?.image ?? meal?.media ?? meal?.images ?? meal?.cover_image, null);
    if (resolved) return resolved;
  }
  const restImg = resolvePublicMedia(restaurant?.image_url ?? restaurant?.cover_url ?? restaurant?.image ?? restaurant?.logo, null);
  if (restImg) return restImg;
  return fallback;
}

/**
 * Canonical suggestion view model — used by every consumer so image + relations
 * are never stripped during mapping/filtering.
 */
export function buildSuggestionViewModel({ suggestion, sectionItem = null, suggestionItems = [], includedMeals = [], restaurant = null, mediaRecords = [], fallback = null }) {
  const pkg = normalizePackage(suggestion?.package_level ?? suggestion?.package_type ?? suggestion?.package ?? suggestion?.tier);
  const fb = fallback || suggestionFallback(pkg);
  const displayImage = resolveSuggestionImage({ suggestion, sectionItem, suggestionItems, includedMeals, restaurant, mediaRecords, fallback: fb });
  return {
    ...suggestion,
    id: String(suggestion?.id),
    title: suggestion?.title_ar ?? suggestion?.name_ar ?? suggestion?.title ?? suggestion?.name ?? 'اقتراح TAMAM',
    packageType: pkg,
    package_level: pkg,
    displayImage,
    suggestionItems,
    includedMeals,
    restaurant,
    price: suggestion?.display_price ?? suggestion?.current_price ?? suggestion?.price ?? suggestion?.total_price ?? null,
  };
}

// Backward-compatible alias (existing imports keep working).
export const getSuggestionDisplayImage = resolveSuggestionImage;