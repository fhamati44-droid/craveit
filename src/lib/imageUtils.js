/**
 * Shared public image resolver.
 * Strips blob:, localhost, and HTTP-mixed-content URLs.
 * Resolves object-shaped values (e.g. { public_url, file_url }) to a string.
 */
export function resolvePublicImage(value, fallback = null) {
  if (!value) return fallback;

  if (typeof value === 'object') {
    const objectUrl =
      value.public_url ||
      value.publicUrl ||
      value.url ||
      value.file_url ||
      value.fileUrl ||
      value.image_url;
    return resolvePublicImage(objectUrl, fallback);
  }

  const url = String(value).trim();
  if (!url) return fallback;

  if (
    url.startsWith('blob:') ||
    url.startsWith('http://localhost') ||
    url.startsWith('https://localhost')
  ) {
    return fallback;
  }

  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }

  return url;
}

/**
 * Inline SVG placeholder so it always renders without a network request.
 */
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect width='200' height='150' fill='%23262B29'/%3E%3Ctext x='50%25' y='50%25' font-size='28' text-anchor='middle' dominant-baseline='central' fill='%2340493C'%3E🍽%3C/text%3E%3C/svg%3E";

/**
 * onError handler for <img> — prevents infinite reload loops.
 * Usage: onError={(e) => handleImageError(e)}
 */
export function handleImageError(event, fallback = PLACEHOLDER_IMAGE) {
  const img = event.currentTarget;
  if (!img || img.dataset.errored === 'true') return;
  img.dataset.errored = 'true';
  img.onerror = null;
  img.src = fallback;
}