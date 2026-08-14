import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getDemoStatus, generateDemoData, refreshDemoData, resetDemoData, deleteDemoData } from '@/lib/demoDataApi';

const ENTITY_LABELS = {
  restaurant: 'المطعم', RestaurantMembership: 'العضوية', RestaurantMealOffer: 'أصناف المنيو',
  WeeklyDemandProfile: 'ملف الحركة', DemandSlot: 'فترات الحركة', DemandDayProfile: 'تصنيف الأيام',
  RestaurantOperationalSignal: 'إشارات تشغيلية', CommercialGuardrail: 'الحدود التجارية',
  OfferRequest: 'طلبات العروض', RestaurantSubOrder: 'طلبات تجريبية',
};

export default function AdminDemoData() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = async () => {
    const [s, u] = await Promise.all([
      getDemoStatus().catch(() => null),
      base44.entities.User.list('-created_date', 100).catch(() => []),
    ]);
    setStatus(s);
    setUsers(u || []);
    if (s?.membership?.user_id) setUserId(s.membership.user_id);
  };
  useEffect(() => { load(); }, []);

  const run = async (fn, label) => {
    setBusy(true); setMsg({ kind: 'info', text: `${label}…` });
    try {
      const res = await fn();
      await load();
      setMsg({ kind: 'ok', text: `${label} ✓` });
      return res;
    } catch (e) {
      setMsg({ kind: 'err', text: `ما قدرنا ${label}` });
      throw e;
    } finally { setBusy(false); }
  };

  const onGenerate = () => run(() => generateDemoData(userId), 'إنشاء البيانات التجريبية');
  const onRefresh = () => run(() => refreshDemoData(userId), 'تحديث البيانات الناقصة');
  const onReset = async () => { setConfirmReset(false); await run(() => resetDemoData(userId), 'إعادة ضبط البيانات'); };
  const onDelete = async () => { setConfirmDelete(false); await run(() => deleteDemoData(), 'حذف البيانات التجريبية'); };

  const exists = status?.exists;
  const counts = status?.counts || {};

  return (
    <div className="min-h-screen bg-[#F5F5F5]" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-12">
        <div className="flex items-center justify-between mb-4">
          <Link to="/tamam-admin" className="text-sm text-gray-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span> لوحة الإدارة
          </Link>
          <h1 className="text-lg font-extrabold text-[#1A1A1A]">بيانات تجريبية لأصحاب المطاعم</h1>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-600 text-[20px]">science</span>
          <p className="text-[12px] text-amber-800 leading-snug">
            هالأداة بتنشئ مطعم تجريبي وبيانات كاملة لمعاينة بوابة أصحاب المطاعم. كل السجلات موسومة بـ <b>بيانات تجريبية</b> وما بتظهر للعملاد أبداً.
          </p>
        </div>

        {/* Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-sm text-gray-900">حالة البيانات</h2>
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${exists ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {exists ? 'موجودة' : 'غير موجودة'}
            </span>
          </div>
          {exists ? (
            <div className="space-y-1.5">
              <div className="text-[12px] text-gray-700">
                <b>{status.restaurant.name_ar}</b> — {status.restaurant.city} · {status.restaurant.accepts_orders ? 'يستقبل طلبات' : 'متوقف'}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {Object.entries(counts).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] text-gray-600">{ENTITY_LABELS[k] || k}</span>
                    <span className="text-[12px] font-bold text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">معرّف الدفعة: <code className="text-gray-700">{status.batch_id}</code></div>
            </div>
          ) : (
            <p className="text-[12px] text-gray-500">ما في بيانات تجريبية بعد. اضغط «أنشئ البيانات التجريبية».</p>
          )}
        </div>

        {/* Membership owner selector */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <label className="text-[12px] text-gray-600 block mb-1.5">صاحب المطعم التجريبي (مستخدم موجود)</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm">
            <option value="">— بدون عضوية —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>)}
          </select>
          <p className="text-[11px] text-gray-400 mt-1.5">إذا اختاريت مستخدم، رح ينشأ له عضوية مالك فعّالة على المطعم التجريبي.</p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={onGenerate} disabled={busy} className="h-12 rounded-xl bg-blue text-white font-bold text-sm disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px] align-middle">auto_awesome</span> أنشئ البيانات التجريبية
          </button>
          <button onClick={onRefresh} disabled={busy || !exists} className="h-12 rounded-xl bg-green text-white font-bold text-sm disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px] align-middle">refresh</span> حدّث البيانات الناقصة
          </button>
          <button onClick={() => navigate('/partner/select-restaurant')} disabled={!exists} className="h-12 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold text-sm disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px] align-middle">visibility</span> افتح معاينة المطعم
          </button>
          <button onClick={() => setConfirmReset(true)} disabled={busy || !exists} className="h-12 rounded-xl bg-white border border-amber-300 text-amber-700 font-bold text-sm disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px] align-middle">restart_alt</span> إعادة ضبط كاملة
          </button>
          <button onClick={() => setConfirmDelete(true)} disabled={busy || !exists} className="col-span-2 h-12 rounded-xl bg-white border border-red-300 text-red-600 font-bold text-sm disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px] align-middle">delete</span> احذف البيانات التجريبية
          </button>
        </div>

        {msg && (
          <div className={`rounded-xl p-3 text-[12px] font-bold ${msg.kind === 'ok' ? 'bg-green-50 text-green-700' : msg.kind === 'err' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
            {msg.text}
          </div>
        )}

        {/* Reset confirm */}
        {confirmReset && (
          <ConfirmCard
            title="إعادة ضبط كاملة؟"
            body="رح تنحذف كل السجلات التجريبية وتُنشأ من جديد. أي تعديلات عملتها رح تضيع."
            confirmLabel="نعم، أعد الضبط"
            onConfirm={onReset}
            onCancel={() => setConfirmReset(false)} />
        )}
        {/* Delete confirm */}
        {confirmDelete && (
          <ConfirmCard
            title="حذف كل البيانات التجريبية؟"
            body={(
              <div>
                <p className="mb-2">رح تنحذف هالسجلات فقط:</p>
                <ul className="space-y-1">
                  {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
                    <li key={k} className="flex justify-between"><span>{ENTITY_LABELS[k] || k}</span><b>{v}</b></li>
                  ))}
                </ul>
                <p className="mt-2 text-red-600">ما رح ينحذف أي بيانات حقيقية.</p>
              </div>
            )}
            confirmLabel="نعم، احذف"
            danger
            onConfirm={onDelete}
            onCancel={() => setConfirmDelete(false)} />
        )}
      </div>
    </div>
  );
}

function ConfirmCard({ title, body, confirmLabel, onConfirm, onCancel, danger }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-base text-gray-900 mb-2">{title}</h3>
        <div className="text-[12px] text-gray-600 mb-4">{body}</div>
        <div className="flex gap-2">
          <button onClick={onConfirm} className={`flex-1 h-11 rounded-xl font-bold text-sm text-white ${danger ? 'bg-red-600' : 'bg-amber-600'}`}>{confirmLabel}</button>
          <button onClick={onCancel} className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  );
}