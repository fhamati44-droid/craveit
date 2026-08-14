import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listPartnerOffers, getPartnerOffer } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import OfferDetailSheet from '@/components/partner/OfferDetailSheet';

const TABS = [
  { key: 'active', label: 'شغالة' },
  { key: 'scheduled', label: 'جاية' },
  { key: 'draft', label: 'جاهزة' },
  { key: 'ended', label: 'منتهية' },
];

const STATUS_TAB = {
  active: 'active', scheduled: 'scheduled', draft: 'draft',
  ended: 'ended', completed: 'ended', cancelled: 'ended', failed: 'ended', paused: 'ended',
};

const STATUS_LABEL = { active: 'شغّالة', scheduled: 'جاية', draft: 'جاهزة', paused: 'متوقفة', ended: 'منتهية', completed: 'مكتملة', cancelled: 'ملغية', failed: 'فاشلة' };

export default function PartnerOffers() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [tab, setTab] = useState('active');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    listPartnerOffers(rid).then(setOffers).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid]);

  const filtered = (offers || []).filter((o) => STATUS_TAB[o.status] === tab);
  const open = async (o) => { try { const d = await getPartnerOffer(rid, o.id); setDetail(d); } catch { setDetail({ offer: o }); } };

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-xl text-tamam-text">بنك العروض</h1>
        <p className="text-tamam-text-muted text-xs">عروضك جاهزة، متى ما بدك بتشغلها.</p>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex-1 py-2 rounded-xl text-xs font-bold bg-tamam-green-bright text-tamam-ink">بنك العروض</button>
        <button onClick={() => navigate('/partner/offers/calendar')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-tamam-surface text-tamam-text-muted">الجدول</button>
        <button onClick={() => navigate('/partner/offers/plan')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-tamam-surface text-tamam-text-muted">خطة الشهر</button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${tab === t.key ? 'bg-tamam-green-bright text-tamam-ink shadow' : 'bg-tamam-surface text-tamam-text-muted'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-48 skeleton-t rounded-2xl" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title="ما قدرنا نحمّل العروض" actionLabel="إعادة" onAction={load} />
      ) : filtered.length === 0 ? (
        <EmptyOffers tab={tab} onGoDraft={() => setTab('draft')} onUpdateInfo={() => navigate('/partner/more/restaurant-profile')} />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="bg-tamam-surface-lowest rounded-2xl overflow-hidden flex flex-col active:scale-[0.99] transition-transform">
              <button onClick={() => open(o)} className="relative h-44 w-full text-right">
                {o.hero_image ? (
                  <img src={o.hero_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-tamam-surface-high to-tamam-surface-lowest flex items-center justify-center">
                    <span className="material-symbols-outlined text-[40px] text-tamam-text-muted opacity-50">local_offer</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="bg-tamam-surface/90 backdrop-blur text-tamam-text px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${o.status === 'active' ? 'bg-tamam-green-bright animate-pulse' : 'bg-tamam-gold'}`} />
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 left-3 flex justify-between items-end">
                  <h2 className="font-bold text-lg text-white drop-shadow truncate">{o.title}</h2>
                  <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white shrink-0"><span className="material-symbols-outlined text-[20px]">edit</span></div>
                </div>
              </button>
              <div className="p-4 flex flex-col gap-2">
                {(o.start_at || o.end_at) && (
                  <div className="flex items-center gap-2 text-tamam-text-muted text-xs"><span className="material-symbols-outlined text-[18px]">schedule</span><span>{fmtRange(o.start_at, o.end_at)}</span></div>
                )}
                {o.reference_price != null && (
                  <div className="flex items-center gap-2 text-tamam-text text-xs"><span className="material-symbols-outlined text-[18px] text-tamam-green-bright">payments</span><span>سعر العميل: <b>{o.reference_price} ₪</b></span></div>
                )}
                <button onClick={() => open(o)} className="w-full bg-tamam-green-bright text-tamam-ink py-2.5 rounded-lg font-bold text-sm active:scale-95 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">visibility</span>راجع العرض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => navigate('/partner/offers/request')} className="w-full py-6 border-2 border-dashed border-tamam-outline/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-tamam-text-muted active:scale-95 active:bg-tamam-surface-low transition">
        <div className="w-11 h-11 rounded-full bg-tamam-surface flex items-center justify-center text-tamam-green-bright"><span className="material-symbols-outlined text-[26px]">add</span></div>
        <span className="font-bold text-sm text-tamam-text">اطلب فكرة عرض</span>
        <span className="text-xs text-center max-w-[220px]">احكيلنا شو بدك تحرّك، وTAMAM بتجهزلك فكرة ضمن حدودك.</span>
      </button>

      <OfferDetailSheet open={!!detail} offer={detail} restaurantId={rid} onClose={() => setDetail(null)} />
    </div>
  );
}

function EmptyOffers({ tab, onGoDraft, onUpdateInfo }) {
  if (tab === 'active') {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-10">
        <div className="relative w-20 h-20">
          <div className="w-full h-full rounded-2xl bg-tamam-surface flex items-center justify-center"><span className="material-symbols-outlined text-tamam-text-muted text-[36px]" style={{ transform: 'rotate(-15deg)' }}>local_offer</span></div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-tamam-error/20 flex items-center justify-center"><span className="material-symbols-outlined text-tamam-error text-[16px]">close</span></div>
        </div>
        <h3 className="font-bold text-base text-tamam-text">ما عندك عروض شغالة هسّا</h3>
        <p className="text-tamam-text-muted text-sm max-w-[260px]">تقدر تزيد مبيعاتك من خلال تشغيل عروض جاهزة.</p>
        <button onClick={onGoDraft} className="bg-tamam-green-bright text-tamam-ink px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1 active:scale-95"><span className="material-symbols-outlined text-[18px]">inventory</span>شوف العروض الجاهزة</button>
      </div>
    );
  }
  if (tab === 'draft') {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-10">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-tamam-outline/50 flex items-center justify-center"><span className="material-symbols-outlined text-tamam-text-muted text-[28px]">add</span></div>
        <h3 className="font-bold text-base text-tamam-text">لسه ما جهزنا أفكار جديدة</h3>
        <p className="text-tamam-text-muted text-sm max-w-[260px]">TAMAM عم تراجع بيانات مطعمك عشان تجهز أفكار مناسبة.</p>
        <button onClick={onUpdateInfo} className="bg-tamam-surface text-tamam-text px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1 active:scale-95"><span className="material-symbols-outlined text-[18px]">edit</span>حدّث بيانات المطعم</button>
      </div>
    );
  }
  return <EmptyState icon="🏷️" title="ما في عروض بهاد القسم" />;
}

function fmtRange(a, b) {
  try {
    const s = a ? new Date(a).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const e = b ? new Date(b).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return s && e ? `${s} ← ${e}` : s || e || '';
  } catch { return ''; }
}