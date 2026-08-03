/**
 * Shared utilities used by homepageEngine and homepageTimeEngine.
 * Plain module — no Deno.serve, just exports.
 */

export const ADMIN = (user) => user && user.role === 'admin';

export function parseJSON(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export function extractDriveId(value) {
  if (!value) return null;
  const text = String(value).trim();
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) { const m = text.match(p); if (m && m[1]) return m[1]; }
  return null;
}

/** Resolve a media value to a public URL (normalizes Google Drive links). */
export function srvResolve(v) {
  if (!v) return null;
  const text = String(v).trim();
  if (!text) return null;
  if (/drive\.google\.com|lh3\.googleusercontent/.test(text)) {
    const fid = extractDriveId(text);
    if (fid) return `https://lh3.googleusercontent.com/d/${fid}`;
  }
  if (text.startsWith('http')) return text;
  return null;
}

/** Proxy + unwrap helpers for supabaseProxy calls. */
export function makeProxy(base44) {
  return (action, payload) => base44.asServiceRole.functions.invoke('supabaseProxy', { action, payload });
}

export function unwrap(r) {
  return (r && (r.data?.data || r.data)) || [];
}