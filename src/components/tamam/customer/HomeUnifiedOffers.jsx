import { useState, useEffect } from 'react';
import { listUnifiedOffers } from '@/lib/unifiedOfferApi';
import UnifiedOfferCard from './UnifiedOfferCard';

/**
 * Additive Home section: unified offer feed over BOTH backends.
 * Renders ONLY when real, visible offers exist for the customer. Never replaces
 * Mood / Picks / Community / Khabya. Preserves existing Home identity; this is
 * an extra strip, not a promotions marketplace.
 */
export default function HomeUnifiedOffers() {
  const phone = (typeof localStorage !== 'undefined' && localStorage.getItem('user_phone')) || '';
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // include_demo is decided server-side by admin/test context; customers never see demo.
    listUnifiedOffers({ phone, include_demo: false })
      .then((list) => { if (!cancelled) setOffers(Array.isArray(list) ? list : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [phone]);

  if (loading || offers.length === 0) return null;

  return (
    <section className="px-4 py-3">
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="material-symbols-outlined text-tamam-green-bright text-[20px]">local_offer</span>
          <h2 className="text-headline-sm font-bold text-tamam-text">عروض TAMAM</h2>
        </div>
        <p className="text-body-sm text-tamam-text-muted leading-snug">عروض متاحة إسا — اختار اللي يناسبك.</p>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {offers.map((u) => <UnifiedOfferCard key={`${u.source_type}_${u.id}`} u={u} />)}
      </div>
    </section>
  );
}