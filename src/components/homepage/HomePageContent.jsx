import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';
import { resolveHomeSlots } from './homePageConfig';
import HomepageActiveOrderCard from '@/components/tamam/customer/HomepageActiveOrderCard';
import HomeActiveDealBanner from '@/components/tamam/customer/HomeActiveDealBanner';
import HomeUnifiedOffers from '@/components/tamam/customer/HomeUnifiedOffers';
import TimeAwareTopSuggestions from '@/components/tamam/customer/TimeAwareTopSuggestions';
import HomeMoodGamePreview from '@/components/tamam/customer/HomeMoodGamePreview';
import HomeTamamGamePreview from '@/components/tamam/customer/HomeTamamGamePreview';
import KhabyaSection from '@/components/tamam/customer/KhabyaSection';
import CommunityMoodGameSection from '@/components/community/CommunityMoodGameSection';
import LoyaltyBalanceCard from '@/components/tamam/customer/LoyaltyBalanceCard';
import HomeTrustStrip from '@/components/tamam/customer/HomeTrustStrip';
import InfoFooter from '@/components/tamam/customer/InfoFooter';
import LazySection from '@/components/tamam/customer/LazySection';
import HeroSlot from './slots/HeroSlot';
import CampaignOffersSlot from './slots/CampaignOffersSlot';
import CategoriesSlot from './slots/CategoriesSlot';
import FeaturedMenusSlot from './slots/FeaturedMenusSlot';
import FeaturedRestaurantsSlot from './slots/FeaturedRestaurantsSlot';
import SecondaryBannerSlot from './slots/SecondaryBannerSlot';

/**
 * HomePageContent — THE single homepage renderer (source of truth).
 * Used by the public Home (mode="published", published config) and the admin
 * preview (mode="draft", draft config). Identical component, only the data
 * source differs. Slot structure is fixed here; CMS sections control each
 * slot's visibility (enabled + schedule) and content.
 */
export default function HomePageContent({ config, mode = 'published', timeData = null, dealView = null }) {
  const navigate = useNavigate();
  const slots = useMemo(() => resolveHomeSlots(config), [config]);

  return (
    <div className="flex flex-col pb-6">
      {slots.home_hero.visible && <HeroSlot slot={slots.home_hero} timeData={timeData} />}

      {slots.active_order.visible && <HomepageActiveOrderCard />}

      {slots.active_deal.visible && dealView && (
        <section className="px-4 py-3">
          <HomeActiveDealBanner
            deal={dealView.deal}
            thresholds={dealView.thresholds}
            participants={dealView.participants}
            onOpen={() => { track('home_active_deal_opened', { deal_id: dealView.deal.id }); navigate(`/deals/${dealView.deal.id}`); }}
          />
        </section>
      )}

      {slots.unified_offers.visible && <HomeUnifiedOffers />}

      {slots.time_suggestions.visible && <TimeAwareTopSuggestions timeData={timeData} />}

      {slots.home_campaign_offers.visible && <CampaignOffersSlot slot={slots.home_campaign_offers} timeData={timeData} />}

      {slots.home_categories.visible && <CategoriesSlot slot={slots.home_categories} />}

      {slots.home_featured_menus.visible && <FeaturedMenusSlot slot={slots.home_featured_menus} />}

      {slots.featured_restaurants.visible && <FeaturedRestaurantsSlot slot={slots.featured_restaurants} />}

      {slots.mood_game.visible && <HomeMoodGamePreview timeData={timeData} />}
      {slots.tamam_game.visible && <HomeTamamGamePreview />}

      {slots.khabya.visible && <KhabyaSection />}

      {slots.community_moods.visible && <CommunityMoodGameSection />}

      {slots.home_secondary_banner.visible && <SecondaryBannerSlot slot={slots.home_secondary_banner} />}

      {slots.rewards.visible && <LazySection><LoyaltyBalanceCard /></LazySection>}

      {slots.home_trust.visible && <HomeTrustStrip />}

      <InfoFooter />
    </div>
  );
}