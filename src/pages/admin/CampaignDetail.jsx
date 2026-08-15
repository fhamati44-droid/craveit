import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getDemoStatus, seedDemoCampaigns, resetDemoCampaigns, getCampaign, setCampaignStatus } from '@/lib/campaignApi';
import { ArrowRight, Sparkles, RefreshCw, Trash2, Play, Pause } from 'lucide-react';

const OFFER_TYPE_AR = {
  STANDARD_VALUE: 'قيمة', DIRECT_PRICE: 'سعر مباشر', VALUE_ADD: 'قيمة مضافة', FIRST_TRIAL: 'تجربة أولى',
  REACTIVATION: 'إعادة تفعيل', LIMITED_TIME: 'وقت محدود', LIMITED_QUANTITY: 'كمية محدودة',
  TIME_AND_QUANTITY: 'وقت + كمية', POINT_LOCKED: 'مخبّأ بالنقاط', COUPON_LOCKED: 'كوبون', LOYALTY: 'ولاء',
  AOV_UPSELL: 'ترقية السلة', SURPLUS: 'فائض', RAW_MATERIAL_OPPORTUNITY: 'فرصة مادة خام', COMMUNITY: 'مجتمعي', CROSS_RESTAURANT: 'كروس مطاعم',
};
const OBJ_AR = {
  NEW_CUSTOMERS: 'زباين جدد', REACTIVATION: 'إعادة تفعيل', IMMEDIATE_DEMAND: 'طلب فوري', INCREASE_AOV: 'رفع السلة',
  LOYALTY_ENGAGEMENT: 'تفعيل ولاء', CONVERSION_RECOVERY: 'استرجاع تحويل', SURPLUS: 'فائض', STRENGTHEN_ITEM: 'تقوية صنف',
  TEST_RESTAURANT: 'تجربة مطعم', REPEAT_PURCHASE: 'تكرار طلب', PAYDAY_AOV: 'راتب', ACQUISITION: 'اكتساب',
};
const VARIANT_AR = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    getCampaign(id).then(setData).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const toggleStatus = async () => {
    if (!data) return;
    const next = data.campaign.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    setBusy(true);
    try { await setCampaignStatus(data.campaign.id, next); load(); } finally { setBusy(false); }
  };

  if (loading) return <div className="p-4 space-y-3"><div className="h-20 skeleton rounded-2xl" /><div className="h-40 skeleton rounded-2xl" /></div>;
  if (!data) return <div className="p-6 text-center">ما لقينا الحملة.</div>;

  const { campaign: c, offers, opportunity, why, performance: perf } = data;

  return (
    <div className="pb-8" dir="rtl">
      <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowRight size={18} /></button>
        <div className="flex-1">
          <h1 className="font-extrabold text-base">{c.campaign_name}</h1>
          <p className="text-xs text-gray-500">{OBJ_AR[c.objective] || c.objective} · {c.status}</p>
        </div>
        {c.is_demo && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">تجريبي</span>}
      </div>

      <div className="p-4 space-y-4 max-w-2xl">
        {/* WHY TAMAM */}
        <div className="bg-gradient-to-l from-blue-50 to-white rounded-2xl p-4 border border-blue-100">
          <h2 className="font-bold text-sm mb-3 flex items-center gap-1.5"><Sparkles size={15} className="text-blue" /> ليش TAMAM عملت هيك؟</h2>
          {why && (
            <div className="space-y-2 text-sm">
              <Step label="إنت قلتلنا" text={why.input} />
              <Step label="هدفك" text={why.goal} />
              <Step label="حدودك" text={why.limits} />
              <Step label="TAMAM عملت" text={why.action} highlight />
            </div>
          )}
        </div>

        {/* Schedule + audience */}
        <div className="bg-white rounded-2xl p-4 border">
          <h2 className="font-bold text-sm mb-2">الموعد والجمهور</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <Row k="من" v={fmt(c.start_at)} />
            <Row k="ل" v={fmt(c.end_at)} />
            <Row k="القنوات" v={(c.channels || []).join('، ') || '—'} />
            {opportunity && <Row k="من فرصة" v={opportunity.reason} />}
          </div>
        </div>

        {/* Offers + commercial */}
        <div className="bg-white rounded-2xl p-4 border">
          <h2 className="font-bold text-sm mb-3">العروض والتمويل التجاري</h2>
          <div className="space-y-3">
            {offers.map((o) => (
              <div key={o.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{o.offer_title}</p>
                    <p className="text-xs text-gray-500">{OFFER_TYPE_AR[o.offer_type]} · {VARIANT_AR[o.mealset_variant_id] || o.mealset_variant_id}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold text-blue">{o.customer_price} ₪</p>
                    {o.normal_reference_price > o.customer_price && <p className="text-[11px] text-gray-400 line-through">{o.normal_reference_price} ₪</p>}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <Mini label="سعر عادي" v={o.normal_reference_price + ' ₪'} />
                  <Mini label="TAMAM ساهمت" v={(o.tamam_contribution || 0) + ' ₪'} />
                  <Mini label="المطعم ساهم" v={(o.restaurant_contribution || 0) + ' ₪'} />
                  <Mini label="تسوية المطعم" v={fmtMoney(o.normal_reference_price - (o.normal_reference_price * 0.25) - (o.restaurant_contribution || 0)) + ' ₪'} />
                  <Mini label="حد الكمية" v={o.quota_total == null ? 'متاح اليوم' : `${o.quota_total} طلب`} />
                  <Mini label="فتح النقاط" v={o.unlock_type === 'point_locked' ? o.unlock_points + ' نقطة' : '—'} />
                </div>
                {o.audience_rule && o.audience_rule.length > 0 && (
                  <p className="text-[11px] text-gray-500 mt-2">الجمهور: {o.audience_rule.join('، ')}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-gray-400">عمولة TAMAM 25% من السعر العادي. مساهمة TAMAM حتى 7 نقاط مئوية. المطعم يوافق ضمن الحدود المتفق عليها ✓</div>
        </div>

        {/* Performance */}
        <div className="bg-white rounded-2xl p-4 border">
          <h2 className="font-bold text-sm mb-2">الأداء (Learning)</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat v={perf.impressions} l="مشاهدة" />
            <Stat v={perf.offer_opens} l="فتح" />
            <Stat v={perf.unlocks} l="فتح نقاط" />
            <Stat v={perf.add_to_cart} l="سلة" />
            <Stat v={perf.purchases} l="طلبات" />
            <Stat v={perf.revenue + ' ₪'} l="إيراد" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={toggleStatus} disabled={busy} className="flex-1 h-11 rounded-xl bg-blue text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
            {c.status === 'PAUSED' ? <><Play size={15} /> تفعيل</> : <><Pause size={15} /> إيقاف مؤقت</>}
          </button>
          <button onClick={async () => { if (confirm('حذف كل بيانات الحملات التجريبية؟')) { await resetDemoCampaigns(); navigate('/admin/campaigns'); } }} className="h-11 px-4 rounded-xl bg-red-50 text-red-600 font-bold text-sm flex items-center gap-1.5"><Trash2 size={15} /> تصفير تجريبي</button>
        </div>
      </div>
    </div>
  );
}

function Step({ label, text, highlight }) {
  return (
    <div className={`rounded-xl p-2 ${highlight ? 'bg-blue text-white' : 'bg-gray-50'}`}>
      <p className={`text-[11px] font-bold ${highlight ? 'text-white/80' : 'text-gray-400'}`}>{label}</p>
      <p className="text-sm font-bold">{text}</p>
    </div>
  );
}
function Row({ k, v }) { return <div className="flex justify-between"><span className="text-gray-400">{k}</span><span className="font-medium">{v}</span></div>; }
function Mini({ label, v }) { return <div className="bg-gray-50 rounded-lg p-1.5"><p className="text-gray-400">{label}</p><p className="font-bold">{v}</p></div>; }
function Stat({ v, l }) { return <div className="bg-gray-50 rounded-xl p-2"><p className="font-extrabold text-blue">{v}</p><p className="text-[11px] text-gray-500">{l}</p></div>; }
function fmt(iso) { try { return new Date(iso).toLocaleString('ar', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } }
function fmtMoney(n) { return Math.round(n * 100) / 100; }