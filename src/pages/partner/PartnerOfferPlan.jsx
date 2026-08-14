import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listMonthlyPlan } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';

const OBJECTIVE_LABEL = {
  increase_new_customers: 'زيادة زباين جدد',
  strengthen_quiet_hour: 'تقوية ساعة هادية',
  strengthen_item: 'تحريك وجبة محددة',
  use_surplus: 'الاستفادة من كمية فائضة',
  increase_pickup: 'زيادة طلبات الاستلام',
  reactivate_customers: 'إعادة تنشيط زباين سابقين',
};

const WEEK_STATUS = {
  tamam_draft: { label: 'مسودة عند TAMAM', cls: 'bg-tamam-surface-high text-tamam-text-muted' },
  under_review: { label: 'قيد المراجعة', cls: 'bg-tamam-gold-dark/30 text-tamam-gold' },
  needs_restaurant_info: { label: 'يحتاج معلومات من المطعم', cls: 'bg-tamam-gold-dark/30 text-tamam-gold' },
  needs_restaurant_approval: { label: 'يحتاج موافقة المطعم', cls: 'bg-tamam-green/20 text-tamam-green-bright' },
  approved: { label: 'معتمد', cls: 'bg-tamam-green/20 text-tamam-green-bright' },
  scheduled: { label: 'مجدول', cls: 'bg-tamam-green-bright text-tamam-ink' },
  completed: { label: 'مكتمل', cls: 'bg-tamam-surface-high text-tamam-text-muted' },
};

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function PartnerOfferPlan() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const now = new Date();
  const [plan, setPlan] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    listMonthlyPlan(rid, now.getFullYear(), now.getMonth() + 1)
      .then((r) => { setPlan(r.plan); setWeeks(r.weeks || []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, [rid]);

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-xl text-tamam-text">خطة الشهر</h1>
        <p className="text-tamam-text-muted text-xs">نظرة على خطة TAMAM لمطعمك خلال {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}.</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton-t rounded-2xl" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title="ما قدرنا نحمّل الخطة" actionLabel="إعادة" onAction={load} />
      ) : !plan ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="material-symbols-outlined text-[40px] text-tamam-text-muted opacity-50">calendar_view_month</span>
          <p className="text-tamam-text-muted text-sm max-w-[240px]">ما في خطة شهرية لهل الشهر بعد. TAMAM بتجهز خطة العروض والاستراتيجية قريبًا.</p>
          <button onClick={() => navigate('/partner/offers/request')} className="bg-tamam-green-bright text-tamam-ink text-xs font-bold px-4 py-2 rounded-full active:scale-95">اطلب فكرة عرض</button>
        </div>
      ) : (
        <div className="space-y-3">
          {plan.strategic_summary && (
            <div className="bg-tamam-surface rounded-2xl p-4">
              <h3 className="font-bold text-sm text-tamam-text mb-1">نظرة عامة على الشهر</h3>
              <p className="text-tamam-text-muted text-xs leading-relaxed">{plan.strategic_summary}</p>
            </div>
          )}
          {weeks.map((w, i) => {
            const st = WEEK_STATUS[w.status] || WEEK_STATUS.tamam_draft;
            return (
              <div key={w.id || i} className="bg-tamam-surface rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-tamam-green/15 flex items-center justify-center"><span className="material-symbols-outlined text-tamam-green-bright">trending_up</span></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-tamam-text">الأسبوع {w.week_number}</span>
                      <span className="text-tamam-text-muted text-[11px]">{fmtDateRange(w.starts_at, w.ends_at)}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                </div>
                {w.strategic_objective && (
                  <div className="bg-tamam-surface-low rounded-xl px-3 py-2">
                    <span className="text-tamam-text-muted text-[10px]">الهدف الاستراتيجي</span>
                    <p className="text-tamam-text text-xs font-semibold">{OBJECTIVE_LABEL[w.strategic_objective] || w.strategic_objective}</p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-tamam-text-muted text-[11px]">{(w.linked_offer_ids || []).length} عرض</span>
                  <button onClick={() => navigate('/partner/offers/calendar')} className="text-tamam-green-bright text-xs font-bold flex items-center gap-1">راجع الأسبوع <span className="material-symbols-outlined text-[16px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmtDateRange(a, b) {
  try {
    const f = (d) => d ? new Date(d).toLocaleDateString('ar', { day: 'numeric', month: 'numeric' }) : '';
    const s = f(a), e = f(b);
    return s && e ? `${s} - ${e}` : s;
  } catch { return ''; }
}