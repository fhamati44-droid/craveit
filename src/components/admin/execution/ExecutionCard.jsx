import { Link } from 'react-router-dom';
import { Clock, Users, Target, Gauge, ShieldCheck, ShieldAlert, Zap, TrendingUp, CheckCircle2, Pause, Play, AlertTriangle } from 'lucide-react';
import { STATUS_COLOR, HEALTH_COLOR, COLOR_CLS, MECHANISM_AR, fmtWin, fmtDuration, money, num, pct } from '@/lib/executionLabels';

function SafetyChip({ ok, label }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
      {ok ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
      {label}
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
      <Icon className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-gray-400">{label}:</span>
      <span className="font-bold text-gray-700 truncate">{value}</span>
    </div>
  );
}

export default function ExecutionCard({ plan }) {
  const sc = STATUS_COLOR[plan.status] || 'gray';
  const c = COLOR_CLS[sc];
  const healthColor = HEALTH_COLOR[plan.monitor_state] || 'gray';
  const hc = COLOR_CLS[healthColor];
  const commercialOk = plan.commercial_safe !== false;
  const operationalOk = plan.live ? !plan.live.pressure && plan.live.restaurant_open : true;
  const isLive = plan.status === 'EXECUTED' && plan.live;
  const isCompleted = plan.status === 'COMPLETED';
  const quota = plan.final_quota ?? plan.planned_quota;

  return (
    <Link to={`/admin/demand-execution/${plan.id}`} dir="rtl"
      className="block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
      {/* status ribbon */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${c.soft} border-b ${c.border}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
          <span className={`text-xs font-bold ${c.text}`}>{plan.status_ar}</span>
          {plan.is_demo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">تجريبي</span>}
        </div>
        <span className="text-[11px] text-gray-500">{plan.execution_mode === 'AUTO_WITHIN_GUARDRAILS' ? 'تلقائي ضمن الحدود' : 'يدوي'}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* identity */}
        <div>
          <p className="text-sm font-bold text-gray-900">{plan.restaurant_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{plan.product_label} · {plan.objective_ar}</p>
        </div>

        {/* meta grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <MetaItem icon={Clock} label="الوقت" value={fmtWin(plan.start_at, plan.end_at)} />
          <MetaItem icon={Users} label="الجمهور" value={`${plan.audience_label_ar}`} />
          <MetaItem icon={Target} label="الاستراتيجية" value={MECHANISM_AR[plan.mechanism] || '—'} />
          <MetaItem icon={Gauge} label="الكمية" value={quota != null ? `${quota} طلب` : '—'} />
        </div>

        {/* live block for active campaigns */}
        {isLive && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">{plan.live.quota_used} / {plan.live.quota_total ?? '∞'} طلب</span>
              <span className="text-[11px] text-gray-500">باقي: {fmtDuration(plan.live.time_remaining_ms)}</span>
            </div>
            {plan.live.quota_total != null && (
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-tamam-green" style={{ width: `${Math.min(100, (plan.live.quota_used / plan.live.quota_total) * 100)}%` }} />
              </div>
            )}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">حالة المطعم: <b className="text-gray-700">{plan.live.restaurant_status_ar}</b></span>
              <span className={`flex items-center gap-1 font-bold ${hc.text}`}>
                <span className={`w-2 h-2 rounded-full ${hc.dot}`} />{plan.health.label_ar}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>إنفاق تجاري: <b className="text-gray-700">{money(plan.live.commercial_spend)}</b></span>
              <span>باقي: <b className="text-gray-700">{plan.live.quota_remaining ?? '∞'}</b></span>
            </div>
          </div>
        )}

        {/* learning block for completed */}
        {isCompleted && plan.learning && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${COLOR_CLS[HEALTH_COLOR[plan.monitor_state] || 'gray'].text}`}>{plan.learning.label_ar}</span>
              <span className="text-[11px] text-gray-500">الفعلي {plan.learning.actual_orders} · تقديري +{plan.learning.estimated_incremental_orders}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>إيراد <b className="text-gray-700">{money(plan.learning.revenue)}</b></span>
              <span>تسوية المطعم <b className="text-gray-700">{money(plan.learning.restaurant_settlement)}</b></span>
              <span>مساهمة TAMAM <b className="text-gray-700">{money(plan.learning.tamam_contribution)}</b></span>
            </div>
            {plan.learning.incidents?.length > 0 && <p className="text-[11px] text-amber-600">⚠ {plan.learning.incidents.join('، ')}</p>}
          </div>
        )}

        {/* safety chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <SafetyChip ok={commercialOk} label={commercialOk ? 'ضمن الحدود التجارية' : 'خارج الحدود التجارية'} />
          <SafetyChip ok={operationalOk} label={operationalOk ? 'القدرة التشغيلية مناسبة' : 'ضغط تشغيلي'} />
          {plan.conflict_flag && <SafetyChip ok={false} label="تعارض مع حملة ثانية" />}
        </div>

        {/* scores line */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> ثقة {pct(plan.data_confidence_score)}</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> درجة {num(plan.opportunity_score)}</span>
          </div>
          {plan.status === 'PAUSED' && <span className="flex items-center gap-1 text-[11px] text-amber-600 font-bold"><Pause className="w-3 h-3" /> راجع واستأنف</span>}
          {plan.status === 'READY' && <span className="flex items-center gap-1 text-[11px] text-green-600 font-bold"><Play className="w-3 h-3" /> جاهزة للتنفيذ</span>}
          {plan.status === 'APPROVAL_REQUIRED' && <span className="flex items-center gap-1 text-[11px] text-amber-600 font-bold"><AlertTriangle className="w-3 h-3" /> بانتظار موافقة</span>}
          {plan.status === 'COMPLETED' && <span className="flex items-center gap-1 text-[11px] text-gray-500 font-bold"><CheckCircle2 className="w-3 h-3" /> منتهية</span>}
        </div>
      </div>
    </Link>
  );
}