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

  const open = async (o) => {
    try { const d = await getPartnerOffer(rid, o.id); setDetail(d); } catch { setDetail({ offer: o }); }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-lg">العروض</h1>
        <button onClick={() => navigate('/partner/offers/request')} className="bg-tamam-green text-tamam-ink text-xs font-bold px-3 py-2 rounded-xl active:scale-95">اطلب فكرة عرض</button>
      </div>
      <p className="text-[11px] text-tamam-text-muted -mt-1">العروض بينشئها فريق TAMAM ضمن حدودك التجارية. تقدر توقف مؤقت أو تبلّغ عن خلص.</p>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${tab === t.key ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface text-tamam-text-muted border border-tamam-outline/30'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-24 skeleton-t rounded-2xl" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title="ما قدرنا نحمّل العروض" actionLabel="إعادة" onAction={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏷️" title="ما في عروض بهاد القسم" />
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <button key={o.id} onClick={() => open(o)} className="w-full text-right bg-tamam-surface border border-tamam-outline/30 rounded-2xl overflow-hidden active:scale-[0.99]">
              <div className="h-28 bg-tamam-surface-high">{o.hero_image ? <img src={o.hero_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🏷️</div>}</div>
              <div className="p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm truncate">{o.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === 'active' ? 'bg-tamam-green/20 text-tamam-green-bright' : 'bg-surface-container-high text-on-surface-variant'}`}>{STATUS_LABEL[o.status] || o.status}</span>
                </div>
                {o.start_at && o.end_at && <p className="text-[11px] text-tamam-text-muted">{fmt(o.start_at)} ← {fmt(o.end_at)}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <OfferDetailSheet open={!!detail} offer={detail} restaurantId={rid} onClose={() => setDetail(null)} />
    </div>
  );
}

function fmt(iso) { try { return new Date(iso).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } }