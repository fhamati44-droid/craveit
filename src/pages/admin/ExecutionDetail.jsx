import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { getPlanDetail } from '@/lib/demandExecutionApi';
import { STATUS_AR, STATUS_COLOR, HEALTH_COLOR, COLOR_CLS, OBJECTIVE_AR, MECHANISM_AR, AUDIENCE_AR, LEARNING_AR } from '@/lib/executionLabels';
import { LiveBlock, WhyChain, PlanFacts, DecisionDetails, Warnings, Blockers, AuditTimeline, LearningSummary } from '@/components/admin/execution/DetailSections';
import { ApproveActions, PauseAction, ResumeAction, StopAction } from '@/components/admin/execution/ActionDialogs';

export default function ExecutionDetail() {
  const { planId } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setDetail(await getPlanDetail(planId)); } catch (e) { setError(e.message); }
    setLoading(false);
  }, [planId]);

  useEffect(() => { load(); }, [load]);

  if (loading && !detail) return <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl"><Loader2 className="w-6 h-6 animate-spin text-tamam-green" /></div>;
  if (error && !detail) return <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl"><div className="text-center"><p className="text-red-600 font-bold">ما قدرنا نحمّل الخطة</p><p className="text-xs text-gray-500 mt-1">{error}</p><button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-tamam-green text-tamam-ink text-sm font-bold">حاول مرة ثانية</button></div></div>;
  if (!detail) return null;

  const p = detail.plan;
  const view = {
    ...p,
    status_ar: STATUS_AR[p.status] || p.status,
    objective_ar: OBJECTIVE_AR[p.objective] || p.objective || '—',
    mechanism_ar: MECHANISM_AR[p.mechanism] || p.mechanism || '—',
    audience_label_ar: AUDIENCE_AR[p.audience_segment] || p.audience_segment || '—',
    monitor_state: detail.health?.state || p.monitor_state,
    health: detail.health,
    live: detail.live,
    conflict_flag: !!detail.conflict,
    commercial_safe: detail.demand_decision?.commercial_safe,
    learning: detail.learning ? { ...detail.learning, label_ar: LEARNING_AR[detail.learning.result_status] } : null,
  };
  const sc = STATUS_COLOR[p.status] || 'gray';
  const c = COLOR_CLS[sc];

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1100px] mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <Link to="/admin/demand-execution" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronRight className="w-4 h-4" /> مركز التنفيذ
          </Link>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>{view.status_ar}</span>
            {view.is_demo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">تجريبي</span>}
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-5 py-5 space-y-4">
        {/* title */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-base font-bold text-gray-900">{detail.restaurant?.name || '—'}</p>
          <p className="text-sm text-gray-500 mt-0.5">{detail.item?.name || view.product_label} · {view.objective_ar}</p>
          <p className="text-xs text-gray-400 mt-1">{view.plan_reason_ar}</p>
        </div>

        {/* live */}
        {view.live && <LiveBlock live={view.live} health={view.health} restaurant={detail.restaurant} />}

        {/* warnings */}
        <Warnings plan={view} decision={detail.demand_decision} live={view.live} conflict={detail.conflict} />

        {/* why + facts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WhyChain plan={view} decision={detail.demand_decision} />
          <PlanFacts plan={view} restaurant={detail.restaurant} />
        </div>

        {/* decision details + blockers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DecisionDetails plan={view} decision={detail.demand_decision} />
          <Blockers plan={view} />
        </div>

        {/* actions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">إجراءات</h3>
          {loading && <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> بنحدّث…</p>}
          {(p.status === 'READY' || p.status === 'APPROVAL_REQUIRED') && <ApproveActions plan={p} onDone={load} />}
          {p.status === 'EXECUTED' && <div className="flex items-center gap-2 flex-wrap"><PauseAction plan={p} onDone={load} /><StopAction plan={p} onDone={load} /></div>}
          {p.status === 'PAUSED' && <div className="flex items-center gap-2 flex-wrap"><ResumeAction plan={p} onDone={load} /><StopAction plan={p} onDone={load} /></div>}
          {p.status === 'SCHEDULED' && <div className="flex items-center gap-2 flex-wrap"><ApproveActions plan={p} onDone={load} /><StopAction plan={p} onDone={load} /></div>}
          {(p.status === 'COMPLETED' || p.status === 'CANCELLED' || p.status === 'REJECTED') && <p className="text-xs text-gray-400">الخطة ب حالة نهائية — ما في إجراءات. سجل التدقيق محفوظ.</p>}
        </div>

        {/* learning + audit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {view.learning && <LearningSummary learning={view.learning} />}
          <AuditTimeline audit={detail.audit} />
        </div>
      </div>
    </div>
  );
}