import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { partnerListActiveCampaigns } from '@/lib/campaignApi';

const OBJ_AR = { NEW_CUSTOMERS: 'زباين جدد', REACTIVATION: 'إعادة تفعيل', IMMEDIATE_DEMAND: 'طلب فوري', INCREASE_AOV: 'رفع السلة', LOYALTY_ENGAGEMENT: 'ولاء', CONVERSION_RECOVERY: 'استرجاع', SURPLUS: 'فائض', STRENGTHEN_ITEM: 'تقوية', TEST_RESTAURANT: 'تجربة', REPEAT_PURCHASE: 'تكرار', PAYDAY_AOV: 'راتب', ACQUISITION: 'اكتساب' };
const VARIANT_AR = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };

/** Restaurant partner view: "TAMAM شغالة إسا" — active campaigns TAMAM is running,
 *  with audience shown in human language (no targeting choices for the owner). */
export default function PartnerCampaigns() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rid) return;
    partnerListActiveCampaigns(rid).then(setList).finally(() => setLoading(false));
  }, [rid]);

  if (loading) return <div className="p-4 space-y-2"><div className="h-20 skeleton-t rounded-2xl" /><div className="h-20 skeleton-t rounded-2xl" /></div>;

  return (
    <div className="pb-6" dir="rtl">
      <div className="sticky top-0 z-20 bg-tamam-bg/95 backdrop-blur-xl border-b border-tamam-outline/20 px-3 py-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-tamam-surface"><span className="material-symbols-outlined text-tamam-text text-[22px]">arrow_forward</span></button>
        <div className="flex-1"><h1 className="font-bold text-sm text-tamam-text">TAMAM شغالة إسا</h1><p className="text-[10px] text-tamam-text-muted">{activeRestaurant?.name_ar || ''}</p></div>
      </div>
      <div className="px-4 pt-4 space-y-3">
        <p className="text-xs text-tamam-text-muted">هذه الحملات تشتغل ضمن حدودك التجارية المتفق عليها. TAMAM بتختار الجمهور والتوقيت.</p>
        {(list || []).length === 0 && <div className="text-center py-10 text-tamam-text-muted text-sm">ما في حملات نشطة هلق.</div>}
        {(list || []).map((c) => (
          <div key={c.id} className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm text-tamam-text">{c.name}</p>
              <span className="text-[10px] bg-tamam-green/15 text-tamam-green-bright px-2 py-0.5 rounded-full font-bold">{c.is_upcoming ? 'قادمة' : 'نشطة'}</span>
            </div>
            <p className="text-[11px] text-tamam-text-muted mt-0.5">الهدف: {OBJ_AR[c.objective]} · {fmt(c.start)} – {fmt(c.end)}</p>
            <div className="mt-2 space-y-1.5">
              {c.offers.map((o) => (
                <div key={o.id} className="bg-tamam-surface-low rounded-xl p-2.5">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-bold text-tamam-text">{o.title}</p><p className="text-[10px] text-tamam-text-muted">{VARIANT_AR[o.variant] || o.variant} · {o.audience_ar.join('، ') || 'الجميع'}</p></div>
                    <div className="text-left"><p className="font-extrabold text-tamam-green-bright text-sm">{o.price} ₪</p>{o.normal > o.price && <p className="text-[10px] text-tamam-text-muted line-through">{o.normal} ₪</p>}</div>
                  </div>
                  <p className="text-[10px] text-tamam-text-muted mt-1">الحد: {o.quota_total == null ? 'متاح اليوم' : `${o.quota_total} طلب`}{o.unlock ? ` · فتح ${o.unlock} نقطة` : ''}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-tamam-green-bright mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> ضمن الحدود المتفق عليها ✓</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(iso) { try { return new Date(iso).toLocaleString('ar', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }