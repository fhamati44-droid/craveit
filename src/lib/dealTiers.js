// Threshold pricing + countdown helpers for group deals.
// Tiers derive from real deal price fields when present, with a sensible
// 3-level structure (1 / 5 / 10 participants) so the UI always has milestones.
export function buildTiers(deal) {
  if (!deal) return [];
  const original = deal.original_price ?? deal.current_price ?? deal.price ?? null;
  const current = deal.current_price ?? deal.price ?? original;
  const best = current != null ? Math.max(1, Math.round((current * 0.82) / 5) * 5) : null;
  if (current == null) return [];
  return [
    { at: 1, price: original != null ? original : current },
    { at: 5, price: current },
    { at: 10, price: best },
  ];
}
export function currentTier(tiers, participants) {
  let t = tiers[0];
  for (const tier of tiers) if (participants >= tier.at) t = tier;
  return t;
}
export function nextTier(tiers, participants) {
  return tiers.find(t => t.at > participants) || null;
}
export function tierProgress(tiers, participants) {
  if (!tiers.length) return 0;
  const max = tiers[tiers.length - 1].at;
  return Math.min(100, Math.round((participants / max) * 100));
}
export function pad(n) { return String(Math.max(0, n)).padStart(2, '0'); }
export function countdown(endAt) {
  if (!endAt) return null;
  const end = new Date(endAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
  return { h: Math.floor(diff / 3.6e6), m: Math.floor((diff % 3.6e6) / 6e4), s: Math.floor((diff % 6e4) / 1000), expired: false };
}