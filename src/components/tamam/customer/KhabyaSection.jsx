import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listKhabya } from '@/lib/offerEngineApi';
import { track } from '@/lib/analytics';
import KhabyaCard from './KhabyaCard';
import OfferUnlockSheet from './OfferUnlockSheet';

/**
 * خبايا TAMAM — additive secondary engagement surface for point-locked offers.
 * Renders ONLY real, available locked offers. Never replaces Mood / Picks /
 * Community. Renders nothing when there are no locked offers (no fake scarcity).
 */
export default function KhabyaSection() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const phone = (typeof localStorage !== 'undefined' && localStorage.getItem('user_phone')) || '';

  useEffect(() => {
    let cancelled = false;
    listKhabya(phone)
      .then((list) => { if (!cancelled) { setOffers(list || []); (list || []).forEach((o) => track('locked_offer_seen', { deal_id: o.deal_id })); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [phone]);

  const open = (offer) => {
    if (offer.unlocked) {
      navigate(`/deals/${offer.deal_id}`);
      return;
    }
    setSelected(offer);
  };

  const onUnlocked = (dealId) => {
    setOffers((prev) => prev.map((o) => (o.deal_id === dealId ? { ...o, unlocked: true } : o)));
  };

  if (loading || offers.length === 0) return null;

  return (
    <section className="px-4 py-3">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-tamam-gold text-[20px] mg-breathe" style={{ filter: 'drop-shadow(0 0 6px rgba(234,196,92,0.4))' }}>lock</span>
            <h2 className="text-headline-sm font-bold text-tamam-text">خفايا تمام</h2>
          </div>
          <span className="text-[10px] font-bold text-tamam-gold/80 bg-tamam-gold/10 px-2 py-0.5 rounded-full">حصري بالنقاط</span>
        </div>
        <p className="text-body-sm text-tamam-text-muted leading-snug">في عروض مخبّاية — افتحها بنقاطك وشوف شو جوّا.</p>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {offers.map((o) => (
          <KhabyaCard key={o.deal_id} offer={o} onTap={open} />
        ))}
      </div>
      <OfferUnlockSheet offer={selected} onClose={() => setSelected(null)} onUnlocked={onUnlocked} />
    </section>
  );
}