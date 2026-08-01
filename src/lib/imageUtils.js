/**
 * Shared public image resolver.
 * Strips blob:, localhost, and HTTP-mixed-content URLs.
 * Resolves object-shaped values (e.g. { public_url, file_url }) to a string.
 */
const DRIVE_PATTERNS = [
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
  /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
];

/** Extract a Google Drive file ID from any common share-link format. */
export function extractGoogleDriveFileId(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  for (const p of DRIVE_PATTERNS) {
    const m = text.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

/** Normalize a Google Drive viewer link to a direct googleusercontent content URL. */
export function normalizeGoogleDriveImageUrl(value) {
  const fileId = extractGoogleDriveFileId(value);
  if (!fileId) return null;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/** Detect whether a resolved URL points to Google-hosted media. */
export function isGoogleMediaImage(url) {
  if (!url) return false;
  return /googleusercontent\.com|drive\.google\.com|drive\.usercontent\.google\.com/.test(String(url));
}

/** Pick the first valid media value from a priority-ordered list of field values. */
export function firstValidMedia(...values) {
  for (const v of values) {
    const r = resolvePublicMedia(v);
    if (r) return r;
  }
  return null;
}

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

  // Google Drive viewer links → direct googleusercontent content URL (no redirect, renders in production)
  if (/drive\.google\.com|lh3\.googleusercontent\.com/.test(text)) {
    const normalized = normalizeGoogleDriveImageUrl(text);
    if (normalized) return normalized;
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