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
import HomeMoodGamePreview from '@/components/tamam/customer/HomeMoodGamePreview';
import HomeTamamGameEntry from '@/components/tamam/customer/HomeTamamGameEntry';
import TimeAwareTopSuggestions from '@/components/tamam/customer/TimeAwareTopSuggestions';
import HomeTrustStrip from '@/components/tamam/customer/HomeTrustStrip';

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
      {/* 1. Active order — conditional only */}
      <HomepageActiveOrderCard />

      {/* 2. Interactive Mood Game preview (build your own mood) */}
      <HomeMoodGamePreview timeData={timeData} />

      {/* 2b. TAMAM mood-orbit game entry (شو مودك هسا؟ → suggestions) */}
      <HomeTamamGameEntry />

      {/* 3. Quick Mood selector */}
      <HomeMoodBanners />

      {/* 4. TAMAM Picks — food recommendations */}
      <TimeAwareTopSuggestions timeData={timeData} />

      {/* 5. Community preview */}
      <CommunityMoodGameSection />

      {/* 5b. خبايا TAMAM (additive point-locked offers) */}
      <KhabyaSection />

      {/* 6. Curated restaurants */}
      <LazySection>
        <FeaturedRestaurants
          restaurants={data?.featuredRestaurants}
          loading={loading}
          title="مطاعم اخترناها بعناية"
          onViewAll={() => { track('home_restaurants_opened', { locale }); navigate('/restaurants'); }}
        />
      </LazySection>

      {/* 7. Contextual Deal / Loyalty (lower, contextual) */}
      {dealView && (
        <section className="px-4 py-4">
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants}
            onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}
      <LazySection><LoyaltyBalanceCard /></LazySection>

      {/* 8. Consolidated Trust */}
      <HomeTrustStrip />

      {/* 9. Footer */}
      <InfoFooter />
    </div>
  );
}