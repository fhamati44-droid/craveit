import { useState, useEffect } from 'react';
import { currentTier, nextTier, tierProgress, sortTiers } from '@/lib/groupDealApi';
import { resolvePublicImage, handleImageError } from '@/lib/imageUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Human-friendly countdown — NEVER shows raw HHH:MM:SS.
 * Returns a safe, localized label from the real end_at data:
 *   < 60min  → "باقي 38 دقيقة"
 *   < 24h    → "لحد 17:00"
 *   >= 24h   → "باقي X يوم"
 *   expired  → "انتهى"
 *   invalid  → null (caller hides the badge)
 */
function friendlyCountdown(endIso) {
  if (!endIso) return null;
  const end = new Date(endIso).getTime();
  if (!isFinite(end)) return null;
  const ms = end - Date.now();
  if (ms <= 0) return { expired: true, label: 'انتهى' };
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return { expired: false, label: `باقي ${mins} دقيقة` };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    const d = new Date(end);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return { expired: false, label: `لحد ${hh}:${mm}` };
  }
  const days = Math.floor(hrs / 24);
  return { expired: false, label: `باقي ${days} ${days === 1 ? 'يوم' : 'أيام'}` };
}

/** Hide internal/technical campaign names like "DEAL A1" from customers. */
function isTechnicalTitle(t) {
  if (!t) return true;
  const s = t.trim();
  if (!s) return true;
  return /^(DEAL|TEST|CAMP|OFFER)\s|^[A-Z]{2,}[-_]?\d+$|^[A-Z]+-\d/i.test(s);
}

export default function HomeActiveDealBanner({ deal, thresholds, participants, onOpen }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);

  const tiers = sortTiers(thresholds || []);
  const cur = currentTier(tiers, participants, 0, deal.counting_method);
  const next = nextTier(tiers, participants, 0, deal.counting_method);
  const pct = tierProgress(tiers, participants);
  const cd = friendlyCountdown(deal.end_at);
  const techTitle = isTechnicalTitle(deal.title);
  const displayTitle = techTitle ? 'عرض شغّال اليوم' : deal.title;
  const showParticipants = participants != null && participants > 0;
  const hasDiscount = deal.reference_price != null && cur && Math.round(cur.price) < Math.round(deal.reference_price);

  return (
    <button onClick={onOpen} className="block w-full text-right bg-tamam-surface-lowest border border-tamam-green/25 rounded-2xl overflow-hidden active:scale-[0.99] transition-transform">
      {/* Food-first hero image */}
      <div className="relative h-44">
        {deal.hero_image
          ? <img src={resolvePublicImage(deal.hero_image)} alt={displayTitle} className="w-full h-full object-cover" onError={handleImageError} />
          : <div className="w-full h-full bg-tamam-surface-high flex items-center justify-center text-4xl">🍽️</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-tamam-surface-lowest via-tamam-surface-lowest/30 to-transparent" />
        {/* Live badge */}
        <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-tamam-green text-tamam-ink px-2.5 py-1 rounded-full text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-tamam-ink animate-pulse" /> عرض شغّال اليوم
        </div>
        {/* Human-friendly countdown */}
        {cd && !cd.expired && (
          <div className="absolute bottom-3 left-3 bg-tamam-ink/85 backdrop-blur text-tamam-text px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-tamam-green-bright">schedule</span>{cd.label}
          </div>
        )}
      </div>

      <div className="p-4 space-y-2.5">
        {/* Title + restaurant */}
        <div className="min-w-0">
          <h3 className="font-bold text-[16px] text-tamam-text leading-tight line-clamp-1">{displayTitle}</h3>
          {deal.restaurant_name_snapshot && <p className="text-[11px] text-tamam-text-muted truncate mt-0.5">{deal.restaurant_name_snapshot}</p>}
        </div>

        {/* Price hierarchy — price first, strike-through below */}
        <div className="flex items-baseline gap-2">
          {cur && <span className="text-tamam-green-bright text-[26px] font-bold leading-none" dir="ltr">₪{Math.round(cur.price)}</span>}
          {hasDiscount && <span className="text-tamam-text-muted line-through text-[13px]" dir="ltr">₪{Math.round(deal.reference_price)}</span>}
        </div>

        {/* Tier progress — only when meaningful (participants > 0) */}
        {showParticipants && tiers.length > 0 && (
          <>
            <div className="w-full h-1.5 bg-tamam-surface-high rounded-full overflow-hidden"><div className="h-full bg-tamam-green rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-tamam-green-bright">{participants} مشتركين</span>
              <span className="text-tamam-text-muted">{next ? `ناقص ${Math.max(0, (next.min_participants || 0) - participants)} والسعر نزل` : 'وصلنا لأفضل سعر'}</span>
            </div>
          </>
        )}

        {/* Clear CTA */}
        <div className="flex items-center justify-center gap-1.5 bg-tamam-green/12 rounded-xl py-2.5 text-tamam-green-bright font-bold text-sm mt-1">
          <span>{deal.banner_cta || 'شوف العرض'}</span>
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </div>
      </div>
    </button>
  );
}