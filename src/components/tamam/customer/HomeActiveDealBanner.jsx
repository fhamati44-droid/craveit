import { useState, useEffect } from 'react';
import { currentTier, nextTier, countdown, pad, tierProgress, sortTiers } from '@/lib/groupDealApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function HomeActiveDealBanner({ deal, thresholds, participants, onOpen }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const tiers = sortTiers(thresholds || []);
  const cur = currentTier(tiers, participants, 0, deal.counting_method);
  const next = nextTier(tiers, participants, 0, deal.counting_method);
  const cd = countdown(deal.end_at);
  const pct = tierProgress(tiers, participants);
  return (
    <button onClick={onOpen} className="block w-full text-right bg-surface-container border border-primary/30 rounded-2xl overflow-hidden active:scale-[0.99] transition-transform shadow-lg shadow-primary/5">
      <div className="relative h-40">
        {deal.hero_image
          ? <img src={deal.hero_image} alt={deal.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-4xl">🎉</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent" />
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-primary text-on-primary px-2 py-1 rounded-full text-[10px] font-bold">
          <span className="w-2 h-2 rounded-full bg-on-primary animate-pulse" /> عرض شغّال هسا
        </div>
        {cd && !cd.expired && (
          <div className="absolute bottom-3 left-3 bg-tertiary text-on-tertiary px-2 py-1 rounded-lg text-[10px] font-bold tabular-nums">{pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}</div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-bold truncate">{deal.title}</h3>
            {deal.restaurant_name_snapshot && <p className="text-[11px] text-on-surface-variant truncate">{deal.restaurant_name_snapshot}</p>}
          </div>
          <div className="text-left flex-shrink-0">
            {cur && <div className="text-primary text-xl font-bold">₪{Math.round(cur.price)}</div>}
            {deal.reference_price != null && <div className="text-on-surface-variant line-through text-xs">₪{Math.round(deal.reference_price)}</div>}
          </div>
        </div>
        {tiers.length > 0 && <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>}
        <div className="flex justify-between text-[11px] font-bold">
          <span className="text-primary">{participants} مشتركين</span>
          <span className="text-on-surface-variant">{next ? `ناقص ${Math.max(0, (next.min_participants || 0) - participants)} والسعر ₪${Math.round(next.price)}` : 'وصلنا لأفضل سعر'}</span>
        </div>
        <div className="flex items-center justify-end gap-1 text-primary font-bold text-sm pt-1"><span>{deal.banner_cta || 'شوف العرض'}</span><Icon name="arrow_back" /></div>
      </div>
    </button>
  );
}