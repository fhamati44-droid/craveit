import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getRestaurantReadiness } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import CapacityCard from '@/components/partner/CapacityCard';

const STATUS_ICON = {
  complete: { icon: 'check_circle', cls: 'text-tamam-green-bright' },
  incomplete: { icon: 'error', cls: 'text-tamam-error' },
  needs_review: { icon: 'pending', cls: 'text-tamam-gold' },
  pending_tamam: { icon: 'schedule', cls: 'text-tamam-text-muted' },
  not_required: { icon: 'remove_circle', cls: 'text-tamam-text-muted' },
};
const STATUS_LABEL = { complete: 'مكتمل', incomplete: 'ناقص', needs_review: 'يحتاج مراجعة', pending_tamam: 'بانتظار TAMAM', not_required: 'غير مطلوب' };

export default function PartnerRestaurantProfile() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    getRestaurantReadiness(rid).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid]);

  if (loading) return <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 skeleton-t rounded-2xl" />)}</div>;
  if (error) return <EmptyState icon="⚠️" title="ما قدرنا نحمّل بيانات المطعم" actionLabel="إعادة" onAction={load} />;
  if (!data) return null;

  const { completion, operational, sections } = data;
  const firstIncomplete = sections.find((s) => s.status === 'incomplete' || s.status === 'needs_review');

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-xl text-tamam-text">معلومات مطعمك</h1>
        <p className="text-tamam-text-muted text-xs">كمّل بيانات مطعمك عشان TAMAM تقدر تشغّل الطلبات والعروض بشكل صحيح.</p>
      </div>

      {/* Completion */}
      <div className="bg-tamam-surface rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-sm text-tamam-text">اكتمال البيانات</span>
          <span className="font-bold text-tamam-green-bright text-lg">{completion.percent}%</span>
        </div>
        <div className="w-full h-2.5 bg-tamam-surface-high rounded-full overflow-hidden">
          <div className="h-full bg-tamam-green-bright rounded-full transition-all" style={{ width: `${completion.percent}%` }} />
        </div>
        <p className="text-tamam-text-muted text-[11px] mt-2">{completion.complete} من {completion.total} أقسام مكتملة</p>
      </div>

      {/* Operational readiness */}
      <div className={`rounded-2xl p-4 ${operational.ready ? 'bg-tamam-green/15' : 'bg-tamam-error/10'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`material-symbols-outlined ${operational.ready ? 'text-tamam-green-bright' : 'text-tamam-error'}`}>{operational.ready ? 'verified' : 'gpp_maybe'}</span>
          <span className="font-bold text-sm text-tamam-text">جاهزية التشغيل</span>
        </div>
        {operational.ready ? (
          <p className="text-tamam-text-muted text-xs">مطعمك جاهز لاستقبال الطلبات والمشاركة في العروض.</p>
        ) : (
          <div className="flex flex-col gap-1 mt-2">
            {operational.blockers.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 text-tamam-error text-xs"><span className="material-symbols-outlined text-[14px]">block</span>{b}</div>
            ))}
          </div>
        )}
      </div>

      {/* Capacity (Milestone 2) */}
      <CapacityCard />

      {/* Sections */}
      <div className="space-y-2">
        <h3 className="font-bold text-sm text-tamam-text px-1">تفاصيل الأقسام</h3>
        <div className="bg-tamam-surface rounded-2xl overflow-hidden divide-y divide-tamam-outline/20">
          {sections.map((s) => {
            const meta = STATUS_ICON[s.status] || STATUS_ICON.incomplete;
            return (
              <button key={s.key} onClick={() => s.action && navigate(s.action)} className="w-full flex items-center gap-3 p-3.5 text-right active:scale-[0.99]">
                <span className={`material-symbols-outlined ${meta.cls} text-[22px]`}>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-tamam-text block">{s.label}</span>
                  {s.detail && <span className="text-[11px] text-tamam-text-muted block truncate">{s.detail}</span>}
                </div>
                <span className={`text-[11px] font-bold ${meta.cls}`}>{STATUS_LABEL[s.status]}</span>
                {s.action && <span className="material-symbols-outlined text-tamam-text-muted text-[18px]">chevron_left</span>}
              </button>
            );
          })}
        </div>
      </div>

      {firstIncomplete && (
        <button onClick={() => firstIncomplete.action && navigate(firstIncomplete.action)} className="w-full bg-tamam-green-bright text-tamam-ink py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95">
          كمّل البيانات الناقصة <span className="material-symbols-outlined text-[20px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>
        </button>
      )}
    </div>
  );
}