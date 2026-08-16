import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getPartnerHome, getOpportunities, getCampaignResults, toggleAcceptingOrders, updateRestaurantSettings, listMenuItems, listOfferRequests } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import QuickActionFlow from '@/components/partner/QuickActionFlow';
import UrgentActions from '@/components/partner/UrgentActions';
import Toggle from '@/components/partner/Toggle';
import HomeDemandSummary from '@/components/partner/demand/HomeDemandSummary';
import HomeMenuOnboarding from '@/components/partner/menu/HomeMenuOnboarding';
import PartnerDemoHome from '@/components/partner/demo/PartnerDemoHome';

const QUICK_ACTIONS = [
  { flow: 'pressure', icon: 'warning', label: 'عندي ضغط', desc: 'ارفع وقت التحضير أو أوقف', circle: 'bg-tamam-error/20 text-tamam-error' },
  { flow: 'surplus', icon: 'inventory', label: 'عندي كمية', desc: 'بيع كمية متوفرة بسرعة', circle: 'bg-tamam-green/20 text-tamam-green-bright' },
  { flow: 'strengthen', icon: 'trending_up', label: 'بدي أقوّي وجبة', desc: 'حرّك وجبة ضعيفة', circle: 'bg-tamam-gold-dark/30 text-tamam-gold' },
  { flow: 'sold_out', icon: 'block', label: 'صنف خلص', desc: 'اخفٍ صنف غير متوفر', circle: 'bg-tamam-surface-highest text-tamam-text-muted' },
];

const HERO_META = {
  weak_hour: { icon: 'schedule', label: 'الساعات الهادئة', tint: 'bg-tamam-green/15 text-tamam-green-bright' },
  weak_day: { icon: 'event_busy', label: 'الأيام الضعيفة', tint: 'bg-tamam-gold/15 text-tamam-gold' },
  low_item: { icon: 'trending_down', label: 'وجبة ضعيفة', tint: 'bg-tamam-error/15 text-tamam-error' },
  new_customers: { icon: 'person_add', label: 'زبائن جدد', tint: 'bg-tamam-surface-high text-tamam-green-bright' },
};

const CAPACITY_META = {
  available: { label: 'قدرة المطبخ متاحة', tone: 'text-tamam-green-bright' },
  moderate: { label: 'قدرة المطبخ متوسطة', tone: 'text-tamam-gold' },
  high_pressure: { label: 'قدرة المطبخ تحت الضغط', tone: 'text-tamam-error' },
};

function pad2(n) { return String(n).padStart(2, '0'); }

function heroInsight(card) {
  if (!card || !card.available) return 'لسه بنجمع بيانات حتى نحدد أفضل فرصة لمطعمك.';
  if (card.key === 'weak_hour') return `بين ${pad2(card.hour)}:00 و${pad2(card.hour)}:59 أهدأ من المعتاد (${card.count} طلب).`;
  if (card.key === 'weak_day') return `يوم ${card.day_name} أهدأ أيام الأسبوع (${card.count} طلب).`;
  if (card.key === 'low_item') return `وجبة "${card.name}" مبيعاتها أقل من متوسط المنيو.`;
  if (card.key === 'new_customers') return 'عندك فرصة للوصول إلى زبائن جدد قريبين من المطعم.';
  return '';
}

export default function PartnerHome() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const isDemo = !!activeRestaurant?.is_demo;
  if (isDemo) return <PartnerDemoHome />;

  const [home, setHome] = useState(null);
  const [ops, setOps] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [flow, setFlow] = useState(null);
  const [offerRequests, setOfferRequests] = useState([]);
  const [toggling, setToggling] = useState(false);
  const [prep, setPrep] = useState(15);
  const [prepSaving, setPrepSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [menuItems, setMenuItems] = useState([]);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    getPartnerHome(rid).then((h) => { setHome(h); setPrep(h?.restaurant?.preparation_time_min || 15); }).catch(() => setError(true)).finally(() => setLoading(false));
    getOpportunities(rid).then(setOps).catch(() => {});
    getCampaignResults(rid).then(setResults).catch(() => {});
    listMenuItems(rid, 'all').then(setMenuItems).catch(() => {});
    listOfferRequests(rid).then(setOfferRequests).catch(() => {});
  };
  useEffect(load, [rid]);

  if (loading) return <SkeletonBlock />;
  if (error) return <EmptyState icon="⚠️" title="ما قدرنا نحمّل البيانات" actionLabel="إعادة" onAction={load} />;

  const r = home?.restaurant || {};
  const activeOffer = (home?.active_offers || [])[0];
  const menuIssues = home?.menu_issues || [];

  const primary = ops?.primary;
  const showPrimary = primary && !dismissed;
  const capacity = ops?.kitchen_capacity;
  const capacityMeta = CAPACITY_META[capacity?.level || 'available'];
  const highPressure = capacity?.level === 'high_pressure';

  const toggleAccept = async () => {
    setToggling(true);
    try { await toggleAcceptingOrders(rid, !r.accepts_orders); load(); } catch {} finally { setToggling(false); }
  };
  const changePrep = async (delta) => {
    const next = Math.max(5, Math.min(120, prep + delta));
    setPrep(next); setPrepSaving(true);
    try { await updateRestaurantSettings(rid, { preparation_time_min: next, preparation_time_max: next }); } catch {} finally { setPrepSaving(false); }
  };

  const reviewCampaign = () => {
    if (!primary) return;
    navigate('/partner/offers/request', { state: { prefill: primary.prefill, opportunity_type: primary.type_label, opportunity_reason: primary.reason } });
  };

  const heroCards = ops?.hero_cards || [{ key: 'weak_hour', available: false }, { key: 'weak_day', available: false }, { key: 'low_item', available: false }, { key: 'new_customers', available: false }];

  return (
    <div className="px-4 py-4 space-y-5">
      {/* 1. Live Status */}
      <section className="bg-tamam-surface rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${r.accepts_orders ? 'bg-tamam-green-bright animate-pulse' : 'bg-tamam-text-muted'}`} />
            <h2 className="font-bold text-sm text-tamam-text">المطعم يستقبل الطلبات</h2>
          </div>
          <Toggle checked={!!r.accepts_orders} onChange={toggleAccept} disabled={toggling} />
        </div>
        <div className="flex items-center justify-between bg-tamam-surface-low rounded-xl px-3 py-2">
          <span className="text-tamam-text-muted text-xs">وقت التحضير المتوقع</span>
          <div className="flex items-center gap-2">
            <button onClick={() => changePrep(-5)} disabled={prepSaving} className="w-8 h-8 flex items-center justify-center bg-tamam-surface-high rounded-lg text-tamam-text active:scale-95"><span className="material-symbols-outlined text-[20px]">remove</span></button>
            <span className="font-bold text-tamam-green-bright w-8 text-center">{prep}</span>
            <span className="text-tamam-text-muted text-[11px]">دقيقة</span>
            <button onClick={() => changePrep(5)} disabled={prepSaving} className="w-8 h-8 flex items-center justify-center bg-tamam-surface-high rounded-lg text-tamam-text active:scale-95"><span className="material-symbols-outlined text-[20px]">add</span></button>
          </div>
        </div>
      </section>

      {/* 1b. Urgent actions */}
      <UrgentActions home={home} offerRequests={offerRequests} prepTime={prep} onNavigate={navigate} />

      {/* 1c. Weekly demand summary (خفايا الحركة) */}
      <HomeDemandSummary />

      {/* 1d. Menu onboarding */}
      <HomeMenuOnboarding />

      {/* 2. Growth Hero */}
      <section className="space-y-2">
        <div>
          <h2 className="font-bold text-lg text-tamam-text">شو بدك تقوّي اليوم؟</h2>
          <p className="text-tamam-text-muted text-xs">اخترنا أهم فرص نمو لمطعمك من بياناتك الحقيقية.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {heroCards.map((c, i) => {
            const meta = HERO_META[c.key] || HERO_META.new_customers;
            return (
              <div key={c.key || i} className="bg-tamam-surface rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${meta.tint}`}>
                    <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                  </div>
                  <span className="text-xs font-bold text-tamam-text">{meta.label}</span>
                </div>
                <p className={`text-[11px] leading-snug ${c.available ? 'text-tamam-text' : 'text-tamam-text-muted'}`}>{heroInsight(c)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Primary TAMAM Opportunity */}
      {showPrimary ? (
        <section className="space-y-2">
          <h3 className="font-bold text-sm text-tamam-text px-1">فرصة TAMAM إلك اليوم</h3>
          <div className="bg-gradient-to-b from-tamam-green/12 to-tamam-surface border border-tamam-green/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 bg-tamam-green text-tamam-ink text-[11px] font-bold px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>{primary.type_label}
              </span>
              <span className={`text-[11px] font-bold ${capacityMeta.tone}`}>{capacityMeta.label}</span>
            </div>
            <p className="text-tamam-text text-sm leading-snug">{primary.reason}</p>
            {primary.source === 'merchant' && (
              <span className="inline-flex items-center gap-1 bg-tamam-gold/15 text-tamam-gold text-[10px] font-bold px-2 py-0.5 rounded-full self-start">
                <span className="material-symbols-outlined text-[12px]">person</span>حددته أنت
              </span>
            )}
            <div className="grid grid-cols-2 gap-2 bg-tamam-surface-low rounded-xl p-3">
              <Detail label="الوجبة المقترحة" value={primary.meal ? primary.meal.name : primary.meal_label} />
              {primary.window && <Detail label="وقت الحملة" value={primary.window} />}
              <Detail label="الحد الأقصى للطلبات" value={primary.max_orders_label} />
              <Detail label="الجمهور المستهدف" value={primary.audience_label} />
              <Detail label="الهدف من الحملة" value={primary.strategy_label} />
              <Detail label="قدرة المطبخ" value={capacityMeta.label} />
            </div>
            <div className="flex gap-2">
              <button onClick={reviewCampaign} disabled={highPressure}
                className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${highPressure ? 'bg-tamam-surface-high text-tamam-text-muted' : 'bg-tamam-green text-tamam-ink'}`}>
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>راجع الحملة
              </button>
              <button onClick={() => setDismissed(true)} className="px-4 h-12 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm active:scale-95 transition-transform">مش هسا</button>
            </div>
            {highPressure && <p className="text-tamam-error text-[11px] text-center font-semibold">مطبخك تحت الضغط — خفّفه وبعدين نشغّل الحملة.</p>}
          </div>
        </section>
      ) : ops && !ops.has_data ? (
        <section className="bg-tamam-surface rounded-2xl p-5 text-center space-y-2">
          <span className="material-symbols-outlined text-[34px] text-tamam-text-muted opacity-50">insights</span>
          <p className="text-tamam-text text-sm font-semibold">لسه بنجمع بيانات حتى نحدد أفضل فرصة لمطعمك.</p>
          <p className="text-tamam-text-muted text-[11px]">رح تظهر اقتراحات TAMAM هون بعد تنفيذ طلبات فعلية عبر التطبيق.</p>
        </section>
      ) : null}

      {/* 4. Results */}
      <section className="space-y-2">
        <h3 className="font-bold text-sm text-tamam-text px-1">شو حققت TAMAM لمطعمك؟</h3>
        {results?.has_data ? (
          <div className="bg-tamam-surface rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-tamam-surface-low rounded-xl p-3">
                <p className="text-[10px] font-bold text-tamam-text-muted mb-1.5">مبيعاتك الكلية</p>
                <Stat label="طلبات مكتملة" value={results.total.orders} />
                <Stat label="المبيعات" value={`₪${results.total.revenue}`} />
                <Stat label="متوسط قيمة الطلب" value={`₪${results.total.aov}`} />
                <Stat label="نسبة الرجوع" value={results.total.return_rate != null ? `${results.total.return_rate}%` : '—'} />
              </div>
              <div className="bg-tamam-green/10 border border-tamam-green/25 rounded-xl p-3">
                <p className="text-[10px] font-bold text-tamam-green-bright mb-1.5">ناتج عن حملات TAMAM</p>
                <Stat label="طلبات عبر الحملات" value={results.tamam.campaign_orders} />
                <Stat label="مبيعات الحملات" value={`₪${results.tamam.campaign_revenue}`} />
                <Stat label="زبائن جدبتهم الحملات" value={results.tamam.new_customers_via_campaign} />
                <Stat label="حملات اكتملت" value={results.tamam.completed_campaigns} />
                <Stat label="توقفت عند الحد" value={results.tamam.stopped_by_limit} />
              </div>
            </div>
            <p className="text-[10px] text-tamam-text-muted text-center">نفصل بين مبيعاتك الكلية والمبيعات اللي جات عبر حملات TAMAM.</p>
          </div>
        ) : (
          <div className="bg-tamam-surface rounded-2xl p-5 text-center space-y-2">
            <span className="material-symbols-outlined text-[34px] text-tamam-text-muted opacity-50">bar_chart</span>
            <p className="text-tamam-text text-sm font-semibold">لسه ما في نتائج حملات لعرضها.</p>
            <p className="text-tamam-text-muted text-[11px]">رح تظهر هون أول ما تشتغل حملة وتنفيذ طلبات.</p>
          </div>
        )}
      </section>

      {/* 5. Quick Signal Grid */}
      <section className="space-y-2">
        <h3 className="font-bold text-sm text-tamam-text px-1">تحديث سريع للوضع</h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <button key={a.flow} onClick={() => setFlow(a.flow)} className="flex flex-col items-center justify-center gap-1.5 bg-tamam-surface-low p-3 rounded-2xl active:scale-95 transition-transform min-h-[96px]">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${a.circle}`}><span className="material-symbols-outlined text-[22px]">{a.icon}</span></div>
              <span className="text-tamam-text text-xs font-bold text-center leading-tight">{a.label}</span>
              <span className="text-[10px] text-tamam-text-muted text-center leading-tight">{a.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 6. Active Offer */}
      <section className="space-y-2">
        <h3 className="font-bold text-sm text-tamam-text px-1">عرض فعّال حالياً</h3>
        {activeOffer ? (
          <div className="bg-tamam-green text-tamam-ink rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-l from-tamam-green-bright/20 to-transparent" />
            <div className="p-4 relative z-10 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-base">{activeOffer.title}</span>
                  {activeOffer.end_at && <span className="text-xs opacity-80">ينتهي {fmtTime(activeOffer.end_at)}</span>}
                </div>
                <div className="bg-tamam-green-dark text-tamam-green-bright px-2 py-0.5 rounded-lg text-[11px] font-bold">شغّالة</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-tamam-surface rounded-2xl p-4 text-center text-tamam-text-muted text-sm">ما في عرض شغّال هسا.</div>
        )}
      </section>

      {/* 7. Quick links */}
      <section className="grid grid-cols-3 gap-2">
        <button onClick={() => navigate('/partner/offers/calendar')} className="flex flex-col items-center gap-1.5 bg-tamam-surface rounded-2xl p-3 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-tamam-green-bright text-[24px]">event</span>
          <span className="text-[11px] font-bold text-tamam-text">خطة اليوم</span>
        </button>
        <button onClick={() => navigate('/partner/offers/plan')} className="flex flex-col items-center gap-1.5 bg-tamam-surface rounded-2xl p-3 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-tamam-green-bright text-[24px]">calendar_view_month</span>
          <span className="text-[11px] font-bold text-tamam-text">خطة الشهر</span>
        </button>
        <button onClick={() => navigate('/partner/more/restaurant-profile')} className="flex flex-col items-center gap-1.5 bg-tamam-surface rounded-2xl p-3 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-tamam-green-bright text-[24px]">shield</span>
          <span className="text-[11px] font-bold text-tamam-text">جاهزية المطعم</span>
        </button>
      </section>

      {menuIssues.length > 0 && (
        <button onClick={() => navigate('/partner/menu')} className="w-full text-right bg-tamam-gold-dark text-tamam-ink rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99]">
          <span className="material-symbols-outlined text-[28px]">notifications_active</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm truncate">مراجعة المنيو ({menuIssues.length})</h4>
            <p className="text-xs opacity-90">في أصناف ناقصة بيانات أو ربط.</p>
          </div>
          <span className="bg-tamam-ink/15 w-9 h-9 rounded-full flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[20px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span></span>
        </button>
      )}

      <QuickActionFlow open={!!flow} flow={flow} restaurantId={rid} menuItems={menuItems} prepTime={prep} onClose={() => setFlow(null)} onDone={load} />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-tamam-text-muted">{label}</p>
      <p className="text-[12px] font-bold text-tamam-text leading-tight">{value}</p>
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-tamam-text-muted">{label}</span>
      <span className="text-[11px] font-bold text-tamam-text">{value}</span>
    </div>
  );
}

function fmtTime(iso) { try { return new Date(iso).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }

function SkeletonBlock() {
  return (
    <div className="p-4 space-y-3">
      <div className="h-24 skeleton-t rounded-2xl" />
      <div className="h-28 skeleton-t rounded-2xl" />
      <div className="h-40 skeleton-t rounded-2xl" />
    </div>
  );
}