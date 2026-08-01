import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublishedHomepage } from '@/lib/homepageApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import { ErrorState } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';
import HomepageActiveOrderCard from '@/components/tamam/customer/HomepageActiveOrderCard';
import HomeHero from '@/components/tamam/customer/HomeHero';
import PackageCards from '@/components/tamam/customer/PackageCards';
import HomepageMealCarousel from '@/components/tamam/customer/HomepageMealCarousel';
import BudgetMealsSection from '@/components/tamam/customer/BudgetMealsSection';
import HomepageEditorialBanner from '@/components/tamam/customer/HomepageEditorialBanner';
import FeaturedRestaurants from '@/components/tamam/customer/FeaturedRestaurants';
import HomeActiveDealBanner from '@/components/tamam/customer/HomeActiveDealBanner';
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
  const excludeIds = data?.shownMealIds || [];

  return (
    <div className="flex flex-col pb-6">
      {/* Active order */}
      <HomepageActiveOrderCard />

      {/* Hero */}
      <HomeHero hero={data?.hero} />

      {/* Classic / Mix / Plus */}
      <PackageCards packages={data?.packages} />

      {/* Carousel 1 — شو بناسبك هسا؟ */}
      <LazySection>
        <HomepageMealCarousel carousel={data?.timeNow} loading={loading} background="bg-surface-container-low/40" />
      </LazySection>

      {/* Carousel 2 — اختيارات تستاهل التجربة */}
      <LazySection>
        <HomepageMealCarousel carousel={data?.tamamPicks} loading={loading} />
      </LazySection>

      {/* Small banner after carousel 2 */}
      <LazySection><HomepageEditorialBanner banner={data?.homeKitchenBanner} /></LazySection>

      {/* Carousel 3 — خيارات بسعر مريح */}
      <LazySection><BudgetMealsSection budget={data?.budget} excludeIds={excludeIds} /></LazySection>

      {/* Active group deal */}
      {dealView && (
        <section className="px-4 py-4">
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants}
            onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}

      {/* Carousel 4 — جديد على TAMAM */}
      <LazySection>
        <HomepageMealCarousel carousel={data?.newDiscovery} loading={loading} background="bg-surface-container-low/40" />
      </LazySection>

      {/* Small banner after carousel 4 */}
      <LazySection><HomepageEditorialBanner banner={data?.lateNightBanner} /></LazySection>

      {/* Carousel 5 — Mix وPlus وأفكار أكثر */}
      <LazySection>
        <HomepageMealCarousel carousel={data?.mixPlus} loading={loading} />
      </LazySection>

      {/* Featured restaurants */}
      <LazySection><FeaturedRestaurants restaurants={data?.featuredRestaurants} loading={loading} title="مطاعم بنرشحها" /></LazySection>

      {/* Browse-all-restaurants banner */}
      <LazySection><HomepageEditorialBanner banner={data?.browseRestaurantsBanner} /></LazySection>

      {/* Trust, rewards, support */}
      <PaymentTrustStrip />
      <PurchaseJourneyTrustSection />
      <LoyaltyBalanceCard />
      <AssuranceSection />
    </div>
  );
}