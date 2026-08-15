import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDecisionScenarios, evaluateDecision, runDecisionScenarios } from '@/lib/campaignApi';
import { listRestaurants } from '@/lib/api';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const TL = { GREEN: { bg: 'bg-green-100', text: 'text-green-700', label: 'أخضر' }, YELLOW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'أصفر' }, RED: { bg: 'bg-red-100', text: 'text-red-700', label: 'أحمر' }, BLOCKED: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'مقفل' } };
const DECISION_COLOR = { NO_ACTION: 'gray', WATCH: 'blue', PREPARE: 'amber', SCHEDULE: 'indigo', ACT_NOW: 'green', NEEDS_HUMAN_REVIEW: 'orange', NEEDS_RESTAURANT_APPROVAL: 'red' };
const SOURCE_LABEL = { ACTUAL: 'فعلي', INFERRED: 'مستنتج', PARTNER_PROVIDED: 'من المطعم', HEURISTIC: 'تقديري', DEMO_OVERRIDE: 'تجاوز تجريبي' };
const SOURCE_COLOR = { ACTUAL: 'green', INFERRED: 'blue', PARTNER_PROVIDED: 'indigo', HEURISTIC: 'amber', DEMO_OVERRIDE: 'orange' };

export default function DemandDecisionLab() {
  const [mode, setMode] = useState('scenario'); // scenario | custom | real
  const [scenarios, setScenarios] = useState([]);
  const [scenarioKey, setScenarioKey] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ci, setCi] = useState({
    traffic_light: 'GREEN', restaurant_status: 'open', pressure_active: false, product_priority: 'STRENGTHEN',
    product_available: true, mapping_valid: true, safe_operational_target: 20, baseline_orders: 7,
    projected_natural_orders: 5, existing_campaign_commitment: 0, audience_segment: 'NEW_TO_RESTAURANT',
    audience_size: 100, audience_intent_score: 0.8, cannibalization_score: 0.1, fatigue_score: 0.1,
    operational_risk: 0.1, campaign_saturation: 0, commercial_safe: true, commercial_score: 0.9,
    approval_required: false, restaurant_priority_score: 1, urgency_score: 0.5, data_confidence: 0.7,
    learning_mode: false, surplus_qty: null, capacity_source: 'heuristic_fallback',
    normal_price: 59, customer_price: 51, tamam_contribution: 4, restaurant_contribution: 4,
  });

  useEffect(() => { listDecisionScenarios().then((d) => { setScenarios(d || []); if (d && d[0]) setScenarioKey(d[0].key); }); }, []);
  useEffect(() => { listRestaurants().then(setRestaurants).catch(() => {}); }, []);

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      if (mode === 'scenario') {
        const r = await evaluateDecision({ scenario_key: scenarioKey });
        setResult(r);
      } else if (mode === 'custom') {
        const r = await evaluateDecision({ custom_inputs: { ...ci, capacity_source: ci.capacity_source || 'heuristic_fallback' } });
        setResult(r);
      } else {
        const r = await evaluateDecision({ restaurant_id: ci.restaurant_id, test_time: ci.test_time });
        setResult(r);
      }
    } catch (e) { setError(e.message || 'error'); }
    setLoading(false);
  };

  const runAll = async () => {
    setLoading(true); setError('');
    try { const r = await runDecisionScenarios(); setResult({ _all: r }); } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const ds = result && !result._all ? safeParse(result.data_sources) : {};
  const alts = result && !result._all ? safeParseArr(result.strategy_alternatives) : [];

  return (
    <div className="min-h-screen bg-[#F5F5F5] max-w-4xl mx-auto" dir="rtl">
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-extrabold">مختبر قرارات الطلب</h1>
          <Link to="/admin/demand-decisions" className="text-sm font-bold text-indigo-600">سجل القرارات ←</Link>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <ModeTab v="scenario" cur={mode} set={setMode} label="سيناريو تجريبي" />
          <ModeTab v="custom" cur={mode} set={setMode} label="مدخلات مخصّصة" />
          <ModeTab v="real" cur={mode} set={setMode} label="مطعم فعلي" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border">
          {mode === 'scenario' && (
            <div>
              <label className="text-xs font-bold text-gray-500">السيناريو</label>
              <select value={scenarioKey} onChange={(e) => setScenarioKey(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border text-sm">
                {scenarios.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              {scenarios.find((s) => s.key === scenarioKey) && <p className="text-xs text-gray-500 mt-2">{scenarios.find((s) => s.key === scenarioKey)?.description}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={run} disabled={loading} className="flex-1 bg-blue text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">{loading ? '...جاري' : 'شغّل السيناريو'}</button>
                <button onClick={runAll} disabled={loading} className="px-3 py-2.5 rounded-xl border text-sm font-bold">كل السيناريوهات</button>
              </div>
            </div>
          )}
          {mode === 'custom' && (
            <CustomInputs ci={ci} setCi={setCi} onRun={run} loading={loading} />
          )}
          {mode === 'real' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500">المطعم</label>
                <select value={ci.restaurant_id} onChange={(e) => setCi({ ...ci, restaurant_id: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-sm">
                  <option value="">اختر مطعم</option>
                  {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name_ar || r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">وقت الاختبار (اختياري)</label>
                <input type="datetime-local" value={ci.test_time || ''} onChange={(e) => setCi({ ...ci, test_time: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-sm" />
              </div>
              <button onClick={run} disabled={loading || !ci.restaurant_id} className="w-full bg-blue text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">قيّم بيانات فعلية</button>
              <p className="text-xs text-gray-400">المدخلات الفعلية تُقرأ من بيانات المطعم الحقيقية. للتلاعب بالمدخلات استخدم وضع "مدخلات مخصّصة".</p>
            </div>
          )}
          {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        </div>

        {result && !result._all && (
          <DecisionOutput result={result} ds={ds} alts={alts} />
        )}
        {result && result._all && (
          <div className="space-y-2">
            {result._all.map((s) => (
              <div key={s.key} className="bg-white rounded-xl p-3 border">
                <div className="flex items-center justify-between">
                  <div><p className="font-bold text-sm">{s.label}</p><p className="text-xs text-gray-500">{s.decision} · {s.recommended_objective}/{s.recommended_strategy} · quota {s.recommended_quota} · {s.explore_exploit}</p></div>
                  <div className="text-left"><Pill color={DECISION_COLOR[s.decision]}>{s.decision}</Pill>{s.expected_match && <span className={`text-[10px] block mt-1 ${s.expected_match.decision_ok && s.expected_match.strategy_ok ? 'text-green-600' : 'text-red-600'}`}>{s.expected_match.decision_ok && s.expected_match.strategy_ok ? '✓ مطابق' : '✗ غير مطابق'}</span>}</div>
                </div>
                <p className="text-xs text-gray-400 mt-1">score {s.opportunity_score} · gap {s.demand_gap} · safe+ {s.safe_additional} · cann {s.cannibalization} · src {s.capacity_source}</p>
                <p className="text-xs text-gray-600 mt-1">{s.explanation_partner}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionOutput({ result, ds, alts }) {
  const whyNo = result.decision === 'NO_ACTION';
  const flow = [
    { icon: 'storefront', label: 'المطعم', value: result.capacity_source || '—', src: ds.safe_operational_target },
    { icon: 'schedule', label: 'الوقت', value: fmtWin(result.window_start, result.window_end) },
    { icon: 'trending_up', label: 'الطلب المتوقع', value: result.projected_natural_orders, src: ds.projected_natural_orders },
    { icon: 'inventory_2', label: 'القدرة', value: `هدف ${result.safe_operational_target} → آمن +${result.safe_additional_capacity}`, src: ds.safe_operational_target },
    { icon: 'gap', label: 'الفجوة', value: result.demand_gap, src: ds.existing_campaign_commitment },
    { icon: 'groups', label: 'الجمهور', value: `${result.audience_segment} (${result.audience_size})`, src: ds.audience },
    { icon: 'shield', label: 'الأمان التجاري', value: result.commercial_safe ? 'آمن' : 'غير آمن', src: ds.commercial },
    { icon: 'flag', label: 'القرار', value: result.decision },
  ];
  return (
    <div className="space-y-3">
      {whyNo && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="font-bold text-amber-700 text-sm mb-1">ليش TAMAM ما لازم تعمل إشي؟</p>
          <p className="text-sm text-amber-800">{result.explanation_partner}</p>
        </div>
      )}
      <div className="bg-white rounded-2xl p-4 border">
        <p className="font-bold text-sm mb-3">مسار القرار</p>
        <div className="flex flex-col gap-2">
          {flow.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><Icon name={f.icon} className="text-gray-600 text-lg" /></div>
              <div className="flex-1">
                <span className="text-xs text-gray-500">{f.label}</span>
                <p className="text-sm font-bold">{typeof f.value === 'object' ? JSON.stringify(f.value) : f.value}</p>
              </div>
              {f.src && <SourceTag src={f.src} />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm">القرار</span>
          <Pill color={DECISION_COLOR[result.decision]}>{result.decision}</Pill>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Row k="حالة الطلب" v={result.demand_state} />
          <Row k="الهدف التشغيلي" v={result.safe_operational_target} src={ds.safe_operational_target} />
          <Row k="الطلب المتوقع" v={result.projected_natural_orders} src={ds.projected_natural_orders} />
          <Row k="التزام الحملات" v={result.existing_campaign_commitment} src={ds.existing_campaign_commitment} />
          <Row k="القدرة الآمنة الإضافية" v={result.safe_additional_capacity} />
          <Row k="الفجوة" v={result.demand_gap} />
          <Row k="الجمهور" v={`${result.audience_segment} (${result.audience_size})`} src={ds.audience} />
          <Row k="نية الجمهور" v={num(result.audience_intent_score)} />
          <Row k="Cannibalization" v={`${result.cannibalization_risk} (${num(result.cannibalization_risk_score)})`} src={ds.cannibalization} />
          <Row k="إرهاق الحملات" v={num(result.campaign_fatigue_score)} />
          <Row k="الأمان التجاري" v={result.commercial_safe ? 'آمن' : 'غير آمن'} src={ds.commercial} />
          <Row k="الثقة" v={num(result.data_confidence_score)} />
          <Row k="الدرجة" v={result.opportunity_score} />
          <Row k="مصدر القدرة" v={result.capacity_source} />
          <Row k="القرار" v={result.decision} />
          <Row k="Explore/Exploit" v={result.explore_exploit} />
        </div>
        {result.recommended_strategy && (
          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Row k="الهدف" v={result.recommended_objective} />
            <Row k="الآلية" v={result.recommended_strategy} />
            <Row k="النسخة" v={result.recommended_variant} />
            <Row k="الحصة" v={result.recommended_quota} />
            <Row k="تكلفة التدخل" v={num(result.intervention_cost_score)} />
            <Row k="طلبات متوقعة" v={`${result.expected_incremental_orders} (تقدير)`} />
            <Row k="إيراد متوقع" v={`${result.expected_incremental_revenue} ₪ (تقدير)`} />
            <Row k="تكلفة TAMAM" v={`${result.expected_tamam_contribution_cost} ₪ (تقدير)`} />
          </div>
        )}
      </div>

      {alts.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border">
          <p className="font-bold text-sm mb-2">الاستراتيجيات المقترحة</p>
          <div className="space-y-2">
            {alts.map((a, i) => (
              <div key={i} className={`rounded-xl p-3 border ${i === 0 ? 'border-blue-300 bg-blue-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{i === 0 ? '★ ' : ''}{a.mechanism}</span>
                  <div className="text-left"><span className="text-xs text-gray-500">درجة {a.score} · تكلفة {a.cost_label}</span></div>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>الحصة {a.quota}</span><span>طلبات ~{a.expected_incremental_orders}</span><span>إيراد ~{a.expected_incremental_revenue} ₪</span><span>TAMAM ~{a.expected_tamam_contribution_cost} ₪</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 border">
        <p className="font-bold text-sm mb-1">شرح داخلي</p>
        <p className="text-xs text-gray-600 leading-relaxed">{result.explanation_internal}</p>
        <p className="font-bold text-sm mt-3 mb-1">شرح للشريك</p>
        <p className="text-sm">{result.explanation_partner}</p>
        {result.expected_match && (
          <p className={`text-xs mt-3 ${result.expected_match.decision_ok && result.expected_match.strategy_ok ? 'text-green-600' : 'text-red-600'}`}>
            {result.expected_match.decision_ok && result.expected_match.strategy_ok ? '✓ مطابق للسيناريو' : `✗ قرار: ${result.expected_match.decision_ok ? '✓' : '✗'} · آلية: ${result.expected_match.strategy_ok ? '✓' : '✗'}`}
          </p>
        )}
      </div>
    </div>
  );
}

function CustomInputs({ ci, setCi, onRun, loading }) {
  const set = (k, v) => setCi({ ...ci, [k]: v });
  const num = (k) => <input type="number" value={ci[k] ?? ''} onChange={(e) => set(k, e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg border text-sm" />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">كل المدخلات هنا تُعامل كـ <b>تجاوز تجريبي (DEMO_OVERRIDE)</b> لأغراض المختبر فقط.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="حالة الإشارة"><select value={ci.traffic_light} onChange={(e) => set('traffic_light', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm">{Object.entries(TL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="حالة المطعم"><select value={ci.restaurant_status} onChange={(e) => set('restaurant_status', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm">{['open', 'closed', 'busy', 'temporarily_unavailable'].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="ضغط مطبخ"><Toggle v={ci.pressure_active} set={(v) => set('pressure_active', v)} /></Field>
        <Field label="أولية المنتج"><select value={ci.product_priority} onChange={(e) => set('product_priority', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm">{['STRENGTHEN', 'SURPLUS', 'NORMAL', 'NEW_ITEM', 'AVOID_PROMOTION'].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="الهدف التشغيلي (قدرة)">{num('safe_operational_target')}</Field>
        <Field label="الطلب المتوقع (DEMO)">{num('projected_natural_orders')}</Field>
        <Field label="التزام الحملات">{num('existing_campaign_commitment')}</Field>
        <Field label="خط أساس">{num('baseline_orders')}</Field>
        <Field label="الجمهور"><select value={ci.audience_segment} onChange={(e) => set('audience_segment', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm">{['NEW_TO_RESTAURANT', 'REPEAT_CUSTOMER', 'LAPSED_30', 'LAPSED_60', 'POINTS_ENGAGED', 'HIGH_INTENT_NO_PURCHASE', 'public', 'FAMILY'].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="حجم الجمهور">{num('audience_size')}</Field>
        <Field label="نية الجمهور (0-1)">{num('audience_intent_score')}</Field>
        <Field label="Cannibalization (0-1)">{num('cannibalization_score')}</Field>
        <Field label="إرهاق (0-1)">{num('fatigue_score')}</Field>
        <Field label="تشبع (0-1)">{num('campaign_saturation')}</Field>
        <Field label="أمان تجاري"><Toggle v={ci.commercial_safe} set={(v) => set('commercial_safe', v)} /></Field>
        <Field label="الثقة (0-1)">{num('data_confidence')}</Field>
        <Field label="وضع تعلّم"><Toggle v={ci.learning_mode} set={(v) => set('learning_mode', v)} /></Field>
        <Field label="كمية فائض (null=لا)">{num('surplus_qty')}</Field>
        <Field label="مصدر القدرة"><select value={ci.capacity_source} onChange={(e) => set('capacity_source', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm">{['realtime_restriction', 'temporary_signal', 'time_specific', 'restaurant_default', 'historical_inferred', 'heuristic_fallback'].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="السعر العادي">{num('normal_price')}</Field>
        <Field label="سعر العميل">{num('customer_price')}</Field>
      </div>
      <button onClick={onRun} disabled={loading} className="w-full bg-blue text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">قيّم المدخلات</button>
    </div>
  );
}

function ModeTab({ v, cur, set, label }) {
  return <button onClick={() => set(v)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${cur === v ? 'bg-white shadow text-blue' : 'text-gray-500'}`}>{label}</button>;
}
function Field({ label, children }) { return <div><label className="text-[11px] font-bold text-gray-500">{label}</label><div className="mt-0.5">{children}</div></div>; }
function Toggle({ v, set }) { return <button onClick={() => set(!v)} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${v ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v ? 'نعم' : 'لا'}</button>; }
function Row({ k, v, src }) { return <div className="flex justify-between items-center"><span className="text-gray-500 text-xs">{k}</span><span className="flex items-center gap-1.5"><span className="font-bold">{String(v ?? '—')}</span>{src && <SourceTag src={src} />}</span></div>; }
function Pill({ color, children }) { const m = { gray: 'bg-gray-200 text-gray-700', blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700', indigo: 'bg-indigo-100 text-indigo-700', green: 'bg-green-100 text-green-700', orange: 'bg-orange-100 text-orange-700', red: 'bg-red-100 text-red-700' }; return <span className={`text-xs font-bold px-2 py-1 rounded-full ${m[color] || m.gray}`}>{children}</span>; }
function SourceTag({ src }) { return <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${SRC_CLS(SOURCE_COLOR[src])}`}>{SOURCE_LABEL[src] || src}</span>; }
function SRC_CLS(c) { return { green: 'bg-green-50 text-green-600', blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600', amber: 'bg-amber-50 text-amber-600', orange: 'bg-orange-50 text-orange-600' }[c] || 'bg-gray-50 text-gray-500'; }
function num(x) { return x == null ? '—' : (typeof x === 'number' ? Math.round(x * 100) / 100 : x); }
function fmtWin(s, e) { try { return `${new Date(s).toLocaleString('ar', { hour: '2-digit', minute: '2-digit', weekday: 'short' })} → ${new Date(e).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' })}`; } catch { return '—'; } }
function safeParse(s) { try { return typeof s === 'string' ? JSON.parse(s) : (s || {}); } catch { return {}; } }
function safeParseArr(s) { try { return typeof s === 'string' ? JSON.parse(s) : (Array.isArray(s) ? s : []); } catch { return []; } }