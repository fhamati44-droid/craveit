import { useState } from 'react';
import { ChevronDown, ChevronLeft, ShieldCheck, ShieldAlert, AlertTriangle, Clock, Users, Target, Gauge, Coins, TrendingUp, Activity, History, Lightbulb, ArrowDown } from 'lucide-react';
import { HEALTH_COLOR, COLOR_CLS, AUDIT_ACTION_AR, MECHANISM_AR, OBJECTIVE_AR, fmtWin, fmtDuration, fmtTime, money, num, pct } from '@/lib/executionLabels';

// ---------- Live block (active/paused) ----------
export function LiveBlock({ live, health, restaurant }) {
  if (!live) return null;
  const hc = COLOR_CLS[HEALTH_COLOR[health?.state] || 'gray'];
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Activity className="w-4 h-4 text-tamam-green-dark" /> الحالة اللحظية</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${hc.bg} ${hc.text}`}>{health?.label_ar}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Metric label="الطلبات" value={`${live.quota_used} / ${live.quota_total ?? '∞'}`} />
        <Metric label="الوقت المتبقي" value={fmtDuration(live.time_remaining_ms)} />
        <Metric label="حالة المطعم" value={live.restaurant_status_ar} />
        <Metric label="إنفاق تجاري" value={money(live.commercial_spend)} />
      </div>
      {live.quota_total != null && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-3">
          <div className="h-full bg-tamam-green" style={{ width: `${Math.min(100, (live.quota_used / live.quota_total) * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-2.5">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

// ---------- Why TAMAM chain ----------
export function WhyChain({ plan, decision }) {
  const steps = [
    { icon: Lightbulb, head: 'إنت قلتلنا', body: inputStory(decision) },
    { icon: TrendingUp, head: 'TAMAM شايفة', body: capacityStory(decision) },
    { icon: Users, head: 'الجمهور', body: plan?.audience_label_ar || '—' },
    { icon: Target, head: 'الخطة', body: plan?.plan_reason_ar || `${MECHANISM_AR[plan?.mechanism] || ''} لـ ${plan?.final_quota ?? ''} طلب` },
  ];
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white">
      <h3 className="text-sm font-bold text-gray-800 mb-3">ليش TAMAM قررت تعملها؟</h3>
      <div className="space-y-1">
        {steps.map((s, i) => (
          <div key={i}>
            <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-tamam-green/10 flex items-center justify-center flex-shrink-0"><s.icon className="w-4 h-4 text-tamam-green-dark" /></div>
              <div className="flex-1">
                <p className="text-[11px] text-gray-400 font-bold">{s.head}</p>
                <p className="text-sm text-gray-800">{s.body}</p>
              </div>
            </div>
            {i < steps.length - 1 && <div className="flex justify-center"><ArrowDown className="w-3 h-3 text-gray-300 my-0.5" /></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function inputStory(dd) {
  if (!dd) return '—';
  if (dd.recommended_objective === 'SURPLUS') return 'عندي كمية زيادة محتاج أفرّغها';
  if (dd.recommended_objective === 'NEW_CUSTOMERS') return 'الفترة هادية وفي قدرة لزباين جدد';
  if (dd.recommended_objective === 'REACTIVATION') return 'زباين ما رجعوا من فترة';
  if (dd.recommended_objective === 'LOYALTY_ENGAGEMENT') return 'ناس عندهم نقاط ما استخدموها';
  return 'فرصة لخلق طلب إضافي';
}
function capacityStory(dd) {
  if (!dd) return '—';
  return `هدف آمن ${dd.safe_operational_target ?? '—'}، متوقع طبيعي ${dd.projected_natural_orders ?? '—'}، قدرة إضافية آمنة ${dd.safe_additional_capacity ?? '—'}`;
}

// ---------- Plan facts ----------
export function PlanFacts({ plan, restaurant }) {
  const rows = [
    { icon: Target, label: 'شو الهدف؟', value: OBJECTIVE_AR[plan.objective] || plan.objective || '—' },
    { icon: Users, label: 'لمين؟', value: `${plan.audience_label_ar}${plan.audience_size ? ` (${plan.audience_size})` : ''}` },
    { icon: Coins, label: 'شو العرض؟', value: `${plan.customer_price ? plan.customer_price + ' ₪' : '—'}${plan.normal_reference_price ? ` (بدل ${plan.normal_reference_price} ₪)` : ''}` },
    { icon: Clock, label: 'إمتى؟', value: fmtWin(plan.start_at, plan.end_at) },
    { icon: Gauge, label: 'قديش طلب؟', value: (plan.final_quota ?? plan.planned_quota) != null ? `${plan.final_quota ?? plan.planned_quota} طلب` : '—' },
    { icon: Coins, label: 'قديش التكلفة؟', value: `TAMAM ${money(plan.tamam_contribution)} · المطعم ${money(plan.restaurant_contribution)}` },
    { icon: TrendingUp, label: 'متوقع للمطعم؟', value: `${money(plan.expected_settlement)} تسوية · ~${num(plan.expected_incremental_orders)} طلب إضافي` },
  ];
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white">
      <h3 className="text-sm font-bold text-gray-800 mb-3">تفاصيل الخطة</h3>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
            <r.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 w-28 flex-shrink-0">{r.label}</span>
            <span className="text-sm font-bold text-gray-800 flex-1 text-right">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Decision details (internal expand) ----------
export function DecisionDetails({ plan, decision }) {
  const [open, setOpen] = useState(false);
  if (!decision) return null;
  const rows = [
    ['حالة الطلب', decision.demand_state],
    ['الخط الأساسي', num(decision.baseline_orders)],
    ['الطلب المتوقع (طبيعي)', num(decision.projected_natural_orders)],
    ['الهدف التشغيلي الآمن', num(decision.safe_operational_target)],
    ['القدرة الإضافية الآمنة', num(decision.safe_additional_capacity)],
    ['الفجوة', num(decision.demand_gap)],
    ['حجم الجمهور', num(decision.audience_size)],
    ['مخاطرة الأكل الذاتي', decision.cannibalization_risk],
    ['الأمان التجاري', decision.commercial_safe ? 'آمن' : 'غير آمن'],
    ['الثقة بالبيانات', pct(decision.data_confidence_score)],
    ['درجة الفرصة', num(decision.opportunity_score)],
    ['مصدر القدرة', decision.capacity_source],
  ];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
        <span className="text-sm font-bold text-gray-800">تفاصيل القرار (داخلي)</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronLeft className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v], i) => (
            <div key={i} className="flex justify-between border-b border-gray-50 py-1">
              <span className="text-xs text-gray-500">{k}</span>
              <span className="text-xs font-bold text-gray-700">{String(v ?? '—')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Warnings (conflict / commercial / operational) ----------
export function Warnings({ plan, decision, live, conflict }) {
  const items = [];
  if (conflict || plan.conflict_flag) items.push({ type: 'conflict', title: 'في تعارض مع حملة ثانية', body: 'نفس الصنف أو الجمهور أو الوقت. ما ينفع تتفعل الاتنتين مع بعض.' });
  if (plan.commercial_safe === false || plan.status === 'APPROVAL_REQUIRED') items.push({ type: 'commercial', title: 'خارج الحدود التجارية المتفق عليها', body: `الحد الحالي مقابل القيمة المطلوبة — التسوية للمطعم ${money(plan.expected_settlement)} ومساهمة TAMAM ${money(plan.tamam_contribution)}.` });
  if (live && (live.pressure || !live.restaurant_open)) items.push({ type: 'operational', title: 'المطعم حالياً ما بتحمل طلبات زيادة', body: 'خليها موقوفة أو راجع بعدين لما يخف الضغط.' });
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((w, i) => {
        const cls = w.type === 'commercial' ? 'amber' : w.type === 'conflict' ? 'red' : 'red';
        const c = COLOR_CLS[cls];
        return (
          <div key={i} className={`rounded-2xl border ${c.border} ${c.soft} p-3 flex items-start gap-2`}>
            <AlertTriangle className={`w-4 h-4 ${c.text} flex-shrink-0 mt-0.5`} />
            <div>
              <p className={`text-sm font-bold ${c.text}`}>{w.title}</p>
              <p className="text-xs text-gray-700 mt-0.5">{w.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Audit timeline ----------
export function AuditTimeline({ audit }) {
  if (!audit || !audit.length) return null;
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><History className="w-4 h-4 text-gray-500" /> سجل التدقيق</h3>
      <div className="space-y-2">
        {audit.map((a, i) => (
          <div key={i} className="flex items-start gap-3 text-xs">
            <div className="w-2 h-2 rounded-full bg-tamam-green mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-gray-800">{AUDIT_ACTION_AR[a.action] || a.action}{a.reason ? ` — ${a.reason}` : ''}</p>
              <p className="text-gray-400">{fmtTime(a.created_date)} · {a.actor === 'system' || a.actor === 'automation' ? 'نظام' : a.actor === 'admin' ? 'مشرف' : a.actor}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Learning summary ----------
export function LearningSummary({ learning }) {
  if (!learning) return null;
  const c = COLOR_CLS[learning.result_status === 'STRONG' || learning.result_status === 'MODERATE' ? 'green' : learning.result_status === 'INTERRUPTED' || learning.result_status === 'CONFOUNDED' ? 'amber' : 'gray'];
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white">
      <h3 className="text-sm font-bold text-gray-800 mb-3">نتائج وتعلّم الحملة</h3>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.bg} ${c.text}`}>{learning.label_ar || learning.result_status}</span>
        <span className="text-xs text-gray-500">ثقة {pct(learning.confidence)}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <Metric label="متوقع إضافي" value={`~${num(learning.expected_incremental_orders)}`} />
        <Metric label="فعلي" value={num(learning.actual_orders)} />
        <Metric label="تقديري إضافي" value={`~${num(learning.estimated_incremental_orders)}`} />
        <Metric label="إيراد" value={money(learning.revenue)} />
        <Metric label="تسوية المطعم" value={money(learning.restaurant_settlement)} />
        <Metric label="مساهمة TAMAM" value={money(learning.tamam_contribution)} />
      </div>
      {learning.incidents?.length > 0 && <p className="text-xs text-amber-600 mt-3">⚠ حوادث: {learning.incidents.join('، ')}</p>}
      {learning.learning_summary && <p className="text-xs text-gray-600 mt-2">{learning.learning_summary}</p>}
    </div>
  );
}

// ---------- Blockers ----------
export function Blockers({ plan }) {
  if (!plan.kill_reason && plan.status !== 'APPROVAL_REQUIRED') return null;
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white">
      <h3 className="text-sm font-bold text-gray-800 mb-2">شو ممكن يوقف الحملة؟</h3>
      <ul className="space-y-1.5 text-xs text-gray-600">
        <li className="flex items-start gap-2"><ShieldAlert className="w-3.5 h-3.5 text-gray-400 mt-0.5" /> ضغط بالمطعم أو إقفال مؤقت</li>
        <li className="flex items-start gap-2"><ShieldAlert className="w-3.5 h-3.5 text-gray-400 mt-0.5" /> نفاد الكمية أو انتهاء الوقت</li>
        <li className="flex items-start gap-2"><ShieldAlert className="w-3.5 h-3.5 text-gray-400 mt-0.5" /> مفتاح الإيقاف الآلي الشامل</li>
        {plan.kill_reason && <li className="flex items-start gap-2 text-amber-600"><AlertTriangle className="w-3.5 h-3.5 mt-0.5" /> السبب الحالي: {plan.kill_reason}</li>}
      </ul>
    </div>
  );
}