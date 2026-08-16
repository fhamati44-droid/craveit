import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublishedHomepage } from '@/lib/homepageApi';
import { getTimeAwareHomepage, clearTimeAwareCache } from '@/lib/homepageTimeApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ErrorState } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';
import HomepageActiveOrderCard from '@/components/tamam/customer/HomepageActiveOrderCard';
import FeaturedRestaurants from '@/components/tamam/customer/FeaturedRestaurants';
import HomeActiveDealBanner from '@/components/tamam/customer/HomeActiveDealBanner';
import LoyaltyBalanceCard from '@/components/tamam/customer/LoyaltyBalanceCard';
import HomeMoodBanners from '@/components/tamam/customer/HomeMoodBanners';
import InfoFooter from '@/components/tamam/customer/InfoFooter';
import LazySection from '@/components/tamam/customer/LazySection';
import CommunityMoodGameSection from '@/components/community/CommunityMoodGameSection';
import KhabyaSection from '@/components/tamam/customer/KhabyaSection';
import HomeUnifiedOffers from '@/components/tamam/customer/HomeUnifiedOffers';
import HomeMoodGamePreview from '@/components/tamam/customer/HomeMoodGamePreview';
import HomeTamamGamePreview from '@/components/tamam/customer/HomeTamamGamePreview';
import TimeAwareTopSuggestions from '@/components/tamam/customer/TimeAwareTopSuggestions';
import HomeTrustStrip from '@/components/tamam/customer/HomeTrustStrip';
import HomeIntentHero from '@/components/tamam/customer/HomeIntentHero';

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
      {/* 0. Intent hero — fast first decision (مود / اقتراحات / بحث) */}
      <HomeIntentHero />

      {/* 1. Active order — conditional only */}
      <HomepageActiveOrderCard />

      {/* 2. Interactive Mood Game preview (build your own mood) */}
      <HomeMoodGamePreview timeData={timeData} />

      {/* 2b. TAMAM mood-orbit game — playable from Home (شو مودك؟) */}
      <HomeTamamGamePreview />

      {/* 3. Quick Mood selector */}
      <HomeMoodBanners />

      {/* 3b. Active offer strip — moved up so live offers are seen early */}
      {dealView && (
        <section className="px-4 py-3">
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants}
            onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}

      {/* 4. TAMAM Picks — food recommendations */}
      <TimeAwareTopSuggestions timeData={timeData} />

      {/* 5. خبايا TAMAM (additive point-locked offers) */}
      <KhabyaSection />

      {/* 5b. Community preview */}
      <CommunityMoodGameSection />

      {/* 5c. Unified offers (Campaign + GroupDeal, additive, only when offers exist) */}
      <HomeUnifiedOffers />

      {/* 6. Curated restaurants */}
      <LazySection>
        <FeaturedRestaurants
          restaurants={data?.featuredRestaurants}
          loading={loading}
          title="مطاعم اخترناها بعناية"
          onViewAll={() => { track('home_restaurants_opened', { locale }); navigate('/restaurants'); }}
        />
      </LazySection>

      {/* 7. Loyalty (contextual) */}
      <LazySection><LoyaltyBalanceCard /></LazySection>

      {/* 8. Consolidated Trust */}
      <HomeTrustStrip />

      {/* 9. Footer */}
      <InfoFooter />
    </div>
  );
}