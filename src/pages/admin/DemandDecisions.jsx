import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDemandDecisions, getDemandDecision, acceptDemandDecision, dismissDemandDecision } from '@/lib/campaignApi';

const DECISION_COLOR = { NO_ACTION: 'gray', WATCH: 'blue', PREPARE: 'amber', SCHEDULE: 'indigo', ACT_NOW: 'green', NEEDS_HUMAN_REVIEW: 'orange', NEEDS_RESTAURANT_APPROVAL: 'red' };
const FILTERS = ['ALL', 'ACT_NOW', 'SCHEDULE', 'PREPARE', 'WATCH', 'NO_ACTION', 'NEEDS_HUMAN_REVIEW', 'NEEDS_RESTAURANT_APPROVAL'];
const OBJ_AR = { NEW_CUSTOMERS: 'زباين جدد', REACTIVATION: 'إعادة تفعيل', IMMEDIATE_DEMAND: 'طلب فوري', INCREASE_AOV: 'رفع السلة', LOYALTY_ENGAGEMENT: 'ولاء', CONVERSION_RECOVERY: 'استرجاع', SURPLUS: 'فائض', STRENGTHEN_ITEM: 'تقوية' };

export default function DemandDecisions() {
  const [filter, setFilter] = useState('ALL');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    listDemandDecisions(filter === 'ALL' ? null : filter).then((d) => setList(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const open = async (id) => { const d = await getDemandDecision(id); setDetail(d); };
  const accept = async (id) => { setBusy(true); try { const r = await acceptDemandDecision(id); alert(`تم إنشاء الفرصة ${r.opportunity_id}`); load(); open(id); } finally { setBusy(false); } };
  const dismiss = async (id) => { setBusy(true); try { await dismissDemandDecision(id); load(); setDetail(null); } finally { setBusy(false); } };

  return (
    <div className="min-h-screen bg-[#F5F5F5] max-w-4xl mx-auto" dir="rtl">
      <div className="bg-white px-4 pt-12 pb-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-extrabold">سجل قرارات الطلب</h1>
          <Link to="/admin/demand-decision-lab" className="text-sm font-bold text-indigo-600">المختبر ←</Link>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === f ? 'bg-blue text-white' : 'bg-gray-100 text-gray-500'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {loading && <div className="text-center text-gray-400 py-8">جاري التحميل…</div>}
        {!loading && list.length === 0 && <div className="text-center text-gray-400 py-8">ما في قرارات بعد.</div>}
        {list.map((d) => (
          <button key={d.id} onClick={() => open(d.id)} className="w-full text-right bg-white rounded-2xl p-3 border hover:shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{d.audience_segment} · {d.restaurant_id?.slice(-6) || '—'}</p>
                <p className="text-xs text-gray-500">{OBJ_AR[d.recommended_objective] || d.recommended_objective || '—'} / {d.recommended_strategy || '—'} · gap {d.demand_gap} · score {d.opportunity_score}</p>
                <p className="text-[10px] text-gray-400">{new Date(d.window_start).toLocaleString('ar', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}{d.scenario_key ? ' · ' + d.scenario_key : ''}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${CLR(DECISION_COLOR[d.decision])}`}>{d.decision}</span>
                <span className="text-[10px] text-gray-400">ثقة {Math.round((d.data_confidence_score || 0) * 100)}%</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {detail && (
        <div className="fixed inset-0 z-[100]" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute bottom-0 left-0 w-full max-w-[480px] mx-auto bg-white rounded-t-3xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 border-b">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${CLR(DECISION_COLOR[detail.decision])}`}>{detail.decision}</span>
                <button onClick={() => setDetail(null)} className="text-gray-400">✕</button>
              </div>
              <h2 className="font-bold text-base mt-2">{OBJ_AR[detail.recommended_objective] || detail.recommended_objective || '—'} / {detail.recommended_strategy || '—'}</h2>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <Section title="الوضع">
                <Row k="حالة الطلب" v={detail.demand_state} />
                <Row k="الدرجة" v={detail.opportunity_score} />
                <Row k="الثقة" v={Math.round((detail.data_confidence_score || 0) * 100) + '%'} />
                <Row k="مصدر القدرة" v={detail.capacity_source} />
              </Section>
              <Section title="ليش TAMAM انتبهت؟">
                <p className="text-gray-600">{detail.explanation_partner}</p>
              </Section>
              <Section title="الطلب والقدرة">
                <Row k="الهدف التشغيلي" v={detail.safe_operational_target} />
                <Row k="الطلب المتوقع" v={detail.projected_natural_orders} />
                <Row k="التزام الحملات" v={detail.existing_campaign_commitment} />
                <Row k="القدرة الآمنة الإضافية" v={detail.safe_additional_capacity} />
                <Row k="الفجوة" v={detail.demand_gap} />
              </Section>
              <Section title="الجمهور">
                <Row k="الشريحة" v={detail.audience_segment} />
                <Row k="الحجم" v={detail.audience_size} />
                <Row k="النية" v={detail.audience_intent_score} />
              </Section>
              <Section title="الأمان التجاري">
                <Row k="آمن؟" v={detail.commercial_safe ? 'نعم' : 'لا'} />
                <Row k="الدرجة التجارية" v={detail.commercial_safety_score} />
              </Section>
              <Section title="المخاطر">
                <Row k="Cannibalization" v={`${detail.cannibalization_risk} (${detail.cannibalization_risk_score})`} />
                <Row k="إرهاق" v={detail.campaign_fatigue_score} />
                <Row k="Blockers" v={detail.hard_blockers?.join(', ') || '—'} />
              </Section>
              <Section title="القرار">
                <Row k="الهدف" v={OBJ_AR[detail.recommended_objective] || detail.recommended_objective} />
                <Row k="الآلية" v={detail.recommended_strategy} />
                <Row k="الحصة" v={detail.recommended_quota} />
                <Row k="Explore/Exploit" v={detail.explore_exploit} />
                <Row k="تكلفة التدخل" v={detail.intervention_cost_score} />
                <Row k="طلبات متوقعة" v={`${detail.expected_incremental_orders} (تقدير)`} />
                <Row k="إيراد متوقع" v={`${detail.expected_incremental_revenue} ₪`} />
              </Section>
              <Section title="الاستراتيجيات المقترحة">
                {(() => { try { const a = JSON.parse(detail.strategy_alternatives || '[]'); if (!a.length) return <p className="text-gray-400">—</p>; return a.map((s, i) => (<div key={i} className="text-xs bg-gray-50 rounded-lg p-2"><b>{i === 0 ? '★ ' : ''}{s.mechanism}</b> · درجة {s.score} · {s.cost_label} · حصة {s.quota}</div>)); } catch { return <p className="text-gray-400">—</p>; } })()}
              </Section>
              <Section title="شو ممكن نعمل بعدين؟">
                <div className="grid grid-cols-2 gap-2">
                  {!['NO_ACTION', 'NEEDS_HUMAN_REVIEW'].includes(detail.decision) && !detail.created_opportunity_id && (
                    <button onClick={() => accept(detail.id)} disabled={busy} className="bg-green text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">إنشاء فرصة</button>
                  )}
                  {detail.created_opportunity_id && <a href={`/admin/campaigns`} className="bg-blue-50 text-blue-700 py-2.5 rounded-xl font-bold text-sm text-center">الفرصة أُنشئت</a>}
                  <button onClick={() => dismiss(detail.id)} disabled={busy} className="bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-sm">تجاهل</button>
                  {detail.commercial_safe === false && <span className="col-span-2 text-xs text-red-600 text-center py-2">يتطلب موافقة المطعم على التجاري</span>}
                </div>
              </Section>
              <details className="text-xs text-gray-400"><summary>شرح داخلي</summary><p className="mt-1 leading-relaxed">{detail.explanation_internal}</p></details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) { return <div><p className="font-bold text-xs text-gray-500 mb-1">{title}</p><div className="space-y-1">{children}</div></div>; }
function Row({ k, v }) { return <div className="flex justify-between"><span className="text-gray-500">{k}</span><span className="font-bold">{String(v ?? '—')}</span></div>; }
function CLR(c) { return { gray: 'bg-gray-200 text-gray-700', blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700', indigo: 'bg-indigo-100 text-indigo-700', green: 'bg-green-100 text-green-700', orange: 'bg-orange-100 text-orange-700', red: 'bg-red-100 text-red-700' }[c] || 'bg-gray-200 text-gray-700'; }