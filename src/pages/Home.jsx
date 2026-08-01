import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPublishedHomepage } from '@/lib/homepageApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import { ErrorState } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';
import HomepageActiveOrderCard from '@/components/tamam/customer/HomepageActiveOrderCard';
import HomeHero from '@/components/tamam/customer/HomeHero';
import PackageCards from '@/components/tamam/customer/PackageCards';
import CuratedMealsSection from '@/components/tamam/customer/CuratedMealsSection';
import BudgetMealsSection from '@/components/tamam/customer/BudgetMealsSection';
import FeaturedRestaurants from '@/components/tamam/customer/FeaturedRestaurants';
import HomeActiveDealBanner from '@/components/tamam/customer/HomeActiveDealBanner';
import HomeUpcomingDealBanner from '@/components/tamam/customer/HomeUpcomingDealBanner';
import PaymentTrustStrip from '@/components/tamam/customer/PaymentTrustStrip';
import PurchaseJourneyTrustSection from '@/components/tamam/customer/PurchaseJourneyTrustSection';
import LoyaltyBalanceCard from '@/components/tamam/customer/LoyaltyBalanceCard';
import AssuranceSection from '@/components/tamam/customer/AssuranceSection';
import LazySection from '@/components/tamam/customer/LazySection';

export default function Home() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dealView, setDealView] = useState(null);
  const [upcomingDeal, setUpcomingDeal] = useState(null);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const [home, deals] = await Promise.all([
        getPublishedHomepage().catch((e) => { console.error('homepage error', e); return null; }),
        listPublicDeals().catch(() => []),
      ]);
      setData(home || {});
      const list = deals || [];
      const active = list.find((v) => v.status === 'active');
      const upcoming = list.find((v) => v.status === 'scheduled');
      setDealView(active ? { deal: active.deal, thresholds: active.thresholds, participants: active.participants } : null);
      setUpcomingDeal(upcoming?.deal || null);
    } catch (e) { console.error(e); setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState title="ما قدرنا نحمّل البيانات" onRetry={load} />;

  const excludeIds = data?.shownMealIds || [];

  return (
    <div className="flex flex-col pb-6">
      <HomepageActiveOrderCard />
      <HomeHero hero={data?.hero} />
      <PackageCards packages={data?.packages} />

      {data?.tamamPicks && <CuratedMealsSection section={data.tamamPicks} loading={loading} />}

      <LazySection>
        <BudgetMealsSection budget={data?.budget} excludeIds={excludeIds} />
      </LazySection>

      <LazySection>
        {data?.family && <CuratedMealsSection section={data.family} loading={false} />}
      </LazySection>
      <LazySection>
        {data?.quick && <CuratedMealsSection section={data.quick} loading={false} />}
      </LazySection>
      <LazySection>
        {data?.homeStyle && <CuratedMealsSection section={data.homeStyle} loading={false} />}
      </LazySection>
      <LazySection>
        {data?.newDiscovery && <CuratedMealsSection section={data.newDiscovery} loading={false} />}
      </LazySection>
      <LazySection>
        {data?.desserts && <CuratedMealsSection section={data.desserts} loading={false} />}
      </LazySection>

      {dealView && (
        <section className="px-4 py-6 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-headline-md font-bold">عروض TAMAM</h2>
            <button onClick={() => navigate('/deals')} className="text-primary text-xs font-bold">شوف كل العروض</button>
          </div>
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants} onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}

      {upcomingDeal && (
        <section className="px-4 py-4">
          <HomeUpcomingDealBanner deal={upcomingDeal} onOpen={() => navigate(`/deals/${upcomingDeal.id}`)} />
        </section>
      )}

      <LazySection>
        <FeaturedRestaurants restaurants={data?.featuredRestaurants} loading={loading} title="مطاعم بنرشحها" />
      </LazySection>

      <section className="px-4 py-6">
        <Link to="/restaurants" onClick={() => track('checkout_started_from_home', { target: 'restaurants' })} className="block h-12 bg-surface border border-outline-variant/30 font-bold rounded-xl text-center leading-[3rem]">
          تصفّح كل المطاعم
        </Link>
      </section>

      <PaymentTrustStrip />
      <PurchaseJourneyTrustSection />
      <LoyaltyBalanceCard />
      <AssuranceSection />
    </div>
  );
}