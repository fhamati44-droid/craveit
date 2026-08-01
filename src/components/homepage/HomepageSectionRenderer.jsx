import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getRestaurants } from '@/lib/api';
import { autoRankMostOrdered } from '@/lib/homepageApi';
import { fetchDealProgress, listPublicDeals } from '@/lib/groupDealApi';
import { resolvePublicImage, handleImageError } from '@/lib/imageUtils';
import { resolveRoute } from '@/components/admin/homepage/selectors/InternalRouteSelector';
import HomepageActiveOrderCard from '@/components/tamam/customer/HomepageActiveOrderCard';
import PaymentTrustStrip from '@/components/tamam/customer/PaymentTrustStrip';
import PurchaseJourneyTrustSection from '@/components/tamam/customer/PurchaseJourneyTrustSection';
import LoyaltyBalanceCard from '@/components/tamam/customer/LoyaltyBalanceCard';
import AssuranceSection from '@/components/tamam/customer/AssuranceSection';
import HomeActiveDealBanner from '@/components/tamam/customer/HomeActiveDealBanner';
import HomeUpcomingDealBanner from '@/components/tamam/customer/HomeUpcomingDealBanner';
import PopularMealCard from '@/components/tamam/customer/PopularMealCard';
import HomepageHeroVideo from '@/components/tamam/customer/HomepageHeroVideo';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const pjson = (s, f = {}) => { try { return JSON.parse(s) || f; } catch { return f; } };
const round = (n) => (n == null ? 0 : Math.round(n));

export default function HomepageSectionRenderer({ section, items = [], draft = false }) {
  const settings = pjson(section.settings_json, {});
  const sectionItems = items.filter((it) => it.homepage_section_id === section.id);
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  // Auto-load for automatic sections
  useEffect(() => {
    if (section.section_type === 'most_ordered' && section.selection_mode === 'automatic') {
      autoRankMostOrdered(settings.report_days || 30, section.max_items || 8).then(setData).catch(() => setData([]));
    }
  }, [section.id, section.selection_mode, settings.report_days, section.max_items]);

  const draftBadge = draft && <div className="absolute top-2 right-2 bg-tertiary text-on-tertiary text-[9px] font-bold px-2 py-0.5 rounded-full z-10">مسودة</div>;

  const wrap = (children, className = '') => (
    <section className={`relative px-4 py-6 ${className}`}>{draftBadge}{children}</section>
  );

  switch (section.section_type) {
    case 'hero': {
      const mediaItem = sectionItems.find((it) => it.item_type === 'media');
      const isVideo = (settings.media_kind || '').includes('video');
      const fileUrl = mediaItem?.media_id ? null : null; // would need media lookup
      return wrap(
        <HeroSection settings={settings} mediaItem={mediaItem} />,
        'pt-4'
      );
    }
    case 'active_order':
      return <div className="relative">{draftBadge}<HomepageActiveOrderCard /></div>;
    case 'game_promo':
      return wrap(
        <div className="space-y-2">
          {section.title && <h2 className="text-headline-md font-bold">{section.title}</h2>}
          {section.subtitle && <p className="text-sm text-on-surface-variant">{section.subtitle}</p>}
          <Link to="/tamam-game" className="block h-12 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center">{section.view_all_label || 'ساعدني أختار'}</Link>
        </div>
      );
    case 'suggestions':
    case 'recommended_suggestions':
      return wrap(<SuggestionsSection section={section} settings={settings} items={sectionItems} />);
    case 'active_deal':
      return wrap(<ActiveDealSection section={section} settings={settings} items={sectionItems} navigate={navigate} />);
    case 'upcoming_deal':
      return wrap(<UpcomingDealSection section={section} settings={settings} items={sectionItems} navigate={navigate} />);
    case 'most_ordered':
      return wrap(<MostOrderedSection section={section} settings={settings} items={sectionItems} data={data} navigate={navigate} />);
    case 'popular_meals':
      return wrap(<PopularMealsSection section={section} items={sectionItems} navigate={navigate} />);
    case 'popular_categories':
      return wrap(<PopularCategoriesSection section={section} items={sectionItems} navigate={navigate} />);
    case 'featured_restaurants':
      return wrap(<FeaturedRestaurantsSection section={section} items={sectionItems} settings={settings} navigate={navigate} />);
    case 'trust_payments':
      return <div className="relative">{draftBadge}<PaymentTrustStrip /></div>;
    case 'tracking_trust':
      return <div className="relative">{draftBadge}<PurchaseJourneyTrustSection /></div>;
    case 'rewards':
      return <div className="relative">{draftBadge}<LoyaltyBalanceCard /></div>;
    case 'support':
      return wrap(
        <div className="text-center py-6">
          {section.title && <h2 className="text-headline-md font-bold mb-2">{section.title}</h2>}
          <div className="flex gap-2 justify-center">
            <a href="https://wa.me/972500000000" className="bg-surface-container border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"><Icon name="chat" className="text-primary" />واتساب</a>
            <a href="tel:+972500000000" className="bg-surface-container border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"><Icon name="call" className="text-primary" />اتصال</a>
          </div>
        </div>
      );
    case 'promo_banner':
      return wrap(<PromoBannerSection settings={settings} section={section} />);
    case 'editorial':
      return wrap(
        <div>
          {section.title && <h2 className="text-headline-md font-bold mb-2">{section.title}</h2>}
          {settings.content && <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{settings.content}</p>}
        </div>
      );
    default:
      return wrap(<div><h2 className="text-headline-md font-bold">{section.title || section.section_key}</h2></div>);
  }
}

function HeroSection({ settings, mediaItem }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [posterUrl, setPosterUrl] = useState(null);
  const isVideo = (settings.media_kind || '').includes('video');
  const ctaRoute = resolveRoute(settings.cta_route_key, settings.cta_route_params);
  const overlay = settings.overlay_strength ?? 40;

  useEffect(() => {
    if (mediaItem?.media_id) {
      base44.entities.HomepageMedia.get(mediaItem.media_id).then((m) => setMediaUrl(m?.file_url || null)).catch(() => {});
    }
    if (settings.poster_media_id) {
      base44.entities.HomepageMedia.get(settings.poster_media_id).then((m) => setPosterUrl(m?.file_url || null)).catch(() => {});
    }
  }, [mediaItem?.media_id, settings.poster_media_id]);

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden">
      {isVideo && mediaUrl ? (
        <HomepageHeroVideo
          videoUrl={mediaUrl}
          posterUrl={posterUrl}
          autoPlay={settings.autoplay}
          loop={settings.loop}
          muted={settings.muted ?? true}
          controls={settings.controls}
          className="w-full h-full object-cover"
        />
      ) : mediaUrl ? (
        <img src={resolvePublicImage(mediaUrl)} alt={settings.headline || ''} className="w-full h-full object-cover" onError={handleImageError} />
      ) : (
        <div className="w-full h-full bg-surface-container-high flex items-center justify-center"><Icon name="image" className="text-on-surface-variant text-4xl" /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" style={{ opacity: overlay / 100 }} />
      {(settings.headline || settings.cta_label) && (
        <div className="absolute bottom-4 right-4 left-4 space-y-2">
          {settings.headline && <h2 className="text-headline-md font-bold text-on-surface">{settings.headline}</h2>}
          {settings.supporting_text && <p className="text-sm text-on-surface-variant">{settings.supporting_text}</p>}
          {settings.cta_label && ctaRoute && <Link to={ctaRoute} className="inline-block bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold">{settings.cta_label}</Link>}
        </div>
      )}
    </div>
  );
}

function SuggestionsSection({ section, settings, items }) {
  const [sets, setSets] = useState([]);
  const pkgFilter = settings.package_filter || 'all';
  useEffect(() => {
    base44.entities.TamamSuggestionSet.filter({ is_active: true }).then((list) => {
      const filtered = pkgFilter === 'all' ? list : (list || []).filter((s) => s.package_level === pkgFilter);
      setSets((filtered || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    }).catch(() => {});
  }, [pkgFilter]);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-headline-md font-bold">{section.title || 'اقتراحات TAMAM'}</h2></div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {sets.slice(0, section.max_items || 8).map((s) => (
          <Link key={s.id} to={`/tamam-order/${s.id}`} className="flex-none w-40 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden">
            <div className="h-24 bg-surface-container-high">{s.hero_image_url ? <img src={resolvePublicImage(s.hero_image_url)} alt={s.title_ar} className="w-full h-full object-cover" onError={handleImageError} /> : null}</div>
            <div className="p-2"><p className="text-sm font-bold truncate">{s.title_ar || s.package_level}</p>{s.display_price != null && <p className="text-primary text-xs font-bold">₪{round(s.display_price)}</p>}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ActiveDealSection({ section, settings, items, navigate }) {
  const [view, setView] = useState(null);
  useEffect(() => {
    if (section.selection_mode === 'manual' && items.length) {
      const dealId = items.find((it) => it.item_type === 'deal')?.deal_id;
      if (dealId) fetchDealProgress(dealId).then((p) => setView({ deal: p.deal, thresholds: p.thresholds, participants: p.participants })).catch(() => {});
    } else {
      listPublicDeals().then((deals) => {
        const active = (deals || []).find((v) => v.status === 'active');
        if (active) setView({ deal: active.deal, thresholds: active.thresholds, participants: active.participants });
      }).catch(() => {});
    }
  }, [section.id, section.selection_mode]);
  if (!view?.deal) return <div className="bg-surface-container rounded-xl p-4 text-center text-sm text-on-surface-variant">لا يوجد عرض نشط حاليًا</div>;
  return <HomeActiveDealBanner deal={view.deal} thresholds={view.thresholds} participants={view.participants} onOpen={() => navigate(`/deals/${view.deal.id}`)} />;
}

function UpcomingDealSection({ section, settings, items, navigate }) {
  const [deal, setDeal] = useState(null);
  useEffect(() => {
    if (section.selection_mode === 'manual' && items.length) {
      const dealId = items.find((it) => it.item_type === 'deal')?.deal_id;
      if (dealId) fetchDealProgress(dealId).then((p) => setDeal(p.deal)).catch(() => {});
    } else {
      listPublicDeals().then((deals) => {
        const upcoming = (deals || []).find((v) => v.status === 'scheduled');
        if (upcoming) setDeal(upcoming.deal);
      }).catch(() => {});
    }
  }, [section.id, section.selection_mode]);
  if (!deal) return null;
  return <HomeUpcomingDealBanner deal={deal} onOpen={() => navigate(`/deals/${deal.id}`)} />;
}

function MostOrderedSection({ section, settings, items, data, navigate }) {
  const [manualMeals, setManualMeals] = useState([]);
  useEffect(() => {
    if (section.selection_mode === 'manual' && items.length) {
      const mealIds = items.filter((it) => it.item_type === 'meal').map((it) => it.meal_id).filter(Boolean);
      if (mealIds.length) {
        base44.functions.invoke('supabaseProxy', { action: 'getMenuItemsByIds', payload: { ids: mealIds } }).then((r) => {
          const meals = r?.data?.data || [];
          base44.functions.invoke('supabaseProxy', { action: 'getRestaurantsByIds', payload: { ids: [...new Set(meals.map((m) => m.restaurant_id))] } }).then((r2) => {
            const restMap = {}; (r2?.data?.data || []).forEach((rest) => { restMap[rest.id] = rest; });
            setManualMeals(meals.map((m) => ({ ...m, restaurantName: restMap[m.restaurant_id]?.name_ar || restMap[m.restaurant_id]?.name, restaurantId: m.restaurant_id })));
          });
        }).catch(() => setManualMeals([]));
      }
    }
  }, [section.id, section.selection_mode, items.length]);

  const meals = section.selection_mode === 'automatic' ? (data || []).map((m) => ({ name: m.name, image_url: m.meal?.image_url, price: m.price || m.meal?.price, restaurantName: m.restaurant?.name_ar || m.restaurant?.name, restaurantId: m.kitchen_id, count: m.count })) : manualMeals;
  if (!meals.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-headline-md font-bold">{section.title || 'الأكثر طلبًا'}</h2>{section.view_all_label && section.view_all_route && <Link to={section.view_all_route} className="text-primary text-xs font-bold">{section.view_all_label}</Link>}</div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {meals.slice(0, section.max_items || 8).map((m, i) => (
          <PopularMealCard key={i} meal={m} onOpen={() => navigate(`/restaurants/${m.restaurantId}`)} />
        ))}
      </div>
    </div>
  );
}

function PopularMealsSection({ section, items, navigate }) {
  const [meals, setMeals] = useState([]);
  const [rests, setRests] = useState([]);
  const mealItems = items.filter((it) => it.item_type === 'meal');
  const catItems = items.filter((it) => it.item_type === 'category');
  useEffect(() => {
    const mealIds = mealItems.map((it) => it.meal_id).filter(Boolean);
    if (mealIds.length) {
      base44.functions.invoke('supabaseProxy', { action: 'getMenuItemsByIds', payload: { ids: mealIds } }).then((r) => setMeals(r?.data?.data || [])).catch(() => {});
    }
  }, [items.length]);
  useEffect(() => {
    const restIds = [...new Set(meals.map((m) => m.restaurant_id))];
    if (restIds.length) base44.functions.invoke('supabaseProxy', { action: 'getRestaurantsByIds', payload: { ids: restIds } }).then((r) => setRests(r?.data?.data || [])).catch(() => {});
  }, [meals]);

  if (catItems.length) {
    return (
      <div className="space-y-3">
        <h2 className="text-headline-md font-bold">{section.title || 'الأكلات الشعبية'}</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {catItems.map((it, i) => (
            <button key={i} onClick={() => navigate(`/restaurants?category=${encodeURIComponent(it.category_id)}`)} className="flex-none w-32 bg-surface-container border border-outline-variant/30 rounded-2xl p-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-2"><Icon name="restaurant" className="text-primary" /></div>
              <h3 className="font-bold text-sm">{it.category_id}</h3>
            </button>
          ))}
        </div>
      </div>
    );
  }
  const restMap = {}; rests.forEach((r) => { restMap[r.id] = r; });
  return (
    <div className="space-y-3">
      <h2 className="text-headline-md font-bold">{section.title || 'الأكلات الشعبية'}</h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {meals.map((m, i) => (
          <PopularMealCard key={i} meal={{ ...m, restaurantName: restMap[m.restaurant_id]?.name_ar || restMap[m.restaurant_id]?.name, restaurantId: m.restaurant_id }} onOpen={() => navigate(`/restaurants/${m.restaurant_id}`)} />
        ))}
      </div>
    </div>
  );
}

function PopularCategoriesSection({ section, items, navigate }) {
  const [cats, setCats] = useState([]);
  const perCat = section.max_items || 6;
  useEffect(() => {
    const names = items.filter((it) => it.item_type === 'category').map((it) => it.category_id).filter(Boolean);
    if (!names.length) { setCats([]); return; }
    base44.functions.invoke('supabaseProxy', { action: 'getMealsByCategoryNames', payload: { names, perCategory: perCat } })
      .then((r) => setCats((r?.data?.data || r?.data) || []))
      .catch(() => setCats([]));
  }, [items.length, perCat]);
  if (!cats.length) return <div className="text-sm text-on-surface-variant">أضف تصنيفات لعرض الوجبات تحتها.</div>;
  return (
    <div className="space-y-5">
      <h2 className="text-headline-md font-bold">{section.title || 'تصنيفات شعبية'}</h2>
      {cats.map((c, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-headline-sm font-bold">{c.name}</h3>
            <button onClick={() => navigate(`/restaurants?category=${encodeURIComponent(c.name)}`)} className="text-primary text-xs font-bold">شوف الكل</button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {c.meals.map((m) => (
              <PopularMealCard key={m.id} meal={{ ...m, name: m.name_ar || m.name, restaurantName: m.restaurant_name, restaurantId: m.restaurant_id, image_url: m.image_url, price: m.price }} onOpen={() => navigate(`/restaurants/${m.restaurant_id}?meal=${m.id}`)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturedRestaurantsSection({ section, items, settings, navigate }) {
  const [rests, setRests] = useState([]);
  const manualIds = items.filter((it) => it.item_type === 'restaurant').map((it) => it.restaurant_id);
  useEffect(() => {
    if (section.selection_mode === 'manual' && manualIds.length) {
      base44.functions.invoke('supabaseProxy', { action: 'getRestaurantsByIds', payload: { ids: manualIds } }).then((r) => setRests(r?.data?.data || [])).catch(() => {});
    } else {
      getRestaurants().then((list) => setRests((list || []).slice(0, section.max_items || 6))).catch(() => {});
    }
  }, [section.id, section.selection_mode, manualIds.length]);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-headline-md font-bold">{section.title || 'مطاعم قريبة منك'}</h2>{section.view_all_label && section.view_all_route && <Link to={section.view_all_route} className="text-primary text-xs font-bold">{section.view_all_label}</Link>}</div>
      <div className="grid grid-cols-2 gap-3">
        {rests.map((r) => (
          <button key={r.id} onClick={() => navigate(`/restaurants/${r.id}`)} className="text-right bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden">
            <div className="h-24">{r.image_url || r.cover_url ? <img src={resolvePublicImage(r.image_url || r.cover_url)} alt="" className="w-full h-full object-cover" onError={handleImageError} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-2xl">🏪</div>}</div>
            <div className="p-2.5"><h3 className="font-bold text-sm truncate">{r.name_ar || r.name}</h3><p className="text-[11px] text-on-surface-variant truncate">{r.category || r.cuisine}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PromoBannerSection({ settings, section }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const ctaRoute = resolveRoute(settings.cta_route_key, settings.cta_route_params);
  useEffect(() => {
    if (settings.media_id) base44.entities.HomepageMedia.get(settings.media_id).then((m) => setMediaUrl(m?.file_url || null)).catch(() => {});
  }, [settings.media_id]);
  return (
    <div className="relative rounded-2xl overflow-hidden">
      {mediaUrl ? <img src={resolvePublicImage(mediaUrl)} alt={settings.headline || ''} className="w-full h-40 object-cover" onError={handleImageError} /> : <div className="w-full h-40 bg-surface-container-high" />}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
      <div className="absolute bottom-3 right-3 left-3 space-y-1">
        {settings.headline && <h3 className="font-bold text-base text-on-surface">{settings.headline}</h3>}
        {settings.supporting_text && <p className="text-xs text-on-surface-variant">{settings.supporting_text}</p>}
        {settings.cta_label && ctaRoute && <Link to={ctaRoute} className="inline-block bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold">{settings.cta_label}</Link>}
      </div>
    </div>
  );
}