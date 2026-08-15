import { useNavigate } from 'react-router-dom';
import { UNIFIED_CARD_STATE_LABEL, offerBadgesAr, effectivePrice, deepLinkFor } from '@/lib/unifiedOfferApi';

/**
 * UnifiedOffer card — renders ANY offer (CampaignOffer or GroupDeal) through
 * one contract. Customer never sees source_type. Tapping opens the unified
 * detail page (/offer/:source/:id).
 */
export default function UnifiedOfferCard({ u }) {
  const navigate = useNavigate();
  if (!u) return null;
  const price = effectivePrice(u);
  const hasDiscount = u.normal_price && price && price < u.normal_price;
  const badges = offerBadgesAr(u);
  const stateLabel = UNIFIED_CARD_STATE_LABEL[u.card_state] || '';

  return (
    <button
      onClick={() => navigate(deepLinkFor(u))}
      className="text-right w-[230px] shrink-0 bg-tamam-surface rounded-2xl border border-tamam-outline/30 overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div className="relative h-24 bg-tamam-surface-high flex items-center justify-center">
        <span className="material-symbols-outlined text-tamam-green-bright text-[40px] opacity-60">restaurant</span>
        <span className="absolute top-2 right-2 text-[9px] bg-tamam-green/15 text-tamam-green-bright px-2 py-0.5 rounded-full font-bold">{stateLabel}</span>
        {hasDiscount && <span className="absolute top-2 left-2 text-[9px] bg-tamam-gold text-tamam-ink px-2 py-0.5 rounded-full font-bold">خصم</span>}
      </div>
      <div className="p-2.5">
        <p className="font-bold text-sm text-tamam-text line-clamp-1">{u.title}</p>
        {u.subtitle && <p className="text-[10px] text-tamam-text-muted line-clamp-1 mt-0.5">{u.subtitle}</p>}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-tamam-green-bright text-sm">₪{Math.round(price || 0)}</span>
            {hasDiscount && <span className="text-[10px] text-tamam-text-muted line-through">₪{Math.round(u.normal_price)}</span>}
          </div>
          {u.unlock_type === 'point_locked' && <span className="material-symbols-outlined text-tamam-gold text-[14px]">lock</span>}
        </div>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {badges.slice(0, 2).map((b) => <span key={b} className="text-[8px] bg-tamam-surface-high text-tamam-text-muted px-1.5 py-0.5 rounded-full">{b}</span>)}
          </div>
        )}
      </div>
    </button>
  );
}