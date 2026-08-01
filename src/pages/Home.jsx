import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublishedHomepage } from '@/lib/homepageApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import { ErrorState } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';
import HomepageActiveOrderCard from '@/components/tamam/customer/HomepageActiveOrderCard';
import HomeHero from '@/components/tamam/customer/HomeHero';
import PackageCards from '@/components/tamam/customer/PackageCards';
import MostOrderedMeals from '@/components/tamam/customer/MostOrderedMeals';
import PopularCategoryMeals from '@/components/tamam/customer/PopularCategoryMeals';
import FeaturedRestaurants from '@/components/tamam/customer/FeaturedRestaurants';
import HomeActiveDealBanner from '@/components/tamam/customer/HomeActiveDealBanner';
import PaymentTrustStrip from '@/components/tamam/customer/PaymentTrustStrip';
import PurchaseJourneyTrustSection from '@/components/tamam/customer/PurchaseJourneyTrustSection';
import LoyaltyBalanceCard from '@/components/tamam/customer/LoyaltyBalanceCard';
import AssuranceSection from '@/components/tamam/customer/AssuranceSection';

export default function Home() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dealView, setDealView] = useState(null);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const [home, deals] = await Promise.all([
        getPublishedHomepage().catch((e) => { console.error('homepage error', e); return null; }),
        listPublicDeals().catch(() => []),
      ]);
      setData(home || {});
      const active = (deals || []).find((v) => v.status === 'active');
      setDealView(active ? { deal: active.deal, thresholds: active.thresholds, participants: active.participants } : null);
    } catch (e) { console.error(e); setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState title="ما قدرنا نحمّل البيانات" onRetry={load} />;

  return (
    <div className="flex flex-col">
      <HomepageActiveOrderCard />
      <HomeHero hero={data?.hero} />
      <PackageCards packages={data?.packages} />

      {dealView && (
        <section className="px-4 py-6 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-headline-md font-bold">عروض TAMAM</h2>
            <button onClick={() => navigate('/deals')} className="text-primary text-xs font-bold">شوف كل العروض</button>
          </div>
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants} onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}

      <MostOrderedMeals meals={data?.mostOrdered} loading={loading} />
      <PopularCategoryMeals categories={data?.popularCategories} loading={loading} />
      <FeaturedRestaurants restaurants={data?.featuredRestaurants} loading={loading} />

      <PaymentTrustStrip />
      <PurchaseJourneyTrustSection />
      <LoyaltyBalanceCard />
      <AssuranceSection />
    </div>
  );
}