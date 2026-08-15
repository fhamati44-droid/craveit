import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDemoStatus, seedDemoCampaigns, resetDemoCampaigns, getCalendar, listCampaigns, listOpportunities, calculatePrice, commercialBreakdown } from '@/lib/campaignApi';
import { Sparkles, Calendar, RefreshCw, Trash2, Plus, Calculator, TrendingUp } from 'lucide-react';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثا', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const OBJ_AR = { NEW_CUSTOMERS: 'زباين جدد', REACTIVATION: 'إعادة تفعيل', IMMEDIATE_DEMAND: 'طلب فوري', INCREASE_AOV: 'رفع السلة', LOYALTY_ENGAGEMENT: 'ولاء', CONVERSION_RECOVERY: 'استرجاع', SURPLUS: 'فائض', STRENGTHEN_ITEM: 'تقوية', TEST_RESTAURANT: 'تجربة', REPEAT_PURCHASE: 'تكرار', PAYDAY_AOV: 'راتب', ACQUISITION: 'اكتساب' };
const TL_COLOR = { GREEN: 'bg-green-100 border-green-300 text-green-700', YELLOW: 'bg-amber-50 border-amber-200 text-amber-700', RED: 'bg-red-50 border-red-200 text-red-600' };
const TL_AR = { GREEN: 'أخضر — ممكن ندفع طلبات', YELLOW: 'أصفر — بحذر', RED: 'أحمر — لا ندفع' };

export default function Campaigns() {
  const [status, setStatus] = useState(null);
  const [cal, setCal] = useState(null);
  const [camps, setCamps] = useState([]);
  const [opps, setOpps] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('calendar');
  const [calc, setCalc] = useState({ net: '', result: null });

  const rid = status?.restaurant;

  const load = useCallback(() => {
    getDemoStatus().then((s) => {
      setStatus(s);
      if (s?.restaurant) {
        getCalendar(s.restaurant, true).then(setCal);
        listCampaigns(s.restaurant).then(setCamps);
        listOpportunities(s.restaurant).then(setOpps);
      }
    });
  }, []);
  useEffect(load, [load]);

  const seed = async () => { setBusy(true); try { await seedDemoCampaigns(); await load(); } finally { setBusy(false); } };
  const reset = async () => { if (!confirm('تصفير كل بيانات الحملات التجريبية؟')) return; setBusy(true); try { await resetDemoCampaigns(); await load(); } finally { setBusy(false); } };

  const doCalc = async () => {
    const net = Number(calc.net);
    if (!isFinite(net) || net <= 0) return;
    const r = await calculatePrice(net);
    setCalc({ ...calc, result: r });
  };
  const breakdown = async (normal, customer, r, t) => {
    const r2 = await commercialBreakdown({ normal_price: normal, customer_price: customer, restaurant_contribution: r || 0, tamam_contribution: t || 0 });
    alert(`السعر العادي: ${r2.normal} ₪\nالسعر للعميل: ${r2.customer} ₪\nخصم: ${r2.discount} ₪\nTAMAM ساهمت: ${r2.tamam_contribution} ₪\nالمطعم ساهم: ${r2.restaurant_contribution} ₪\nتسوية المطعم: ${r2.restaurant_settlement} ₪\nإيراد TAMAM: ${r2.tamam_revenue} ₪\nصالح: ${r2.funding_valid}${r2.funding_reason ? ' ('+r2.funding_reason+')' : ''}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] max-w-4xl mx-auto" dir="rtl">
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-extrabold">TAMAM — محرك الحملات والطلب</h1>
          <div className="flex gap-2">
            <button onClick={seed} disabled={busy} className="flex items-center gap-1.5 bg-green text-white px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-50"><Sparkles size={15} /> توليد تجريبي</button>
            <button onClick={reset} disabled={busy} className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm font-bold"><Trash2 size={15} /> تصفير</button>
          </div>
        </div>
        <div className="flex gap-3 mb-2 text-xs">
          <Link to="/admin/offer-validation" className="text-indigo-600 font-bold">مختبر التحقق</Link>
          <Link to="/admin/phase2-readiness" className="text-green-700 font-bold">جاهزية Phase 2</Link>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <Tab v="calendar" cur={tab} set={setTab} icon={<Calendar size={14} />} label="التقويم" />
          <Tab v="campaigns" cur={tab} set={setTab} icon={<TrendingUp size={14} />} label="الحملات" />
          <Tab v="opportunities" cur={tab} set={setTab} icon={<Sparkles size={14} />} label="الفرص" />
          <Tab v="calc" cur={tab} set={setTab} icon={<Calculator size={14} />} label="حاسبة" />
        </div>
      </div>

      <div className="p-4">
        {status && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm">
            <b className="text-amber-700">مطعم البرك التجريبي</b> · {status.campaigns} حملة · {status.offers} عرض · {status.opportunities} فرصة · {status.events} حدث
          </div>
        )}

        {tab === 'calendar' && (
          <div>
            {cal && (
              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {DAYS.map((d, i) => {
                  const tl = cal.traffic_light[i];
                  return <div key={i} className={`rounded-lg p-1.5 text-center border text-[10px] font-bold ${TL_COLOR[tl]}`}>{d}<br/>{TL_AR[tl]?.split('—')[0]}</div>;
                })}
              </div>
            )}
            <div className="space-y-2">
              {cal && Object.entries(cal.by_day).map(([day, items]) => (
                <div key={day} className="bg-white rounded-xl p-3 border">
                  <p className="font-bold text-sm mb-2">{DAYS[day]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((c) => (
                      <Link key={c.id} to={`/admin/campaigns/${c.id}`} className={`text-xs rounded-lg px-2.5 py-1.5 border ${TL_COLOR[c.traffic]} hover:shadow`}>
                        <b>{c.start}–{c.end}</b> · {c.name} <span className="opacity-60">({OBJ_AR[c.objective]})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {(!cal || Object.keys(cal.by_day).length === 0) && <p className="text-center text-gray-400 py-8">اضغط "توليد تجريبي" لإنشاء 12 حملة تجريبية.</p>}
            </div>
          </div>
        )}

        {tab === 'campaigns' && (
          <div className="space-y-2">
            {camps.map((c) => (
              <Link key={c.id} to={`/admin/campaigns/${c.id}`} className="block bg-white rounded-xl p-3 border hover:shadow">
                <div className="flex items-center justify-between">
                  <div><p className="font-bold text-sm">{c.campaign_name}</p><p className="text-xs text-gray-500">{OBJ_AR[c.objective]} · {c.status}</p></div>
                  <div className="text-left text-xs text-gray-400">{new Date(c.start_at).toLocaleDateString('ar')} · {(c.linked_offer_ids||[]).length} عرض</div>
                </div>
                {c.is_demo && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">تجريبي</span>}
              </Link>
            ))}
            {camps.length === 0 && <p className="text-center text-gray-400 py-8">لا توجد حملات بعد.</p>}
          </div>
        )}

        {tab === 'opportunities' && (
          <div className="space-y-2">
            {opps.map((o) => (
              <div key={o.id} className="bg-white rounded-xl p-3 border">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">{o.reason || o.opportunity_type}</p>
                  <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{o.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{o.opportunity_type} · {o.priority} · قدرة {o.capacity || '—'}{o.linked_campaign_id ? ' · تحولت لحملة' : ''}</p>
              </div>
            ))}
            {opps.length === 0 && <p className="text-center text-gray-400 py-8">لا توجد فرص بعد.</p>}
          </div>
        )}

        {tab === 'calc' && (
          <div className="bg-white rounded-2xl p-4 border max-w-md">
            <h2 className="font-bold text-sm mb-2">حاسبة السعر التجاري</h2>
            <p className="text-xs text-gray-500 mb-3">أدخل المبلغ اللي بدك المطعم يوصله (صافي). العمولة 25% على السعر العادي: <b>سعر العميل = الصافي ÷ 0.75</b> (مش الصافي + 25%).</p>
            <div className="flex gap-2">
              <input type="number" value={calc.net} onChange={(e) => setCalc({ ...calc, net: e.target.value })} placeholder="مثال: 100" className="flex-1 px-3 py-2 rounded-lg border text-sm" />
              <button onClick={doCalc} className="bg-blue text-white px-4 rounded-lg font-bold text-sm">احسب</button>
            </div>
            {calc.result && (
              <div className="mt-3 bg-blue-50 rounded-xl p-3 text-sm space-y-1">
                <Row k="صافي المطعم" v={calc.result.restaurant_net + ' ₪'} />
                <Row k="سعر العميل المطلوب" v={calc.result.customer_price + ' ₪'} b />
                <Row k="عمولة TAMAM" v={calc.result.commission_amount + ' ₪'} />
                <Row k="نسبة العمولة" v={(calc.result.commission_rate * 100) + '%'} />
              </div>
            )}
            <div className="mt-3 text-xs text-gray-500">
              مثال تمويل: عرض 59→51 ₪. اضغط:
              <button onClick={() => breakdown(59, 51, 3.87, 4.13)} className="text-blue font-bold mr-1">شوف تفصيل التمويل</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({ v, cur, set, icon, label }) {
  return <button onClick={() => set(v)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold ${cur === v ? 'bg-white shadow text-blue' : 'text-gray-500'}`}>{icon} {label}</button>;
}
function Row({ k, v, b }) { return <div className="flex justify-between"><span className="text-gray-500">{k}</span><span className={b ? 'font-extrabold text-blue' : 'font-bold'}>{v}</span></div>; }