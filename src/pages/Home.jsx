import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublishedHomepage } from '@/lib/homepageApi';
import { getTimeAwareHomepage, clearTimeAwareCache } from '@/lib/homepageTimeApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import { useLanguage } from '@/lib/i18n/LanguageContext';
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
// Time-aware slot components
import TimeAwareHero from '@/components/tamam/customer/TimeAwareHero';
import TimeAwareTopSuggestions from '@/components/tamam/customer/TimeAwareTopSuggestions';
import TimeAwareBanner from '@/components/tamam/customer/TimeAwareBanner';
import TimeAwareCarousel from '@/components/tamam/customer/TimeAwareCarousel';

export default function Home() {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const [data, setData] = useState(null);
  const [timeData, setTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dealView, setDealView] = useState(null);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const [home, deals, timeContent] = await Promise.all([
        getPublishedHomepage().catch((e) => { console.error('homepage error', e); return null; }),
        listPublicDeals().catch(() => []),
        getTimeAwareHomepage().catch(() => null),
      ]);
      setData(home || {});
      setTimeData(timeContent);
      if (timeContent?.current_period) {
        track('homepage_time_period_viewed', { period_id: timeContent.current_period.id, locale });
      }
      const active = (deals || []).find((v) => v.status === 'active');
      setDealView(active ? { deal: active.deal, thresholds: active.thresholds, participants: active.participants } : null);
    } catch (e) { console.error(e); setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [locale]);

  // Refresh time-aware content when browser returns to foreground
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeAwareCache();
        getTimeAwareHomepage().then((td) => {
          setTimeData(td);
          if (td?.current_period) track('homepage_time_period_changed', { period_id: td.current_period.id, locale });
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [locale]);

  if (error) return <ErrorState title="ما قدرنا نحمّل البيانات" onRetry={load} />;

  return (
    <div className="flex flex-col pb-6">
      {/* 1. Active order tracking (STABLE) */}
      <HomepageActiveOrderCard />

      {/* 2. Time-aware hero — falls back to existing static hero (TIME-AWARE) */}
      <TimeAwareHero timeData={timeData} fallback={<HomepageSuggestionHeroCarousel fallbackHero={data?.hero} />} />

      {/* 3. Time-aware top suggestions — falls back to existing PackageCards (TIME-AWARE) */}
      <TimeAwareTopSuggestions timeData={timeData} fallback={<PackageCards packages={data?.packages} />} />

      {/* 4. Active group deal banner (STABLE) */}
      {dealView && (
        <section className="px-4 py-4">
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants}
            onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}

      {/* 5. Clickable mood banners (STABLE) */}
      <HomeMoodBanners />

      {/* 6. Discovery sections — 10 carousels + 3 banners (STABLE) */}
      <HomeDiscoverySections />

      {/* 7. Featured restaurants (STABLE) */}
      <LazySection><FeaturedRestaurants restaurants={data?.featuredRestaurants} loading={loading} title="مطاعم بنرشحها" /></LazySection>

      {/* 8. Time-aware banner 1 (TIME-AWARE) — only renders if content exists */}
      <TimeAwareBanner timeData={timeData} slotKey="homepage_time_banner_1" />

      {/* 9. Payment trust strip (STABLE) */}
      <PaymentTrustStrip />

      {/* 10. Time-aware carousel 1 (TIME-AWARE) — only renders if content exists */}
      <TimeAwareCarousel timeData={timeData} slotKey="homepage_time_carousel_1" />

      {/* 11. Trust cards (STABLE) */}
      <ClickableTrustCards />

      {/* 12. Loyalty balance (STABLE) */}
      <LoyaltyBalanceCard />

      {/* 13. Time-aware carousel 2 (TIME-AWARE) — only renders if content exists */}
      <TimeAwareCarousel timeData={timeData} slotKey="homepage_time_carousel_2" />

      {/* 14. Time-aware banner 2 (TIME-AWARE) — only renders if content exists */}
      <TimeAwareBanner timeData={timeData} slotKey="homepage_time_banner_2" />

      {/* 15. Assurance section (STABLE) */}
      <ClickableAssuranceSection />

      {/* 16. Footer (STABLE) */}
      <InfoFooter />
    </div>
  );
}