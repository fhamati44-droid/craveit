export function dealStatus(deal, now = Date.now()) {
  if (!deal) return 'ended';
  const start = deal.start_time ? new Date(deal.start_time).getTime() : null;
  const end = deal.end_time ? new Date(deal.end_time).getTime() : (deal.valid_until ? new Date(deal.valid_until).getTime() : null);
  if (start && now < start) return 'upcoming';
  if (end && now >= end) return 'ended';
  if (!start && !end) return deal.active === false ? 'ended' : 'active';
  return 'active';
}