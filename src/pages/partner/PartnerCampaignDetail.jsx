import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getPartnerCampaignDetail } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import { STATUS_AR, fmtRange } from '@/lib/partnerDemoLabels';

export default function PartnerCampaignDetail() {
  const { campaignId } = useParams();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!rid || !campaignId) return;
    setLoading(true);
    getPartnerCampaignDetail(rid, campaignId).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, [rid, campaignId]);

  if (loading) return <div className="p-4 space-y-3"><div className="h-40 skeleton-t rounded-2xl" /></div>;
  if (error || !data) return <EmptyState icon="⚠️" title="ما قدرنا نحمّل العرض" />;

  const { offer, commercial, why, item } = data;
  const isValueAdd = offer.type === 'VALUE_ADD' || (offer.normal_price <= offer.customer_price);
  const isPoints = offer.unlock_type === 'point_locked';

  return (
    <div className="px-4 py-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-tamam-surface flex items-center justify-center">
          <span className="material-symbols-outlined text-tamam-text text-[20px]">arrow_forward</span>
        </button>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-b from-tamam-green/12 to-tamam-surface border border-tamam-green/30 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-lg text-tamam-text">{offer.title}</h1>
          <span className="bg-tamam-green text-tamam-ink text-[10px] font-bold px-2 py-0.5 rounded-full">{STATUS_AR[offer.status] || offer.status}</span>
        </div>
        {offer.objective_label && <p className="text-tamam-green-bright text-sm font-semibold">{offer.objective_label}</p>}
        {offer.start_at && (
          <div className="flex items-center gap-2 text-tamam-text-muted text-xs">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>{fmtRange(offer.start_at, offer.end_at)}</span>
          </div>
        )}
        {item?.image && <img src={item.image} alt="" className="w-full h-40 object-cover rounded-xl" />}
      </section>

      {/* Audience */}
      {offer.audience?.length > 0 && (
        <Section title="الجمهور">
          {offer.audience.map((a, i) => <p key={i} className="text-tamam-text text-sm leading-snug">• {a}</p>)}
        </Section>
      )}

      {/* Commercial breakdown */}
      <Section title={isValueAdd ? 'السعر' : 'السعر'}>
        <div className="space-y-2">
          <Row label="السعر العادي للمجموعة" value={`${offer.normal_price} ₪`} />
          <Row label="سعر العرض" value={`${offer.customer_price} ₪`} highlight />
          {commercial.discount > 0 && <Row label="الفرق" value={`${commercial.discount} ₪`} />}
          {commercial.tamam_contribution > 0 && <Row label="TAMAM ساهمت" value={`${commercial.tamam_contribution} ₪`} />}
          {commercial.restaurant_contribution > 0 && <Row label="المطعم ساهم" value={`${commercial.restaurant_contribution} ₪`} />}
          <div className="h-px bg-tamam-outline/30 my-1" />
          <Row label="إنت رح يوصلك" value={`${commercial.restaurant_settlement} ₪`} highlight />
        </div>
        <p className="text-tamam-text-muted text-[11px] mt-2">ما في عمولة مخفية. السعر واضح من أول.</p>
      </Section>

      {/* Value Add explanation */}
      {isValueAdd && (
        <div className="bg-tamam-green/10 border border-tamam-green/30 rounded-2xl p-4 flex items-start gap-2">
          <span className="material-symbols-outlined text-tamam-green-bright text-[20px]">card_giftcard</span>
          <p className="text-tamam-text-muted text-xs leading-snug">TAMAM بتقدر تزيد قيمة العرض بدون ما تحرق سعر الوجبة الأساسية.</p>
        </div>
      )}

      {/* Points offer explanation */}
      {isPoints && (
        <Section title="طريقة الفتح">
          <Row label="نقاط TAMAM" value={`${offer.unlock_points} نقطة`} highlight />
          <p className="text-tamam-text-muted text-[11px] mt-2 leading-snug">TAMAM بتحدد مين مؤهل للعرض وبتدير النقاط من عندها. إنت بس جهّز الطلب.</p>
        </Section>
      )}

      {/* Quota / limits */}
      {offer.quota_total != null && (
        <Section title="الحد">
          <Row label="إجمالي الكمية" value={`${offer.quota_total} طلب`} />
          <Row label="طلبوا" value={`${offer.quota_used}`} />
          <Row label="باقي" value={`${offer.quota_remaining}`} highlight />
          <p className="text-tamam-text-muted text-[11px] mt-2">العرض بوقف لما يوصل {offer.quota_total} طلب أو الساعة تصير {offer.end_at ? new Date(offer.end_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : ''}. أيهم أول.</p>
        </Section>
      )}

      {/* Why TAMAM chose this */}
      {why && (
        <Section title="ليش TAMAM اختارت هالفكرة؟">
          <div className="space-y-1.5">
            {why.input && <WhyRow label="إنت قلتلنا" value={why.input} />}
            {why.goal && <WhyRow label="هدفك" value={why.goal} />}
            {why.limits && <WhyRow label="حدودك" value={why.limits} />}
            {why.action && <WhyRow label="TAMAM عملت" value={why.action} />}
          </div>
        </Section>
      )}

      <div className="flex items-center gap-1.5 text-tamam-green-bright text-xs font-semibold">
        <span className="material-symbols-outlined text-[16px]">check_circle</span>
        <span>ضمن الحدود المتفق عليها ✓</span>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-tamam-surface rounded-2xl p-4 space-y-2 border border-tamam-outline/30">
      <h3 className="font-bold text-sm text-tamam-text">{title}</h3>
      {children}
    </section>
  );
}
function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-tamam-text-muted text-xs">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-tamam-green-bright' : 'text-tamam-text'}`}>{value}</span>
    </div>
  );
}
function WhyRow({ label, value }) {
  return (
    <div>
      <span className="text-tamam-text-muted text-[11px] font-bold">{label}</span>
      <p className="text-tamam-text text-sm leading-snug">{value}</p>
    </div>
  );
}