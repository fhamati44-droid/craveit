import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRestaurants, getPopularMeals, getAllMenuCategories } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { restaurantToCard, suggestionToCard } from '@/lib/tamamAdapters';
import { listPublicDeals } from '@/lib/groupDealApi';
import { SkeletonCard, EmptyState, ErrorState } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';
import { getSessionId } from '@/lib/tamamApi';
import { dealStatus } from '@/lib/dealStatus';
import HomeActiveDealBanner from '@/components/tamam/customer/HomeActiveDealBanner';
import HomeUpcomingDealBanner from '@/components/tamam/customer/HomeUpcomingDealBanner';
import JoinedDealMiniBanner from '@/components/tamam/customer/JoinedDealMiniBanner';
import PopularMealCard from '@/components/tamam/customer/PopularMealCard';
import HomepageActiveOrderCard from '@/components/tamam/customer/HomepageActiveOrderCard';
import PaymentTrustStrip from '@/components/tamam/customer/PaymentTrustStrip';
import PurchaseJourneyTrustSection from '@/components/tamam/customer/PurchaseJourneyTrustSection';
import LoyaltyBalanceCard from '@/components/tamam/customer/LoyaltyBalanceCard';
import AssuranceSection from '@/components/tamam/customer/AssuranceSection';
import { getPublishedConfig } from '@/lib/homepageApi';
import HomepageSectionRenderer from '@/components/homepage/HomepageSectionRenderer';
import HomepagePrimaryActions from '@/components/tamam/customer/HomepagePrimaryActions';
import { resolvePublicImage, handleImageError } from '@/lib/imageUtils';

const PKG = [
  { id: 'all', label: 'الكل' },
  { id: 'classic', label: 'كلاسيك' },
  { id: 'mix', label: 'ميكس' },
  { id: 'plus', label: 'بلس' },
];
const MOOD_ICON = {
  'مطبخ البيت مسكّر': 'home_work', 'الحبايب عنا': 'groups', 'آخر الليل': 'nights_stay',
  'وقت المباراة': 'sports_soccer', 'البيت بده': 'cottage', 'طاقة': 'bolt',
  'قعدة صبايا': 'diversity_1', 'أول النهار': 'wb_sunny', 'لمة شباب': 'sports_esports',
  'ضيوف بالطريق': 'door_front', 'ناقصنا كم شغلة': 'restaurant', 'جوع آخر النهار': 'soup_kitchen',
  'حلو بعد الأكل': 'cake',
};
const moodIcon = (m) => (m?.icon && !/[\u{1F300}-\u{1FAFF}]/u.test(m.icon) ? m.icon : MOOD_ICON[m?.name_ar] || 'auto_awesome');
function MaterialIcon({ name, className = '' }) { return <span className={`material-symbols-outlined ${className}`}>{name}</span>; }

export default function Home() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [deals, setDeals] = useState([]);
  const [moods, setMoods] = useState([]);
  const [sets, setSets] = useState({ classic: [], mix: [], plus: [] });
  const [tier, setTier] = useState('mix');
  const [activeMeals, setActiveMeals] = useState([]);
  const [popularMeals, setPopularMeals] = useState([]);
  const [popCats, setPopCats] = useState([]);
  const [joinedDeal, setJoinedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [publishedConfig, setPublishedConfig] = useState(null);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      getPublishedConfig().catch(() => null).then(setPublishedConfig);
      const [rests, dealViews, moodList, popMeals, allCats] = await Promise.all([
        getRestaurants(), listPublicDeals().catch(() => []), base44.entities.TamamMood.list().catch(() => []),
        getPopularMeals(12), getAllMenuCategories().catch(() => []),
      ]);
      setRestaurants(rests || []);
      setDeals(dealViews || []);
      setMoods((moodList || []).filter(m => m.is_active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      const mapped = (popMeals || []).map(pm => {
        const r = (rests || []).find(x => x.id === pm.kitchen_id || x.kitchen_id === pm.kitchen_id);
        return { ...pm, restaurantName: r ? (r.name_ar || r.name) : null, restaurantId: r ? r.id : pm.kitchen_id };
      }).filter(pm => pm.restaurantId != null);
      setPopularMeals(mapped.slice(0, 8));
      const counts = {};
      (allCats || []).forEach(c => { const n = (c.name_ar || c.name || '').trim(); if (n) counts[n] = (counts[n] || 0) + 1; });
      setPopCats(Object.entries(counts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8));
      const allSets = await base44.entities.TamamSuggestionSet.filter({ is_active: true }).catch(() => []);
      const grouped = { classic: [], mix: [], plus: [] };
      (allSets || []).forEach(s => { if (grouped[s.package_level]) grouped[s.package_level].push(s); });
      Object.values(grouped).forEach(a => a.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setSets(grouped);
      try {
        const activeView = (dealViews || []).find(v => v.status === 'active' && v.my_participation);
        if (activeView) setJoinedDeal({ deal: activeView.deal, thresholds: activeView.thresholds, participants: activeView.participants });
      } catch {}
      try { const ao = JSON.parse(localStorage.getItem('active_order') || 'null'); if (ao?.id) setActiveOrder(ao); } catch {}
    } catch (e) { console.error(e); setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const currentSet = sets[tier]?.[0] || null;
  useEffect(() => {
    if (!currentSet) { setActiveMeals([]); return; }
    (async () => {
      try {
        const items = await base44.entities.TamamSuggestionItem.filter({ suggestion_set_id: currentSet.id });
        const ids = [...new Set((items || []).map(i => i.meal_id).filter(Boolean))];
        if (!ids.length) { setActiveMeals([]); return; }
        const res = await base44.functions.invoke('supabaseProxy', { action: 'getMenuItemsByIds', payload: { ids } });
        setActiveMeals((res?.data?.data || []).map(m => m.name).filter(Boolean));
      } catch { setActiveMeals([]); }
    })();
  }, [currentSet?.id]);

  if (error) return <ErrorState title="ما قدرنا نحمّل البيانات" onRetry={load} />;

  // Always render primary actions (game, restaurants, suggestions) — never hidden by CMS
  const orderedSections = (publishedConfig?.sections || []).slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const hasCmsContent = orderedSections.length > 0;

  if (hasCmsContent) {
    return (
      <div className="flex flex-col">
        <HomepagePrimaryActions />
        {orderedSections.map((s) => (
          <HomepageSectionRenderer key={s.id} section={s} items={publishedConfig.items || []} />
        ))}
        <AssuranceSection />
      </div>
    );
  }

  const activeViews = deals.filter(v => v.status === 'active').sort((a, b) => (b.deal.homepage_priority || 0) - (a.deal.homepage_priority || 0));
  const upcomingViews = deals.filter(v => v.status === 'scheduled').sort((a, b) => String(a.deal.start_at || '').localeCompare(String(b.deal.start_at || '')));
  const primaryActive = activeViews[0] || null;
  const primaryUpcoming = upcomingViews[0] || null;
  const heroImg = primaryActive?.deal?.hero_image || restaurants[0]?.cover_url || restaurants[0]?.image_url;

  return (
    <div className="flex flex-col">
      <HomepageActiveOrderCard />

      <section className="px-4 py-4 space-y-4">
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-outline-variant/20">
          {heroImg ? <img alt="Hero Feast" className="w-full h-full object-cover" src={resolvePublicImage(heroImg)} onError={handleImageError} /> : <div className="w-full h-full bg-surface-container-high" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute bottom-4 right-4 inline-block bg-tertiary text-on-tertiary px-3 py-1 text-[10px] font-bold rounded-full">جديد: ذكاء TAMAM</div>
        </div>
        <div className="space-y-2">
          <h1 className="text-headline-lg font-bold leading-tight">محتار شو <span className="text-primary italic underline decoration-2">تاكل اليوم؟</span></h1>
          <p className="text-body-md text-on-surface-variant leading-relaxed">اختار مودك، وTAMAM يرتّبلك 3 اقتراحات مناسبة بذكاء لمزاجك وميزانيتك.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link to="/tamam-game" className="h-11 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-transform flex items-center justify-center">ساعدني أختار</Link>
          <Link to="/restaurants" className="h-11 bg-surface border border-outline-variant/30 font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center">تصفح كل المطاعم</Link>
        </div>
      </section>

      {moods.length > 0 && (
        <section className="px-4 py-6 bg-surface/30">
          <h2 className="text-headline-md font-bold mb-4">شو وضعك اليوم؟</h2>
          <div className="grid grid-cols-2 gap-3">
            {moods.slice(0, 4).map(m => (
              <button key={m.id} onClick={() => navigate(`/tamam-suggestions/${m.id}`)} className="bg-surface border border-outline-variant/20 p-4 rounded-2xl flex flex-col gap-2 text-right active:scale-95 transition-transform">
                <MaterialIcon name={moodIcon(m)} className="text-primary text-3xl" />
                <span className="text-sm font-bold">{m.name_ar}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-headline-md font-bold">اقتراحات TAMAM</h2>
          <button onClick={() => navigate('/tamam-suggestions?package=all')} className="text-primary text-xs font-bold">شوف كل الاقتراحات</button>
        </div>
        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
          {PKG.map(p => (
            <button key={p.id} onClick={() => navigate(`/tamam-suggestions?package=${p.id}`)} className="flex-none px-5 py-2 rounded-xl text-sm font-semibold bg-surface-container-high text-on-surface border border-outline-variant active:scale-95 transition-transform">{p.label}</button>
          ))}
        </div>
        {loading ? <SkeletonCard kind="suggestion" /> : currentSet ? (
          <SuggestionLargeCard set={currentSet} meals={activeMeals} onChoose={() => navigate(`/tamam-order/${currentSet.id}`)} />
        ) : <EmptyState icon="✨" title="ما في اقتراحات بهالتصنيف لسه" />}
      </section>

      {joinedDeal && (
        <JoinedDealMiniBanner deal={joinedDeal.deal} thresholds={joinedDeal.thresholds} participants={joinedDeal.participants} onOpen={() => { track('joined_deal_opened', { deal_id: joinedDeal.deal.id }); navigate(`/deals/${joinedDeal.deal.id}`); }} />
      )}

      <section className="px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-headline-md font-bold">عروض TAMAM</h2>
            <p className="text-xs text-on-surface-variant">كل ما زاد العدد، السعر بصير أحسن.</p>
          </div>
          <Link to="/deals" className="text-primary text-xs font-bold">شوف كل العروض</Link>
        </div>
        {loading ? <SkeletonCard kind="suggestion" /> : primaryActive ? (
          <HomeActiveDealBanner deal={primaryActive.deal} thresholds={primaryActive.thresholds} participants={primaryActive.participants} onOpen={() => { track('home_active_deal_opened', { deal_id: primaryActive.deal.id }); navigate(`/deals/${primaryActive.deal.id}`); }} />
        ) : primaryUpcoming ? (
          <HomeUpcomingDealBanner deal={primaryUpcoming.deal} onOpen={() => { track('home_upcoming_deal_opened', { deal_id: primaryUpcoming.deal.id }); navigate(`/deals/${primaryUpcoming.deal.id}`); }} />
        ) : (
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-6 text-center">
            <p className="text-on-surface-variant text-sm mb-3">ما في عروض جماعية شغالة هسا</p>
            <button onClick={() => navigate('/tamam-suggestions?package=all')} className="bg-primary text-on-primary px-5 py-2.5 rounded-full text-sm font-bold">شوف اقتراحات TAMAM</button>
          </div>
        )}
      </section>

      <section className="py-6">
        <h2 className="text-headline-md font-bold mb-4 px-4">الأكثر طلبًا</h2>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
        ) : popularMeals.length ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
            {popularMeals.map((m, i) => (
              <PopularMealCard key={i} meal={m} onOpen={() => { track('popular_meal_opened', { name: m.name }); navigate(`/restaurants/${m.restaurantId}`); }} />
            ))}
          </div>
        ) : (
          <div className="px-4"><EmptyState icon="🍽️" title="ما في طلبات كفاية لعرض الأكثر طلبًا" /></div>
        )}
      </section>

      {popCats.length > 0 && (
        <section className="py-6 bg-surface/30">
          <h2 className="text-headline-md font-bold mb-4 px-4">أكلات شعبية</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
            {popCats.map(c => (
              <button key={c.label} onClick={() => { track('popular_category_opened', { category: c.label }); navigate(`/restaurants?category=${encodeURIComponent(c.label)}`); }} className="flex-none w-32 bg-surface-container border border-outline-variant/30 rounded-2xl p-4 text-right active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-2"><MaterialIcon name="restaurant" className="text-primary" /></div>
                <h3 className="font-bold text-sm">{c.label}</h3>
                <p className="text-[11px] text-on-surface-variant">{c.count} مطاعم</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-headline-md font-bold">مطاعم قريبة منك</h2>
          <Link to="/restaurants" className="text-primary text-xs font-bold">عرض الكل</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}</div>
        ) : restaurants.length ? (
          <div className="grid grid-cols-2 gap-3">
            {restaurants.slice(0, 6).map(r => <NearbyCard key={r.id} r={r} onOpen={() => navigate(`/restaurants/${r.id}`)} />)}
          </div>
        ) : <EmptyState icon="🏪" title="ما لقينا مطاعم بهالمنطقة" />}
      </section>

      <PaymentTrustStrip />
      <PurchaseJourneyTrustSection />
      <LoyaltyBalanceCard />
      <AssuranceSection />
    </div>
  );
}

function SuggestionLargeCard({ set, meals, onChoose }) {
  const card = suggestionToCard(set);
  return (
    <div className="bg-surface border border-primary/30 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="absolute top-3 left-3 bg-primary text-on-primary text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-md">اختيار TAMAM</div>
      <div className="h-52 overflow-hidden bg-surface-container-high">
        {card.imageUrl ? <img alt={card.name} className="w-full h-full object-cover" src={resolvePublicImage(card.imageUrl)} onError={handleImageError} /> : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold">{card.name}</h3>
          {card.price != null && <span className="text-primary text-lg font-bold">₪{Math.round(card.price)}</span>}
        </div>
        {meals.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {meals.slice(0, 4).map((n, i) => <span key={i} className="bg-background px-2 py-1 text-[10px] rounded-md border border-outline-variant/30 text-on-surface-variant">{n}</span>)}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onChoose} className="flex-1 h-11 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-all">اختار هذا</button>
          <button onClick={() => window.location.reload()} className="w-11 h-11 border border-outline-variant/30 rounded-xl flex items-center justify-center active:scale-95 transition-all">
            <MaterialIcon name="refresh" className="text-on-surface-variant" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NearbyCard({ r, onOpen }) {
  const c = restaurantToCard(r);
  return (
    <button onClick={onOpen} className="text-right bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden active:scale-95 transition-transform">
      <div className="relative h-24">
        {c.coverUrl ? <img className="w-full h-full object-cover" src={resolvePublicImage(c.coverUrl)} alt={c.name} onError={handleImageError} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-2xl">🏪</div>}
        <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${c.isOpen ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-error/10 text-error border border-error/20'}`}>{c.isOpen ? 'مفتوح' : 'مغلق'}</span>
      </div>
      <div className="p-2.5">
        <h3 className="font-bold text-sm truncate">{c.name}</h3>
        <p className="text-[11px] text-on-surface-variant truncate">{c.categories?.join(' · ')}</p>
      </div>
    </button>
  );
}

function TrustItem({ icon, title, desc }) {
  return (
    <div className="flex gap-4 items-center">
      <div className="w-12 h-12 shrink-0 bg-surface border border-primary/20 rounded-xl flex items-center justify-center"><MaterialIcon name={icon} className="text-primary" /></div>
      <div>
        <h4 className="text-sm font-bold">{title}</h4>
        <p className="text-[11px] text-on-surface-variant">{desc}</p>
      </div>
    </div>
  );
}