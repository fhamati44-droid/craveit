/**
 * Shared public image resolver.
 * Strips blob:, localhost, and HTTP-mixed-content URLs.
 * Resolves object-shaped values (e.g. { public_url, file_url }) to a string.
 */
export function resolvePublicMedia(value, fallback = null) {
  if (!value) return fallback;

  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = resolvePublicMedia(item, null);
      if (resolved) return resolved;
    }
    return fallback;
  }

  if (typeof value === 'object') {
    const possibleValue =
      value.public_url ??
      value.publicUrl ??
      value.file_url ??
      value.fileUrl ??
      value.download_url ??
      value.downloadUrl ??
      value.secure_url ??
      value.secureUrl ??
      value.src ??
      value.url ??
      value.path ??
      value.image_url ??
      null;
    return resolvePublicMedia(possibleValue, fallback);
  }

  let text = String(value).trim();
  if (!text) return fallback;

  // JSON-encoded media value (stringified object/array)
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      return resolvePublicMedia(JSON.parse(text), fallback);
    } catch (e) {
      console.warn('INVALID_MEDIA_JSON', e);
    }
  }

  // Reject non-public / non-persistent sources
  if (
    text.startsWith('blob:') ||
    text.startsWith('data:') ||
    text.includes('localhost')
  ) {
    return fallback;
  }

  if (text.startsWith('http://')) {
    text = text.replace(/^http:\/\//, 'https://');
  }

  // Relative path -> resolve against current origin (production domain)
  if (text.startsWith('/')) {
    return `${window.location.origin}${text}`;
  }

  // Google Drive file viewer URLs are not direct image links — convert to thumbnail.
  const driveMatch = text.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1000`;
  }
  const openMatch = text.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w1000`;
  }
  if (text.includes('drive.google.com/uc?') && !text.includes('export=view')) {
    return text + '&export=view';
  }

  return text;
}

// Alias for backward compatibility
export const resolvePublicImage = resolvePublicMedia;

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