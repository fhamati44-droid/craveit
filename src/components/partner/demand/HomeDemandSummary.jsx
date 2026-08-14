import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDemandSummary } from '@/lib/partnerApi';
import { usePartner } from '@/lib/partnerContext';
import { LEVELS, DAY_NAMES, levelMeta } from './demandMeta';
import QuickDailyUpdateSheet from './QuickDailyUpdateSheet';

function SegmentedBar({ counts }) {
  const total = (counts.quiet || 0) + (counts.medium || 0) + (counts.busy || 0);
  if (!total) return <div className="h-2 rounded-full bg-tamam-surface-high" />;
  const w = (n) => `${(n / total) * 100}%`;
  return (
    <div className="h-2 rounded-full overflow-hidden flex bg-tamam-surface-high">
      <div className="bg-tamam-green-bright" style={{ width: w(counts.quiet || 0) }} />
      <div className="bg-tamam-gold" style={{ width: w(counts.medium || 0) }} />
      <div className="bg-tamam-error" style={{ width: w(counts.busy || 0) }} />
    </div>
  );
}

function fmtUpdated(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso); const now = new Date();
    const diff = (now - d) / 60000;
    if (diff < 1) return 'قبل لحظة';
    if (diff < 60) return `قبل ${Math.floor(diff)} دقيقة`;
    if (diff < 1440) return `قبل ${Math.floor(diff / 60)} ساعة`;
    return d.toLocaleDateString('ar');
  } catch { return ''; }
}

/** Home summary card for the weekly demand planner. */
export default function HomeDemandSummary() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [quick, setQuick] = useState(false);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    getDemandSummary(rid, null)
      .then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid]);

  if (loading) return <div className="mx-4 h-28 skeleton-t rounded-2xl" />;
  if (error) return (
    <section className="px-4">
      <div className="bg-tamam-surface rounded-2xl p-4 text-center">
        <p className="text-tamam-text-muted text-sm mb-2">ما قدرنا نحمّل بيانات الحركة.</p>
        <button onClick={load} className="h-10 px-4 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-xs">حاول مرة ثانية</button>
      </div>
    </section>
  );

  const hasData = data?.has_data;
  const next = data?.next_quiet;
  const week = data?.week || [];

  return (
    <section className="px-4" dir="rtl">
      <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="material-symbols-outlined text-tamam-green-bright text-[20px]">schedule</span>
          <h2 className="font-bold text-base text-tamam-text">متى مطعمك هادئ؟</h2>
        </div>
        <p className="text-[12px] text-tamam-text-muted leading-snug mb-3">حدد الساعات الهادئة والضغط، عشان تمام تقترح عليك الحملات بالوقت الصح.</p>

        {!hasData ? (
          <div className="bg-tamam-surface-low rounded-xl p-4 text-center">
            <span className="material-symbols-outlined text-[30px] text-tamam-text-muted opacity-60">event_available</span>
            <p className="text-tamam-text text-sm font-bold mt-1">خلّينا نعرف حركة مطعمك</p>
            <p className="text-tamam-text-muted text-[11px] leading-snug mt-1 mb-3">حدد الهادئ والمتوسط والضغط. بتاخد أقل من دقيقتين، وبتساعد تمام يقترح عليك فرص أدق.</p>
            <button onClick={() => navigate('/partner/demand-schedule')} className="h-12 px-5 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform">ابدأ تحديد الساعات</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-tamam-surface-low rounded-xl p-3">
                <p className="text-[10px] text-tamam-text-muted mb-1">أقرب وقت هادئ</p>
                {next ? <p className="text-[13px] font-bold text-tamam-green-bright leading-tight">{next.when_label}، {next.start}–{next.end}</p> : <p className="text-[12px] text-tamam-text-muted">ما في هادئ محدد</p>}
              </div>
              <div className="bg-tamam-surface-low rounded-xl p-3">
                <p className="text-[10px] text-tamam-text-muted mb-1">أضعف يوم</p>
                <p className="text-[13px] font-bold text-tamam-text leading-tight">{data.weakest_day_name || '—'}</p>
                <p className="text-[10px] text-tamam-text-muted">{data.quiet_hours_this_week || 0} ساعة هادئة بالأسبوع</p>
              </div>
            </div>

            <div className="space-y-1.5 mb-3">
              {week.map((w) => (
                <button key={w.day} onClick={() => navigate('/partner/demand-schedule', { state: { day: w.day } })}
                  className="w-full flex items-center gap-2 text-right active:opacity-80">
                  <span className="w-14 text-[11px] font-bold text-tamam-text shrink-0">{DAY_NAMES[w.day]}</span>
                  <div className="flex-1"><SegmentedBar counts={w.counts} /></div>
                  <span className="text-[9px] text-tamam-text-muted shrink-0 w-20 text-left">{w.counts.quiet}ه · {w.counts.medium}م · {w.counts.busy}ض</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-3 text-[10px] text-tamam-text-muted">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tamam-green-bright" />هادئ</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tamam-gold" />متوسط</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tamam-error" />ضغط</span>
              <span className="mr-auto">{fmtUpdated(data.last_updated)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => navigate('/partner/demand-schedule')} className="flex-1 h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform">رتّب ساعات الأسبوع</button>
              <button onClick={() => setQuick(true)} className="h-12 px-4 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm active:scale-95 transition-transform">حدّث اليوم بسرعة</button>
            </div>
          </>
        )}
      </div>
      <QuickDailyUpdateSheet open={quick} restaurantId={rid} branchId={null} onClose={() => setQuick(false)} onSubmitted={load} />
    </section>
  );
}