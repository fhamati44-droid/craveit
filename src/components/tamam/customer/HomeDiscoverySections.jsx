import { useState, useEffect } from 'react';
import { getDiscoveryFeed } from '@/lib/homepageApi';
import DiscoveryCarousel from './DiscoveryCarousel';
import DiscoveryBanner from './DiscoveryBanner';
import BudgetInline from './BudgetInline';
import LazySection from './LazySection';

const DEFAULTS = {
  timeNow: { title: 'شو بناسبك هسا؟', subtitle: 'اقتراحات حسب الوقت والمود', card_variant: 'compact', view_all_route: '/restaurants', view_all_label: 'عرض الكل' },
  tamamPicks: { title: 'اختيارات تستاهل التجربة', subtitle: 'وجبات اخترناها بعناية إلك', card_variant: 'feature', badge: 'اختيار TAMAM', view_all_route: '/restaurants', view_all_label: 'عرض الكل' },
  family: { title: 'للعيلة واللّمات', subtitle: 'وجبات وصواني بتكفي الكل', card_variant: 'wide', view_all_route: '/restaurants', view_all_label: 'عرض الكل' },
  lunch: { title: 'غدا اليوم', subtitle: 'وجبات مشبعة بدون حيرة', card_variant: 'tall', view_all_route: '/restaurants', view_all_label: 'عرض الكل' },
  quick: { title: 'سريع وخفيف', subtitle: 'للجوع السريع أو لما بدك إشي خفيف', card_variant: 'medium', view_all_route: '/restaurants', view_all_label: 'عرض الكل' },
  newDiscovery: { title: 'جديد على TAMAM', subtitle: 'وجبات انضافت جديد وتستاهل تنجرّب', card_variant: 'new', badge: 'جديد', view_all_route: '/restaurants', view_all_label: 'عرض الكل' },
  mixPlus: { title: 'Mix وPlus وأفكار أكثر', subtitle: 'مقترحات جاهزة وتجميعات مختلفة', card_variant: 'compact', view_all_route: '/tamam-suggestions?package=all', view_all_label: 'عرض الكل' },
  desserts: { title: 'حلويات وتسالي', subtitle: 'إشي حلو أو تسالي تكمل فيها القعدة', card_variant: 'circular', view_all_route: '/restaurants', view_all_label: 'عرض الكل' },
  completeOrder: { title: 'كمّل طلبك', subtitle: 'مشروب، تحلاية أو إضافة صغيرة', card_variant: 'mini', view_all_route: '/restaurants', view_all_label: 'عرض الكل' },
  budget: { title: 'خيارات بسعر مريح', subtitle: 'وجبات بتناسب ميزانيات مختلفة', ranges: [] },
  homeKitchenBanner: { headline: 'مطبخ البيت مسكّر؟', subtitle: 'ولا يهمك، وجبات جاهزة للعيلة بتوصلك.', cta_label: 'شوف الوجبات', layout: 'split', destination: '/restaurants' },
  lateNightBanner: { headline: 'جعان آخر الليل؟', subtitle: 'اقتراحات سريعة للسهرة.', cta_label: 'شوف الاقتراحات', layout: 'icon', destination: '/tamam-suggestions' },
  browseRestaurantsBanner: { headline: 'بدك تختار المطعم بنفسك؟', subtitle: 'كل المطاعم والمنيوات بمكان واحد.', cta_label: 'تصفح المطاعم', layout: 'dashed', destination: '/restaurants' },
};

/** Lower homepage: 10 carousels + 3 banners, CMS-independent, always visible. Loads real meals/suggestions with fallback. */
export default function HomeDiscoverySections() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    getDiscoveryFeed()
      .then((d) => { if (!cancelled) setData(d || {}); })
      .catch((e) => console.error('discovery feed error', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const f = (k) => ({ ...DEFAULTS[k], ...((data && data[k]) || {}) });

  return (
    <div className="flex flex-col">
      <LazySection><DiscoveryCarousel carousel={f('timeNow')} loading={loading} background="bg-surface-container-low/40" /></LazySection>
      <LazySection><DiscoveryCarousel carousel={f('tamamPicks')} loading={loading} /></LazySection>
      <LazySection><DiscoveryBanner banner={f('homeKitchenBanner')} /></LazySection>
      <LazySection><BudgetInline budget={f('budget')} loading={loading} /></LazySection>
      <LazySection><DiscoveryCarousel carousel={f('family')} loading={loading} /></LazySection>
      <LazySection><DiscoveryCarousel carousel={f('lunch')} loading={loading} background="bg-surface-container-low/40" /></LazySection>
      <LazySection><DiscoveryBanner banner={f('lateNightBanner')} /></LazySection>
      <LazySection><DiscoveryCarousel carousel={f('quick')} loading={loading} /></LazySection>
      <LazySection><DiscoveryCarousel carousel={f('newDiscovery')} loading={loading} /></LazySection>
      <LazySection><DiscoveryCarousel carousel={f('mixPlus')} loading={loading} background="bg-surface-container/60" /></LazySection>
      <LazySection><DiscoveryBanner banner={f('browseRestaurantsBanner')} /></LazySection>
      <LazySection><DiscoveryCarousel carousel={f('desserts')} loading={loading} /></LazySection>
      <LazySection><DiscoveryCarousel carousel={f('completeOrder')} loading={loading} /></LazySection>
    </div>
  );
}