import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, ShieldCheck, Tag, Truck, Smile } from 'lucide-react';
import { getRestaurants, getDeals } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { restaurantToCard, dealToCard, suggestionToCard } from '@/lib/tamamAdapters';
import MoodChip from '@/components/tamam/customer/MoodChip';
import SuggestionCardTamam from '@/components/tamam/customer/SuggestionCardTamam';
import RestaurantCardTamam from '@/components/tamam/customer/RestaurantCardTamam';
import GroupDealCard from '@/components/tamam/customer/GroupDealCard';
import { SkeletonCard, EmptyState, ErrorState } from '@/components/tamam/customer/States';

const TIERS = [
  { id: 'classic', label: 'كلاسيك' },
  { id: 'mix', label: 'ميكس' },
  { id: 'plus', label: 'بلس' },
];

const TRUST = [
  { icon: ShieldCheck, title: 'مطاعم مختارة', desc: 'كل مطعم مفحوص وموثوق' },
  { icon: Tag, title: 'سعر واضح', desc: 'اللي تشوفه هو اللي تدفع' },
  { icon: Truck, title: 'توصيل ومتابعة', desc: 'تتبع طلبك لحتى يوصلك' },
  { icon: Smile, title: 'اقتراحات بتناسبك', desc: 'TAMAM يختار حسب مودك' },
];

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <h2 className="font-bold text-tamam-text text-base">{title}</h2>
      {actionLabel && (
        <button onClick={onAction} className="text-tamam-green-bright text-xs font-bold flex items-center gap-0.5">
          {actionLabel} <ChevronLeft size={14} />
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [deals, setDeals] = useState([]);
  const [moods, setMoods] = useState([]);
  const [suggestions, setSuggestions] = useState({ classic: [], mix: [], plus: [] });
  const [tier, setTier] = useState('classic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const [rests, dealsList, moodList] = await Promise.all([
        getRestaurants(), getDeals(), base44.entities.TamamMood.list().catch(() => []),
      ]);
      setRestaurants(rests || []);
      setDeals(dealsList || []);
      setMoods((moodList || []).filter(m => m.is_active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      const sets = await base44.entities.TamamSuggestionSet.filter({ is_active: true }).catch(() => []);
      const grouped = { classic: [], mix: [], plus: [] };
      (sets || []).forEach(s => { if (grouped[s.package_level]) grouped[s.package_level].push(s); });
      Object.values(grouped).forEach(arr => arr.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setSuggestions(grouped);
    } catch (e) { console.error(e); setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openRestaurant = (r) => navigate(`/restaurant/${r.slug || r.id}`);
  const openSuggestion = (s) => navigate(`/tamam-order/${s.id}`);
  const openDeal = (d) => { if (d?.restaurant_slug || d?.slug) navigate(`/restaurant/${d.restaurant_slug || d.slug}`); };

  if (error) {
    return <ErrorState title="ما قدرنا نحمّل البيانات" message="تأكد من الاتصال وحاول مرة تانية" onRetry={load} />;
  }

  return (
    <div className="px-3 py-3 space-y-6">
      {/* C. Primary TAMAM intelligence */}
      <div className="relative overflow-hidden rounded-3xl p-5 border border-tamam-green/30"
        style={{ background: 'radial-gradient(circle at 70% 20%, #1c6d17 0%, #0f2e2b 55%, #071312 100%)' }}>
        <p className="text-tamam-green-bright text-xs font-bold mb-1">TAMAM</p>
        <h1 className="text-tamam-text font-extrabold text-xl leading-snug">محتار شو تاكل اليوم؟</h1>
        <p className="text-tamam-text-muted text-sm mt-1.5 leading-relaxed">
          اختار مودك، وTAMAM يرتبلك اقتراحات مناسبة لمزاجك وميزانيتك.
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Link to="/tamam-game" className="flex-1 bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-2xl flex items-center justify-center gap-1.5">
            <Sparkles size={16} /> ساعدني أختار
          </Link>
          <Link to="/search" className="px-4 py-3 rounded-2xl bg-tamam-surface text-tamam-text font-bold text-sm border border-tamam-outline/50">
            تصفح كل المطاعم
          </Link>
        </div>
      </div>

      {/* D. Quick mood selection */}
      {moods.length > 0 && (
        <section>
          <SectionHeader title="اختار مودك" actionLabel="كل المودات" onAction={() => navigate('/tamam-game')} />
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
            {moods.map(m => (
              <MoodChip key={m.id} icon={m.icon || '✨'} name={m.name_ar} onClick={() => navigate(`/tamam-suggestions/${m.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* E. TAMAM suggestions */}
      <section>
        <SectionHeader title="اقتراحات TAMAM" actionLabel="تصفح الكل" onAction={() => navigate('/tamam-game')} />
        <div className="flex gap-2 mb-3">
          {TIERS.map(t => (
            <button key={t.id} onClick={() => setTier(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${
                tier === t.id ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface text-tamam-text-muted border border-tamam-outline/40'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        {loading ? (
          <SkeletonCard kind="suggestion" />
        ) : suggestions[tier]?.length ? (
          <SuggestionCardTamam suggestion={suggestionToCard(suggestions[tier][0])} onOpen={() => openSuggestion(suggestions[tier][0])} />
        ) : (
          <EmptyState icon="✨" title="ما في اقتراحات بهالتصنيف لسه" subtitle="جرّب تصنيف تاني أو العب لعبة المود" />
        )}
      </section>

      {/* F. Group deals */}
      {!loading && deals.length > 0 && (
        <section>
          <SectionHeader title="صفقات جماعية" />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
            {deals.slice(0, 6).map(d => (
              <div key={d.id} className="w-64 flex-shrink-0">
                <GroupDealCard deal={dealToCard(d)} onOpen={() => openDeal(d)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* G. Trusted restaurants */}
      <section>
        <SectionHeader title="مطاعم مختارة" actionLabel="كل المطاعم" onAction={() => navigate('/search')} />
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : restaurants.length ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {restaurants.slice(0, 8).map(r => (
                <RestaurantCardTamam key={r.id} restaurant={restaurantToCard(r)} onOpen={() => openRestaurant(r)} />
              ))}
            </div>
            {restaurants.length === 0 && <EmptyState icon="🏪" title="ما لقينا مطاعم بهالمنطقة" />}
          </>
        ) : (
          <EmptyState icon="🏪" title="ما لقينا مطاعم بهالمنطقة" />
        )}
      </section>

      {/* H. Trust explanation */}
      <section>
        <div className="grid grid-cols-2 gap-3">
          {TRUST.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-tamam-surface p-3 border border-tamam-outline/30 flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-tamam-green/15 text-tamam-green-bright flex items-center justify-center flex-shrink-0">
                <Icon size={18} />
              </div>
              <div>
                <p className="font-bold text-tamam-text text-xs">{title}</p>
                <p className="text-tamam-text-muted text-[11px] leading-snug mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}