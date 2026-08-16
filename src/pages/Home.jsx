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
import HomeClassicMixPlus from '@/components/tamam/customer/HomeClassicMixPlus';

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

  const topSuggestion = timeData?.top_suggestions?.[0];

  return (
    <div className="flex flex-col pb-6">
      {/* 1. Food-first hero + intent chips */}
      <HomeIntentHero topSuggestion={topSuggestion} />

      {/* 2. Active order tracking (conditional) */}
      <HomepageActiveOrderCard />

      {/* 3. Active / limited offer (if relevant) */}
      {dealView && (
        <section className="px-4 py-3">
          <HomeActiveDealBanner deal={dealView.deal} thresholds={dealView.thresholds} participants={dealView.participants}
            onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }} />
        </section>
      )}

      {/* 3b. Additional unified offers (campaign + group deals, only when offers exist) */}
      <HomeUnifiedOffers />

      {/* 4. TAMAM Picks — food recommendation carousel */}
      <TimeAwareTopSuggestions timeData={timeData} />

      {/* 5. Restaurants — large visual cards */}
      <LazySection>
        <FeaturedRestaurants
          restaurants={data?.featuredRestaurants}
          loading={loading}
          title="مطاعم ممكن يعجبوك"
          onViewAll={() => { track('home_restaurants_opened', { locale }); navigate('/restaurants'); }}
        />
      </LazySection>

      {/* 6. Mood — "مش عارف شو بدك؟" (moved lower; solves indecision) */}
      <HomeMoodGamePreview timeData={timeData} />
      <HomeTamamGamePreview />

      {/* 7. Classic / Mix / Plus — decision simplifier (when suggestions exist) */}
      <HomeClassicMixPlus timeData={timeData} />

      {/* 8. خبايا TAMAM (point-locked offers) */}
      <KhabyaSection />

      {/* 9. Community teaser (max 2, social proof only) */}
      <CommunityMoodGameSection />

      {/* 10. TAMAM Points */}
      <LazySection><LoyaltyBalanceCard /></LazySection>

      {/* 11. Trust / service reassurance */}
      <HomeTrustStrip />

      {/* 12. Footer */}
      <InfoFooter />
    </div>
  );
}