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
      {/* Existing upper homepage preserved */}
      <HomepageActiveOrderCard />
      <HomeHero hero={data?.hero} />
      <PackageCards packages={data?.packages} />

      {/* 1. شو بناسبك هسا؟ */}
      <LazySection><HomepageMealCarousel carousel={data?.timeNow} loading={loading} background="bg-surface-container-low/40" /></LazySection>
      {/* 2. اختيارات تستاهل التجربة */}
      <LazySection><HomepageMealCarousel carousel={data?.tamamPicks} loading={loading} /></LazySection>
      {/* Banner 1 — مطبخ البيت مسكّر؟ */}
      <LazySection><HomepageEditorialBanner banner={data?.homeKitchenBanner} /></LazySection>
      {/* 3. خيارات بسعر مريح */}
      <LazySection><BudgetMealsSection budget={data?.budget} excludeIds={excludeIds} /></LazySection>
      {/* 4. للعيلة واللّمات */}
      <LazySection><HomepageMealCarousel carousel={data?.family} loading={loading} /></LazySection>
      {/* 5. غدا اليوم */}
      <LazySection><HomepageMealCarousel carousel={data?.lunch} loading={loading} background="bg-surface-container-low/40" /></LazySection>
      {/* Banner 2 — جعان آخر الليل؟ */}
      <LazySection><HomepageEditorialBanner banner={data?.lateNightBanner} /></LazySection>
      {/* 6. سريع وخفيف */}
      <LazySection><HomepageMealCarousel carousel={data?.quick} loading={loading} /></LazySection>
      {/* 7. جديد على TAMAM */}
      <LazySection><HomepageMealCarousel carousel={data?.newDiscovery} loading={loading} /></LazySection>
      {/* 8. Mix وPlus وأفكار أكثر */}
      <LazySection><HomepageMealCarousel carousel={data?.mixPlus} loading={loading} background="bg-surface-container/60" /></LazySection>
      {/* Banner 3 — بدك تختار المطعم بنفسك؟ */}
      <LazySection><HomepageEditorialBanner banner={data?.browseRestaurantsBanner} /></LazySection>
      {/* 9. حلويات وتسالي */}
      <LazySection><HomepageMealCarousel carousel={data?.desserts} loading={loading} /></LazySection>
      {/* 10. كمّل طلبك */}
      <LazySection><HomepageMealCarousel carousel={data?.completeOrder} loading={loading} /></LazySection>

      {/* Active group deal (existing) */}
      {dealView && (
        <section className="px-4 py-4">
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants}
            onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}

      {/* Featured restaurants (existing) + trust (existing) */}
      <LazySection><FeaturedRestaurants restaurants={data?.featuredRestaurants} loading={loading} title="مطاعم بنرشحها" /></LazySection>
      <PaymentTrustStrip />
      <PurchaseJourneyTrustSection />
      <LoyaltyBalanceCard />
      <AssuranceSection />
    </div>
  );
}