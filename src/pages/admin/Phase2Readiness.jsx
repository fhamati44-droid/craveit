import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPhase2Readiness } from '@/lib/campaignApi';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Circle } from 'lucide-react';

const STATUS_STYLE = {
  PASS: { bg: 'bg-green-50 border-green-300 text-green-700', icon: CheckCircle2, label: 'PASS' },
  FAIL: { bg: 'bg-red-50 border-red-300 text-red-700', icon: XCircle, label: 'FAIL' },
  WARNING: { bg: 'bg-amber-50 border-amber-300 text-amber-700', icon: AlertTriangle, label: 'WARNING' },
  NOT_TESTED: { bg: 'bg-gray-100 border-gray-300 text-gray-500', icon: Circle, label: 'NOT TESTED' },
};

const TEST_LABELS = {
  demo_restaurant: 'المطعم التجريبي متوفر',
  time_expiry_fallback: 'انتهاء الوقت ورجوع السعر العادي',
  mood_before_restaurant: 'حل المود قبل اختيار المطعم',
  product_mapping_fulfillment: 'حل الت mapping للمنتج',
  direct_browse_fulfillment: 'التصفح المباشر يحل العرض',
  points_atomic_unlock: 'فتح النقاط ذري (خصم واحد)',
  expired_unlock_protection: 'منع الفتح بعد انتهاء العرض',
  quota_atomicity: 'ذريّة الكمية (لا بيع زائد)',
  last_slot_concurrency: 'آخر قطعة تحت الضغط',
  conflict_resolution: 'حل تعارض العروض حتمي',
  checkout_server_revalidation: 'إعادة تحقق الدفع من الخادم',
  restaurant_item_availability: 'حماية توفّر المطعم/الوجبة',
  demo_isolation: 'عزل البيانات التجريبية',
  unified_customer_contract: 'عقد العرض الموحّد للعميل',
  real_checkout_integration: 'ربط إعادة التحقق بالدفع الحقيقي',
};

export default function Phase2Readiness() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await getPhase2Readiness()); }
    catch (e) { setError(e?.message || 'فشل تحميل النتائج'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const overall = data?.overall_status;
  const tests = data?.tests || [];
  const criticalFails = data?.critical_failures || [];

  return (
    <div className="min-h-screen bg-[#F5F5F5] max-w-3xl mx-auto" dir="rtl">
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <Link to="/admin/campaigns" className="text-gray-500 text-sm">← محرك الحملات</Link>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 bg-blue text-white px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> إعادة الفحص
          </button>
        </div>
        <h1 className="text-lg font-extrabold">TAMAM — جاهزية Phase 2</h1>
        <p className="text-xs text-gray-400 mt-1">نتائج حقيقية من الخادم — بدون قيم ثابتة.</p>
      </div>

      <div className="p-4 space-y-4">
        {loading && <p className="text-center text-gray-400 py-12">عم ننفّذ الفحوصات على الخادم...</p>}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

        {!loading && data && (
          <>
            <div className={`rounded-2xl p-5 border-2 text-center ${overall === 'PHASE_2_READY' ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
              <p className="text-xs text-gray-500 mb-1">القرار النهائي</p>
              <p className={`text-2xl font-extrabold ${overall === 'PHASE_2_READY' ? 'text-green-700' : 'text-red-700'}`}>
                {overall === 'PHASE_2_READY' ? 'PHASE 2 READY ✅' : 'PHASE 2 NOT READY ❌'}
              </p>
              <p className="text-[11px] text-gray-400 mt-2">آخر فحص: {new Date(data.server_time).toLocaleString('ar')}</p>
            </div>

            {criticalFails.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                <b className="text-red-700">معوّقات حرجة:</b> {criticalFails.join('، ')}
              </div>
            )}

            <div className="space-y-2">
              {tests.map((t) => {
                const s = STATUS_STYLE[t.status] || STATUS_STYLE.NOT_TESTED;
                const Icon = s.icon;
                return (
                  <div key={t.test_id} className={`rounded-xl p-3 border ${s.bg}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Icon size={18} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold text-sm">{TEST_LABELS[t.test_id] || t.test_id}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{t.message}</p>
                          {t.details && Object.keys(t.details).length > 0 && (
                            <pre className="text-[10px] text-gray-500 mt-1 bg-white/50 rounded p-1.5 overflow-x-auto" dir="ltr">{JSON.stringify(t.details)}</pre>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white border">{s.label}</span>
                        {t.critical && <span className="text-[9px] text-red-600 font-bold">حرج</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl p-3 border text-xs text-gray-500">
              <p><b className="text-gray-700">ملاحظة:</b> الفحوصات تعمل على بيانات المطعم التجريبي. فحص «ربط الدفع الحقيقي» يتحقق من توفّر واجهة إعادة التحقق والاستهلاك الذري + ربطها في صفحة الدفع.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}