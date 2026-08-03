import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublishedHomepage } from '@/lib/homepageApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import { ErrorState } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';
import HomepageActiveOrderCard from '@/components/tamam/customer/HomepageActiveOrderCard';
import HomepageSuggestionHeroCarousel from '@/components/tamam/customer/HomepageSuggestionHeroCarousel';
import PackageCards from '@/components/tamam/customer/PackageCards';
import FeaturedRestaurants from '@/components/tamam/customer/FeaturedRestaurants';
import HomeActiveDealBanner from '@/components/tamam/customer/HomeActiveDealBanner';
import HomeDiscoverySections from '@/components/tamam/customer/HomeDiscoverySections';
import PaymentTrustStrip from '@/components/tamam/customer/PaymentTrustStrip';
import ClickableTrustCards from '@/components/tamam/customer/ClickableTrustCards';
import LoyaltyBalanceCard from '@/components/tamam/customer/LoyaltyBalanceCard';
import ClickableAssuranceSection from '@/components/tamam/customer/ClickableAssuranceSection';
import HomeMoodBanners from '@/components/tamam/customer/HomeMoodBanners';
import InfoFooter from '@/components/tamam/customer/InfoFooter';
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

  return (
    <div className="flex flex-col pb-6">
      {/* Existing upper homepage — preserved */}
      <HomepageActiveOrderCard />
      <HomepageSuggestionHeroCarousel fallbackHero={data?.hero} />
      <PackageCards packages={data?.packages} />
      {dealView && (
        <section className="px-4 py-4">
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants}
            onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}

      {/* Clickable mood banners */}
      <HomeMoodBanners />

      {/* Lower homepage — 10 carousels + 3 banners, always visible, CMS-independent */}
      <HomeDiscoverySections />

      {/* Existing trust + featured */}
      <LazySection><FeaturedRestaurants restaurants={data?.featuredRestaurants} loading={loading} title="مطاعم بنرشحها" /></LazySection>
      <PaymentTrustStrip />
      <ClickableTrustCards />
      <LoyaltyBalanceCard />
      <ClickableAssuranceSection />
      <InfoFooter />
    </div>
  );
}