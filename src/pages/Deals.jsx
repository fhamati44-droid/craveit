import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeals } from '@/lib/api';
import { buildTiers, currentTier, nextTier, countdown, pad, tierProgress } from '@/lib/dealTiers';
import { SkeletonCard, ErrorState } from '@/components/tamam/customer/States';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function Deals() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);

  const load = () => { setLoading(true); setError(false); getDeals().then(d => setDeals(d || [])).catch(() => setError(true)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState onRetry={load} />;

  return (
    <div className="pt-4 pb-8">
      <div className="px-4 mb-5">
        <h1 className="text-headline-lg font-bold">عروض TAMAM الجماعية</h1>
        <p className="text-body-md text-on-surface-variant">انضم للعرض، وكل ما زاد عددنا، السعر بينزل للجميع.</p>
      </div>
      <div className="px-4 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : deals.length ? (
          deals.map(d => <DealListCard key={d.id} deal={d} onOpen={() => navigate(`/deals/${d.id}`)} />)
        ) : (
          <div className="text-center py-16 text-on-surface-variant"><p className="text-4xl mb-2">🎉</p><p>ما في عروض جماعية هسا</p></div>
        )}
      </div>
    </div>
  );
}

function DealListCard({ deal, onOpen }) {
  const cd = countdown(deal.end_time || deal.valid_until);
  const tiers = buildTiers(deal);
  const participants = deal.participants_count ?? deal.participants ?? 0;
  const cur = currentTier(tiers, participants);
  const next = nextTier(tiers, participants);
  const pct = tierProgress(tiers, participants);
  return (
    <button onClick={onOpen} className="block w-full text-right bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform">
      <div className="relative h-40">
        {deal.image_url ? <img className="w-full h-full object-cover" src={deal.image_url} alt={deal.title} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-4xl">🎉</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />
        {cd && !cd.expired && (
          <div className="absolute bottom-2 left-2 bg-tertiary text-on-tertiary px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
            <Icon name="schedule" className="text-xs" /> {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
          </div>
        )}
        {cd?.expired && <div className="absolute top-2 left-2 bg-error text-on-error px-2 py-1 rounded-lg text-[10px] font-bold">انتهى العرض</div>}
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-bold">{deal.title || deal.name || 'عرض جماعي'}</h3>
        <div className="flex items-end gap-2">
          {cur && <span className="text-primary text-2xl font-bold">₪{Math.round(cur.price)}</span>}
          {deal.original_price != null && <span className="text-on-surface-variant line-through text-xs mb-1">₪{deal.original_price}</span>}
        </div>
        <div className="space-y-1.5">
          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden border border-outline-variant/20"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-tertiary">{next ? `الهدف القادم ₪${Math.round(next.price)}` : 'وصلنا أفضل سعر'}</span>
            <span className="text-primary">{participants} مشترك</span>
          </div>
        </div>
      </div>
    </button>
  );
}