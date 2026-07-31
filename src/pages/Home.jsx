import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRestaurants, getDeals } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { restaurantToCard, dealToCard, suggestionToCard } from '@/lib/tamamAdapters';
import { SkeletonCard, EmptyState, ErrorState } from '@/components/tamam/customer/States';

const TIERS = [
  { id: 'classic', label: 'Classic' },
  { id: 'mix', label: 'Mix' },
  { id: 'plus', label: 'Plus' },
];

const MOOD_ICON = {
  'مطبخ البيت مسكّر': 'home_work',
  'الحبايب عنا': 'groups',
  'آخر الليل': 'nights_stay',
  'وقت المباراة': 'sports_soccer',
  'البيت بده': 'cottage',
  'طاقة': 'bolt',
  'قعدة صبايا': 'diversity_1',
  'أول النهار': 'wb_sunny',
  'لمة شباب': 'sports_esports',
  'ضيوف بالطريق': 'door_front',
  'ناقصنا كم شغلة': 'restaurant',
  'جوع آخر النهار': 'soup_kitchen',
  'حلو بعد الأكل': 'cake',
};
const moodIcon = (m) => (m?.icon && !/[\u{1F300}-\u{1FAFF}]/u.test(m.icon) ? m.icon : MOOD_ICON[m?.name_ar] || 'auto_awesome');

function MaterialIcon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export default function Home() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [deals, setDeals] = useState([]);
  const [moods, setMoods] = useState([]);
  const [sets, setSets] = useState({ classic: [], mix: [], plus: [] });
  const [tier, setTier] = useState('classic');
  const [activeMeals, setActiveMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const [rests, dealsList, moodList] = await Promise.all([
        getRestaurants(), getDeals(), base44.entities.TamamMood.list().catch(() => []),
      ]);
      setRestaurants(rests || []);
      setDeals(dealsList || []);
      setMoods((moodList || []).filter(m => m.is_active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      const allSets = await base44.entities.TamamSuggestionSet.filter({ is_active: true }).catch(() => []);
      const grouped = { classic: [], mix: [], plus: [] };
      (allSets || []).forEach(s => { if (grouped[s.package_level]) grouped[s.package_level].push(s); });
      Object.values(grouped).forEach(arr => arr.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setSets(grouped);
      try {
        const ao = JSON.parse(localStorage.getItem('active_order') || 'null');
        if (ao?.id) setActiveOrder(ao);
      } catch {}
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

  const heroImg = deals[0]?.image_url || restaurants[0]?.image_url || restaurants[0]?.cover_image_url;

  return (
    <div className="flex flex-col">
      {/* Active Order (Mini) */}
      {activeOrder && (
        <section className="px-4 py-3">
          <div className="bg-primary/10 border border-primary/30 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <MaterialIcon name="moped" className="text-primary" />
              </div>
              <div>
                <div className="text-[10px] text-primary font-bold uppercase">طلب نشط #{activeOrder.id}</div>
                <div className="text-sm font-semibold">{activeOrder.eta ? `يوصل خلال ${activeOrder.eta} دقيقة` : 'قيد التحضير'}</div>
              </div>
            </div>
            <button onClick={() => navigate(`/order/${activeOrder.id}`)} className="text-xs font-bold text-primary px-3 py-1.5 border border-primary/50 rounded-lg">تابع</button>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="px-4 py-4 space-y-4">
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-outline-variant/20">
          {heroImg ? <img alt="Hero Feast" className="w-full h-full object-cover" src={heroImg} /> : <div className="w-full h-full bg-surface-container-high" />}
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

      {/* Mood Selection Grid */}
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

      {/* Suggestions Tabs & Card */}
      <section className="px-4 py-8">
        <div className="flex flex-col items-center text-center mb-6">
          <h2 className="text-headline-md font-bold">اقتراحات TAMAM</h2>
          <div className="flex gap-2 mt-4 w-full">
            {TIERS.map(t => (
              <button key={t.id} onClick={() => setTier(t.id)}
                className={`flex-1 py-2 text-xs font-bold border-b-2 ${tier === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}>{t.label}</button>
            ))}
          </div>
        </div>
        {loading ? <SkeletonCard kind="suggestion" /> : currentSet ? (
          <SuggestionLargeCard
            set={currentSet}
            meals={activeMeals}
            onChoose={() => navigate(`/tamam-order/${currentSet.id}`)}
          />
        ) : (
          <EmptyState icon="✨" title="ما في اقتراحات بهالتصنيف لسه" />
        )}
      </section>

      {/* Group Deals */}
      {!loading && deals.length > 0 && (
        <section className="px-4 py-8 bg-surface-container">
          <div className="mb-4">
            <h2 className="text-headline-md font-bold">عروض TAMAM الجماعية</h2>
            <p className="text-xs text-on-surface-variant">انضم للعرض، وكل ما نوصل للهدف السعر بنزل.</p>
          </div>
          <div className="space-y-4">
            {deals.slice(0, 3).map(d => <GroupDealBlock key={d.id} deal={dealToCard(d)} restaurant={restaurants.find(r => r.id === d.restaurant_id)} onJoin={() => navigate(`/restaurant/${(restaurants.find(r => r.id === d.restaurant_id) || {}).slug || ''}`)} />)}
          </div>
        </section>
      )}

      {/* Nearby restaurants */}
      <section className="px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-headline-md font-bold">مطاعم قريبة منك</h2>
          <Link to="/restaurants" className="text-primary text-xs font-bold">عرض الكل</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}</div>
        ) : restaurants.length ? (
          <div className="grid grid-cols-2 gap-3">
            {restaurants.slice(0, 6).map(r => <NearbyCard key={r.id} r={r} onOpen={() => navigate(`/restaurant/${r.slug || r.id}`)} />)}
          </div>
        ) : <EmptyState icon="🏪" title="ما لقينا مطاعم بهالمنطقة" />}
      </section>

      {/* Trust Points */}
      <section className="px-4 py-10 flex flex-col gap-6">
        <TrustItem icon="verified" title="مطاعم مختارة" desc="منتعاملش إلا مع الأنظف والأفضل، عشان نضمن جودة أكلك." />
        <TrustItem icon="payments" title="سعر المنيو" desc="نفس سعر المطعم، بدون زيادات مخفية أو رسوم غريبة." />
      </section>
    </div>
  );
}

function SuggestionLargeCard({ set, meals, onChoose }) {
  const card = suggestionToCard(set);
  return (
    <div className="bg-surface border border-primary/30 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="absolute top-3 left-3 bg-primary text-on-primary text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-md">اختيار TAMAM</div>
      <div className="h-52 overflow-hidden bg-surface-container-high">
        {card.imageUrl ? <img alt={card.name} className="w-full h-full object-cover" src={card.imageUrl} /> : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
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

function GroupDealBlock({ deal, restaurant, onJoin }) {
  const pct = deal.nextThreshold && deal.participants ? Math.min(100, Math.round((deal.participants / deal.nextThreshold) * 100)) : 0;
  return (
    <div className="bg-background border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xl">
      <div className="relative h-44">
        {deal.imageUrl ? <img alt={deal.name} className="w-full h-full object-cover" src={deal.imageUrl} /> : <div className="w-full h-full bg-surface-container-high" />}
        {restaurant?.name && (
          <div className="absolute top-3 right-3 bg-background/80 backdrop-blur px-2 py-1 rounded-lg border border-outline-variant/30 text-[10px] flex items-center gap-1 font-bold">
            <MaterialIcon name="restaurant" className="text-primary text-xs" /> {restaurant.name}
          </div>
        )}
      </div>
      <div className="p-4 space-y-4">
        <h3 className="text-base font-bold">{deal.name}</h3>
        <div className="flex items-end gap-2">
          {deal.currentPrice != null && <span className="text-primary text-2xl font-bold">₪{Math.round(deal.currentPrice)}</span>}
          {deal.originalPrice != null && <span className="text-on-surface-variant line-through text-xs mb-1">₪{deal.originalPrice}</span>}
        </div>
        {deal.nextThreshold != null && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-tertiary">الهدف القادم: ₪{deal.nextThreshold}</span>
              <span className="text-primary">{deal.participants || 0} من {deal.nextThreshold} انضموا</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden border border-outline-variant/20">
              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        <button onClick={onJoin} className="w-full h-11 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-all">انضم الآن للعرض</button>
      </div>
    </div>
  );
}

function NearbyCard({ r, onOpen }) {
  const c = restaurantToCard(r);
  return (
    <button onClick={onOpen} className="text-right bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden active:scale-95 transition-transform">
      <div className="relative h-24">
        {c.coverUrl ? <img className="w-full h-full object-cover" src={c.coverUrl} alt={c.name} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-2xl">🏪</div>}
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
      <div className="w-12 h-12 shrink-0 bg-surface border border-primary/20 rounded-xl flex items-center justify-center">
        <MaterialIcon name={icon} className="text-primary" />
      </div>
      <div>
        <h4 className="text-sm font-bold">{title}</h4>
        <p className="text-[11px] text-on-surface-variant">{desc}</p>
      </div>
    </div>
  );
}