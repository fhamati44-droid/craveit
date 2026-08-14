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

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${tab === t.key ? 'bg-tamam-green-bright text-tamam-ink shadow' : 'bg-tamam-surface text-tamam-text-muted'}`}>{t.label}</button>
        ))}
      </div>

      {/* Info banner on جاهزة tab */}
      {tab === 'draft' && filtered.length > 0 && (
        <div className="bg-tamam-surface-high rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-tamam-surface-highest flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-tamam-text-muted">lightbulb</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-sm text-tamam-text">لسه مش شغّالة.</h3>
            <p className="text-tamam-text-muted text-xs">TAMAM جهزت الفكرة لكنها مش شغّالة هسا. تقدر تراجعها أو تطلب تشغيلها لما تكون مستعد.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-48 skeleton-t rounded-2xl" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title="ما قدرنا نحمّل العروض" actionLabel="إعادة" onAction={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏷️" title="ما في عروض بهاد القسم" />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="bg-tamam-surface-lowest rounded-2xl overflow-hidden flex flex-col active:scale-[0.99] transition-transform">
              {/* Image hero */}
              <button onClick={() => open(o)} className="relative h-44 w-full text-right">
                {o.hero_image ? (
                  <img src={o.hero_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-tamam-surface-high to-tamam-surface-lowest flex items-center justify-center">
                    <span className="material-symbols-outlined text-[40px] text-tamam-text-muted/50">local_offer</span>
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
                  <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white shrink-0">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </div>
                </div>
              </button>
              {/* Details */}
              <div className="p-4 flex flex-col gap-3">
                {(o.start_at || o.end_at) && (
                  <div className="flex items-center gap-2 text-tamam-text-muted text-xs">
                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                    <span>{fmtRange(o.start_at, o.end_at)}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => open(o)} className="flex-1 bg-tamam-green-bright text-tamam-ink py-2.5 rounded-lg font-bold text-sm active:scale-95 flex justify-center items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">{o.status === 'draft' ? 'visibility' : 'arrow_forward'}</span>
                    {o.status === 'draft' ? 'مراجعة العرض' : 'التفاصيل'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request idea CTA */}
      <button onClick={() => navigate('/partner/offers/request')} className="w-full py-6 border-2 border-dashed border-tamam-outline/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-tamam-text-muted active:scale-95 active:bg-tamam-surface-low transition">
        <div className="w-11 h-11 rounded-full bg-tamam-surface flex items-center justify-center text-tamam-green-bright">
          <span className="material-symbols-outlined text-[26px]">add</span>
        </div>
        <span className="font-bold text-sm text-tamam-text">اطلب فكرة عرض</span>
        <span className="text-xs text-center max-w-[220px]">احكيلنا شو بدك تحرّك، وTAMAM بتجهزلك فكرة ضمن حدودك.</span>
      </button>

      <OfferDetailSheet open={!!detail} offer={detail} restaurantId={rid} onClose={() => setDetail(null)} />
    </div>
  );
}

function fmtRange(a, b) {
  try {
    const s = a ? new Date(a).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const e = b ? new Date(b).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return s && e ? `${s} ← ${e}` : s || e || '';
  } catch { return ''; }
}