/**
 * Site configuration — support WhatsApp number.
 * Stored in localStorage `tamam_support_whatsapp` so the admin can set it
 * without a code change. If empty, the WhatsApp CTA shows a fallback.
 */
export function getSupportWhatsApp() {
  try {
    return localStorage.getItem('tamam_support_whatsapp') || '';
  } catch {
    return '';
  }
}

export function setSupportWhatsApp(num) {
  try {
    localStorage.setItem('tamam_support_whatsapp', num);
  } catch {}
}

/** Normalize: strip +, spaces, leading 00 or 0; keep 972 prefix. */
export function normalizeWhatsAppNumber(raw) {
  if (!raw) return '';
  let n = String(raw).replace(/[^\d]/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('972')) return n;
  if (n.startsWith('0')) return '972' + n.slice(1);
  return n;
}