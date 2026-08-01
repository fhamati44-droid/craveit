import { useState, useEffect } from 'react';
import { currentTier, nextTier, countdown, pad, sortTiers } from '@/lib/groupDealApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function JoinedDealMiniBanner({ deal, thresholds, participants, onOpen }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const tiers = sortTiers(thresholds || []);
  const cur = currentTier(tiers, participants, 0, deal.counting_method);
  const next = nextTier(tiers, participants, 0, deal.counting_method);
  const cd = countdown(deal.end_at);
  return (
    <section className="px-4 py-3">
      <button onClick={onOpen} className="w-full bg-primary/10 border border-primary/30 rounded-2xl p-3 flex items-center justify-between active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0"><Icon name="group" className="text-primary" /></div>
          <div className="text-right min-w-0">
            <div className="text-[10px] text-primary font-bold">أنت مشترك بعرض</div>
            <div className="text-sm font-bold truncate">{deal.title}</div>
            <div className="text-[10px] text-on-surface-variant">{participants} مشترك · {cur ? `₪${Math.round(cur.price)}` : ''}{next ? ` → ₪${Math.round(next.price)}` : ''}</div>
          </div>
        </div>
        <div className="text-left flex-shrink-0">
          {cd && !cd.expired ? <div className="text-xs font-bold tabular-nums text-primary">{pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}</div> : <span className="text-[10px] text-on-surface-variant">انتهى</span>}
          <div className="text-[10px] text-primary font-bold">تابع العرض</div>
        </div>
      </button>
    </section>
  );
}