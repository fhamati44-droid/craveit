import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getPartnerHome, toggleAcceptingOrders, updateRestaurantSettings, listMenuItems } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import SignalSheet from '@/components/partner/SignalSheet';
import Toggle from '@/components/partner/Toggle';

const QUICK_ACTIONS = [
  { type: 'kitchen_pressure', icon: 'warning', label: 'عندي ضغط', circle: 'bg-tamam-error/20 text-tamam-error' },
  { type: 'sold_out', icon: 'block', label: 'صنف خلص', circle: 'bg-tamam-surface-highest text-tamam-text-muted' },
  { type: 'surplus', icon: 'inventory', label: 'عندي كمية', circle: 'bg-tamam-green/20 text-tamam-green-bright' },
  { type: 'strengthen_item', icon: 'trending_up', label: 'بدي أقوّي وجبة', circle: 'bg-tamam-gold-dark/30 text-tamam-gold' },
];

const STATUS_LABEL = { open: 'مفتوح', closed: 'مغلق', busy: 'ضغط', temporarily_unavailable: 'متوقف مؤقت' };

export default function PartnerHome() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [home, setHome] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [signal, setSignal] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [prep, setPrep] = useState(15);
  const [prepSaving, setPrepSaving] = useState(false);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    getPartnerHome(rid).then((h) => { setHome(h); setPrep(h?.restaurant?.preparation_time_min || 15); }).catch(() => setError(true)).finally(() => setLoading(false));
    listMenuItems(rid, 'all').then(setMenuItems).catch(() => {});
  };
  useEffect(load, [rid]);

  if (loading) return <SkeletonBlock />;
  if (error) return <EmptyState icon="⚠️" title="ما قدرنا نحمّل البيانات" actionLabel="إعادة" onAction={load} />;

  const r = home?.restaurant || {};
  const activeOffer = (home?.active_offers || [])[0];
  const scheduled = home?.scheduled_offers || [];
  const menuIssues = home?.menu_issues || [];

  const toggleAccept = async () => {
    setToggling(true);
    try { await toggleAcceptingOrders(rid, !r.accepts_orders); load(); } catch {} finally { setToggling(false); }
  };
  const changePrep = async (delta) => {
    const next = Math.max(5, Math.min(120, prep + delta));
    setPrep(next);
    setPrepSaving(true);
    try { await updateRestaurantSettings(rid, { preparation_time_min: next, preparation_time_max: next }); } catch {} finally { setPrepSaving(false); }
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* 1. Live Status Bar */}
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
            <button onClick={() => changePrep(-5)} disabled={prepSaving} className="w-8 h-8 flex items-center justify-center bg-tamam-surface-high rounded-lg text-tamam-text active:scale-95">
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
            <span className="font-bold text-tamam-green-bright w-8 text-center">{prep}</span>
            <span className="text-tamam-text-muted text-[11px]">دقيقة</span>
            <button onClick={() => changePrep(5)} disabled={prepSaving} className="w-8 h-8 flex items-center justify-center bg-tamam-surface-high rounded-lg text-tamam-text active:scale-95">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Quick Signal Grid */}
      <section className="space-y-2">
        <h3 className="font-bold text-sm text-tamam-text px-1">تحديث سريع للوضع</h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <button key={a.type} onClick={() => setSignal(a.type)} className="flex flex-col items-center justify-center gap-2 bg-tamam-surface-low p-3 rounded-2xl active:scale-95 transition-transform min-h-[92px]">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${a.circle}`}>
                <span className="material-symbols-outlined text-[22px]">{a.icon}</span>
              </div>
              <span className="text-tamam-text text-xs font-bold text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Active Offer */}
      <section className="space-y-2">
        <h3 className="font-bold text-sm text-tamam-text px-1">عرض فعّال حالياً</h3>
        {activeOffer ? (
          <div className="bg-tamam-green text-tamam-ink rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-l from-tamam-green-bright/20 to-transparent" />
            <div className="p-4 relative z-10 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-base">{activeOffer.title}</span>
                  {activeOffer.end_at && <span className="text-xs opacity-80">ينتهي {fmtTime(activeOffer.end_at)}</span>}
                </div>
                <div className="bg-tamam-green-dark text-tamam-green-bright px-2 py-0.5 rounded-lg text-[11px] font-bold">شغّالة</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span>الهدف: بانتظار بيانات فعلية</span>
                  <span>تم: —</span>
                </div>
                <div className="w-full h-2 bg-tamam-green-dark/30 rounded-full overflow-hidden">
                  <div className="h-full bg-tamam-green-dark rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-tamam-surface rounded-2xl p-4 text-center text-tamam-text-muted text-sm">ما في عرض شغّال هسا.</div>
        )}
      </section>

      {/* 4. Attention */}
      {menuIssues.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-bold text-sm text-tamam-text px-1">محتاجين انتباهك</h3>
          <button onClick={() => navigate('/partner/menu')} className="w-full text-right bg-tamam-gold-dark text-tamam-ink rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99]">
            <span className="material-symbols-outlined text-[28px]">notifications_active</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate">مراجعة المنيو ({menuIssues.length})</h4>
              <p className="text-xs opacity-90">في أصناف ناقصة بيانات أو ربط. راجعها حتى تظل حسابات العروض صحيحة.</p>
            </div>
            <span className="bg-tamam-ink/15 w-9 h-9 rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>
            </span>
          </button>
        </section>
      )}

      {/* 5. Schedule */}
      <section className="space-y-2">
        <h3 className="font-bold text-sm text-tamam-text px-1">خطة العروض لليوم</h3>
        <div className="bg-tamam-surface rounded-2xl p-4 flex flex-col gap-3">
          {scheduled.length === 0 ? (
            <p className="text-tamam-text-muted text-xs text-center py-2">ما في عروض مجدولة اليوم.</p>
          ) : scheduled.map((o, i) => {
            const live = o.status === 'active';
            return (
              <div key={o.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`w-3 h-3 rounded-full ${live ? 'bg-tamam-green-bright' : 'bg-tamam-surface-highest'}`} />
                  {i < scheduled.length - 1 && <div className="w-0.5 flex-1 bg-tamam-surface-highest my-1" />}
                </div>
                <div className="flex flex-col pb-1">
                  <span className="text-tamam-text-muted text-[11px]">{fmtRange(o.start_at, o.end_at)}</span>
                  <span className="text-tamam-text text-sm font-semibold">{o.title} <span className={`text-[11px] ${live ? 'text-tamam-green-bright' : 'text-tamam-text-muted'}`}>({live ? 'نشط' : 'مجدول'})</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Weekly Summary */}
      <section className="space-y-2">
        <h3 className="font-bold text-sm text-tamam-text px-1">مختصر الأسبوع</h3>
        <div className="bg-tamam-surface rounded-2xl p-4">
          <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-tamam-text-muted opacity-50">bar_chart</span>
            <p className="text-tamam-text text-sm font-semibold">لسه ما في بيانات كافية لعرض ملخص الأسبوع.</p>
            <p className="text-tamam-text-muted text-[11px]">رح تظهر النتائج هون بعد تنفيذ طلبات فعلية عبر TAMAM.</p>
          </div>
        </div>
      </section>

      <SignalSheet open={!!signal} type={signal} restaurantId={rid} menuItems={menuItems} onClose={() => setSignal(null)} onSubmitted={load} />
    </div>
  );
}

function fmtTime(iso) { try { return new Date(iso).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
function fmtRange(a, b) {
  try {
    const s = new Date(a).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' });
    const e = b ? new Date(b).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' }) : '';
    return e ? `${s} - ${e}` : s;
  } catch { return ''; }
}

function SkeletonBlock() {
  return (
    <div className="p-4 space-y-3">
      <div className="h-24 skeleton-t rounded-2xl" />
      <div className="h-28 skeleton-t rounded-2xl" />
      <div className="h-20 skeleton-t rounded-2xl" />
    </div>
  );
}