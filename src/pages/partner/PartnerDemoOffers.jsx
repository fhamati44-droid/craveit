import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listPartnerCampaigns } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import { STATUS_AR, OFFER_TYPE_AR, fmtRange, fmtRemaining } from '@/lib/partnerDemoLabels';

const TABS = [
  { key: 'active', label: 'شغالة' },
  { key: 'scheduled', label: 'جاية' },
  { key: 'ready', label: 'جاهزة' },
  { key: 'ended', label: 'خلصت' },
];

const STATUS_TAB = {
  active: 'active', scheduled: 'scheduled', ready: 'ready',
  ended: 'ended', completed: 'ended', sold_out: 'ended', expired: 'ended',
};

export default function PartnerDemoOffers() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [tab, setTab] = useState('active');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    listPartnerCampaigns(rid).then(setOffers).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid]);

  const filtered = (offers || []).filter((o) => STATUS_TAB[o.status] === tab);

  return (
    <div className="px-4 py-4 space-y-4 pb-28" dir="rtl">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-xl text-tamam-text">بنك العروض</h1>
        <p className="text-tamam-text-muted text-xs">عروضك جاهزة، متى ما بدك بتشغلها.</p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/partner/offers/calendar')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-tamam-surface text-tamam-text-muted">الجدول</button>
        <button onClick={() => navigate('/partner/offers/plan')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-tamam-surface text-tamam-text-muted">خطة الشهر</button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${tab === t.key ? 'bg-tamam-green-bright text-tamam-ink shadow' : 'bg-tamam-surface text-tamam-text-muted'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-40 skeleton-t rounded-2xl" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title="ما قدرنا نحمّل العروض" actionLabel="إعادة" onAction={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏷️" title={`ما في عروض ${TABS.find(t=>t.key===tab)?.label || ''}`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <button key={o.id} onClick={() => navigate(`/partner/campaigns/${o.id}`)} className="w-full text-right bg-tamam-surface-lowest rounded-2xl overflow-hidden flex flex-col active:scale-[0.99] transition-transform border border-tamam-outline/20">
              <div className="relative h-32 w-full bg-gradient-to-br from-tamam-surface-high to-tamam-surface-lowest flex items-center justify-center">
                <span className="material-symbols-outlined text-[40px] text-tamam-green-bright/30">{iconForType(o.type)}</span>
                <div className="absolute top-3 right-3">
                  <span className="bg-tamam-surface/90 backdrop-blur text-tamam-text px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${o.status === 'active' ? 'bg-tamam-green-bright animate-pulse' : 'bg-tamam-gold'}`} />
                    {STATUS_AR[o.status] || o.status}
                  </span>
                </div>
                {o.unlock_type === 'point_locked' && (
                  <div className="absolute top-3 left-3 bg-tamam-gold/20 text-tamam-gold px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">lock</span>{o.unlock_points} نقطة
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2">
                <h2 className="font-bold text-base text-tamam-text truncate">{o.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-tamam-green/15 text-tamam-green-bright text-[10px] font-bold px-2 py-0.5 rounded-full">{o.type_label}</span>
                  {o.objective_label && <span className="bg-tamam-surface-high text-tamam-text-muted text-[10px] font-bold px-2 py-0.5 rounded-full">{o.objective_label}</span>}
                </div>
                {(o.start_at || o.end_at) && (
                  <div className="flex items-center gap-2 text-tamam-text-muted text-xs"><span className="material-symbols-outlined text-[16px]">schedule</span><span>{fmtRange(o.start_at, o.end_at)}</span></div>
                )}
                {o.customer_price != null && (
                  <div className="flex items-center gap-2 text-tamam-text text-xs">
                    <span className="material-symbols-outlined text-[16px] text-tamam-green-bright">payments</span>
                    <span>سعر العميل: <b>{o.customer_price} ₪</b>{o.normal_price > o.customer_price && <span className="text-tamam-text-muted line-through mr-1">{o.normal_price} ₪</span>}</span>
                  </div>
                )}
                {o.quota_total != null && (
                  <div className="flex items-center gap-2 text-tamam-text-muted text-xs">
                    <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                    <span>{o.quota_used} / {o.quota_total} طلب{o.status === 'active' && o.quota_remaining != null && ` — باقي ${o.quota_remaining}`}</span>
                  </div>
                )}
                {o.status === 'active' && o.remaining_time_ms > 0 && (
                  <div className="flex items-center gap-2 text-tamam-gold text-xs font-semibold">
                    <span className="material-symbols-outlined text-[16px]">timer</span>
                    <span>باقي: {fmtRemaining(o.remaining_time_ms)}</span>
                  </div>
                )}
                <div className="w-full bg-tamam-green-bright/10 text-tamam-green-bright py-2 rounded-lg font-bold text-sm text-center mt-1">شوف التفاصيل</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button onClick={() => navigate('/partner/offers/request')} className="w-full py-6 border-2 border-dashed border-tamam-outline/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-tamam-text-muted active:scale-95 active:bg-tamam-surface-low transition">
        <div className="w-11 h-11 rounded-full bg-tamam-surface flex items-center justify-center text-tamam-green-bright"><span className="material-symbols-outlined text-[26px]">add</span></div>
        <span className="font-bold text-sm text-tamam-text">اطلب فكرة عرض</span>
      </button>
    </div>
  );
}

function iconForType(type) {
  const map = {
    FIRST_TRIAL: 'rocket_launch', VALUE_ADD: 'card_giftcard', POINT_LOCKED: 'lock',
    LIMITED_TIME: 'timer', TIME_AND_QUANTITY: 'schedule', LIMITED_QUANTITY: 'inventory_2',
    SURPLUS: 'inventory', REACTIVATION: 'person', AOV_UPSELL: 'trending_up',
  };
  return map[type] || 'local_offer';
}