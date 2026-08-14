import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getPartnerHome, toggleAcceptingOrders, listMenuItems } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import SignalSheet from '@/components/partner/SignalSheet';

const QUICK_ACTIONS = [
  { type: 'kitchen_pressure', icon: 'local_fire_department', label: 'عندي ضغط' },
  { type: 'sold_out', icon: 'do_not_disturb_on', label: 'صنف خلص' },
  { type: 'surplus', icon: 'inventory_2', label: 'عندي كمية' },
  { type: 'strengthen_item', icon: 'trending_up', label: 'بدي أقوّي وجبة' },
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

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    getPartnerHome(rid).then(setHome).catch(() => setError(true)).finally(() => setLoading(false));
    listMenuItems(rid, 'all').then(setMenuItems).catch(() => {});
  };
  useEffect(load, [rid]);

  if (loading) return <SkeletonBlock />;
  if (error) return <EmptyState icon="⚠️" title="ما قدرنا نحمّل البيانات" actionLabel="إعادة" onAction={load} />;

  const r = home?.restaurant || {};
  const toggleAccept = async () => {
    setToggling(true);
    try { await toggleAcceptingOrders(rid, !r.accepts_orders); load(); } catch {} finally { setToggling(false); }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Status card */}
      <section className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-tamam-text-muted">الحالة التشغيلية</p>
            <p className="font-bold text-base">{STATUS_LABEL[r.current_status] || 'مفتوح'}</p>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${r.accepts_orders ? 'bg-tamam-green/20 text-tamam-green-bright' : 'bg-surface-container-high text-on-surface-variant'}`}>
            {r.accepts_orders ? 'يستقبل طلبات' : 'متوقف عن الاستقبال'}
          </span>
        </div>
        <button onClick={toggleAccept} disabled={toggling} className="w-full h-11 bg-tamam-surface-high text-tamam-text rounded-xl font-bold text-sm active:scale-[0.98] disabled:opacity-50">
          {r.accepts_orders ? 'إيقاف استقبال الطلبات' : 'فتح استقبال الطلبات'}
        </button>
        {r.preparation_time_min != null && (
          <p className="text-[11px] text-tamam-text-muted mt-2 text-center">وقت التحضير الحالي: {r.preparation_time_min}–{r.preparation_time_max || r.preparation_time_min} دقيقة</p>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="font-bold text-sm mb-2">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <button key={a.type} onClick={() => setSignal(a.type)} className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform min-h-[84px]">
              <span className="material-symbols-outlined text-tamam-green-bright text-[26px]">{a.icon}</span>
              <span className="text-xs font-bold text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Active orders preview */}
      <PreviewCard
        title="طلبات تحتاج إجراء"
        count={home?.counts?.active_orders || 0}
        empty="ما في طلبات جديدة هسا"
        onMore={() => navigate('/partner/orders')}
      >
        {(home?.active_orders || []).slice(0, 3).map((o) => (
          <div key={o.id} className="flex justify-between bg-tamam-surface-low rounded-xl px-3 py-2 text-sm">
            <span className="truncate">{o.parent_order_number || `#${o.id?.slice(-6)}`}</span>
            <span className="text-tamam-text-muted text-[11px]">{o.items_count} صنف</span>
          </div>
        ))}
      </PreviewCard>

      {/* Active offers preview */}
      <PreviewCard
        title="عروض شغّالة"
        count={home?.counts?.live_offers || 0}
        empty="ما في عروض شغّالة هسا"
        onMore={() => navigate('/partner/offers')}
      >
        {(home?.active_offers || []).slice(0, 3).map((o) => (
          <div key={o.id} className="flex justify-between bg-tamam-surface-low rounded-xl px-3 py-2 text-sm">
            <span className="truncate">{o.title}</span>
            <span className="text-tamam-green-bright text-[11px]">شغّالة</span>
          </div>
        ))}
      </PreviewCard>

      {/* Menu issues */}
      <PreviewCard
        title="المنيو يحتاج انتباه"
        count={home?.counts?.menu_issues || 0}
        empty="المنيو مكتمل ✅"
        onMore={() => navigate('/partner/menu')}
      >
        {(home?.menu_issues || []).slice(0, 4).map((i) => (
          <div key={i.id} className="flex justify-between bg-tamam-surface-low rounded-xl px-3 py-2 text-sm">
            <span className="truncate">{i.name || 'صنف'}</span>
            <span className="text-tamam-gold text-[11px]">{!i.has_image ? 'صورة ناقصة' : 'ربط ناقص'}</span>
          </div>
        ))}
      </PreviewCard>

      {/* Weekly summary — honest empty state */}
      <section className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-4 text-center">
        <p className="text-[11px] text-tamam-text-muted mb-1">ملخص الأسبوع</p>
        <p className="text-sm text-tamam-text-muted leading-relaxed">لسه ما في بيانات كافية لعرض ملخص الأسبوع.<br />رح تظهر النتائج هون بعد تنفيذ طلبات فعلية عبر TAMAM.</p>
      </section>

      <SignalSheet open={!!signal} type={signal} restaurantId={rid} menuItems={menuItems} onClose={() => setSignal(null)} onSubmitted={load} />
    </div>
  );
}

function PreviewCard({ title, count, empty, onMore, children }) {
  return (
    <section className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-sm">{title} {count > 0 && <span className="text-tamam-green-bright text-xs">({count})</span>}</h2>
        <button onClick={onMore} className="text-tamam-green-bright text-[11px] font-bold">عرض الكل</button>
      </div>
      {count > 0 ? <div className="space-y-1.5">{children}</div> : <p className="text-center text-tamam-text-muted text-xs py-3">{empty}</p>}
    </section>
  );
}

function SkeletonBlock() {
  return <div className="p-4 space-y-3"><div className="h-24 skeleton-t rounded-2xl" /><div className="h-20 skeleton-t rounded-2xl" /><div className="h-20 skeleton-t rounded-2xl" /></div>;
}