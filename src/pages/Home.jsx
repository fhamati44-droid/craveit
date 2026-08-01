import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublishedHomepage } from '@/lib/homepageApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import { ErrorState } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';
import HomepageActiveOrderCard from '@/components/tamam/customer/HomepageActiveOrderCard';
import HomeHero from '@/components/tamam/customer/HomeHero';
import PackageCards from '@/components/tamam/customer/PackageCards';
import CuratedMealsSection from '@/components/tamam/customer/CuratedMealsSection';
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
      {/* 2 — Active order card */}
      <HomepageActiveOrderCard />

      {/* 3 — Main hero */}
      <HomeHero hero={data?.hero} />

      {/* 4 — Classic / Mix / Plus */}
      <PackageCards packages={data?.packages} />

      {/* 5 — اختيارات اليوم */}
      {data?.tamamPicks && <CuratedMealsSection section={data.tamamPicks} loading={loading} />}

      {/* 6 — Banner: مطبخ البيت مسكّر؟ */}
      <LazySection><HomepageEditorialBanner banner={data?.homeKitchenBanner} /></LazySection>

      {/* 7 — على قد ميزانيتك */}
      <LazySection><BudgetMealsSection budget={data?.budget} excludeIds={excludeIds} /></LazySection>

      {/* 8 — للعيلة واللّمات */}
      <LazySection>{data?.family && <CuratedMealsSection section={data.family} loading={false} />}</LazySection>

      {/* 9 — Active group-deal banner */}
      {dealView && (
        <section className="px-4 py-4">
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants}
            onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}

      {/* 10 — غدا اليوم */}
      <LazySection>{data?.lunch && <CuratedMealsSection section={data.lunch} loading={false} />}</LazySection>

      {/* 11 — سريع وخفيف */}
      <LazySection>{data?.quick && <CuratedMealsSection section={data.quick} loading={false} />}</LazySection>

      {/* 12 — Banner: آخر الليل؟ */}
      <LazySection><HomepageEditorialBanner banner={data?.lateNightBanner} /></LazySection>

      {/* 13 — جديد على TAMAM */}
      <LazySection>{data?.newDiscovery && <CuratedMealsSection section={data.newDiscovery} loading={false} />}</LazySection>

      {/* 14 — أكل بيتي */}
      <LazySection>{data?.homeStyle && <CuratedMealsSection section={data.homeStyle} loading={false} />}</LazySection>

      {/* 15 — حلويات وتسالي */}
      <LazySection>{data?.desserts && <CuratedMealsSection section={data.desserts} loading={false} />}</LazySection>

      {/* 16 — كمّل طلبك */}
      <LazySection>{data?.completeOrder && <CuratedMealsSection section={data.completeOrder} loading={false} />}</LazySection>

      {/* 17 — Featured restaurants */}
      <LazySection><FeaturedRestaurants restaurants={data?.featuredRestaurants} loading={loading} title="مطاعم بنرشحها" /></LazySection>

      {/* 18 — Browse-all-restaurants banner */}
      <LazySection><HomepageEditorialBanner banner={data?.browseRestaurantsBanner} /></LazySection>

      {/* 19 — Payment, tracking, support and rewards trust section */}
      <PaymentTrustStrip />
      <PurchaseJourneyTrustSection />
      <LoyaltyBalanceCard />
      <AssuranceSection />
    </div>
  );
}