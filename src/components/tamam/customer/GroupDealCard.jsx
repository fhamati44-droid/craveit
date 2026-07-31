import { useState, useEffect } from 'react';
import { Users, Clock } from 'lucide-react';

/** Real-time countdown from an actual end timestamp. */
function useCountdown(endAt) {
  const [sec, setSec] = useState(() =>
    endAt ? Math.max(0, Math.floor((new Date(endAt).getTime() - Date.now()) / 1000)) : 0
  );
  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => {
      setSec(Math.max(0, Math.floor((new Date(endAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [endAt]);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Group deal card fed by dealToCard() adapter — uses real end time + participants. */
export default function GroupDealCard({ deal, onOpen }) {
  const left = useCountdown(deal?.endAt);
  return (
    <div className="rounded-2xl bg-tamam-surface overflow-hidden border border-tamam-outline/30">
      <div className="relative h-32 bg-tamam-surface-low">
        {deal?.imageUrl ? (
          <img src={deal.imageUrl} alt={deal?.name || ''} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🤝</div>
        )}
        {deal?.endAt && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-tamam-gold text-tamam-ink flex items-center gap-1">
            <Clock size={11} /> {left}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-tamam-text text-sm">{deal?.name || 'صفقة جماعية'}</h3>
        {deal?.restaurantName && <p className="text-tamam-text-muted text-[11px] mt-0.5">{deal.restaurantName}</p>}
        <div className="flex items-center gap-2 mt-2">
          {deal?.originalPrice != null && <span className="text-tamam-text-muted text-xs line-through">₪{deal.originalPrice}</span>}
          {deal?.currentPrice != null && <span className="font-extrabold text-tamam-green-bright">₪{Math.round(deal.currentPrice)}</span>}
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] text-tamam-text-muted">
          <span className="flex items-center gap-1"><Users size={12} /> {deal?.participants ?? 0} مشترك</span>
          {deal?.nextThreshold != null && <span>الهدف القادم: {deal.nextThreshold}</span>}
        </div>
        <button onClick={onOpen} className="mt-3 w-full bg-tamam-gold text-tamam-ink font-bold text-sm py-2.5 rounded-xl">
          انضم للصفقة
        </button>
      </div>
    </div>
  );
}