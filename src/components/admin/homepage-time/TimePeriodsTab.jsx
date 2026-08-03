import { useState, useEffect } from 'react';
import { getPeriods, savePeriod, deletePeriod, seedDefaultPeriods } from '@/lib/homepageTimeApi';

const DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميسيس', 'جمعة', 'سبت'];
const EMPTY = { key: '', name_ar: '', name_he: '', start_time: '05:00', end_time: '10:00', weekdays: [0,1,2,3,4,5,6], priority: 0, is_active: true, is_fallback: false, recommended_moods: [], recommended_categories: [] };

/**
 * Time periods tab — CRUD + 24-hour timeline visualization.
 */
export default function TimePeriodsTab({ onPeriodsChange }) {
  const [periods, setPeriods] = useState([]);
  const [current, setCurrentPeriodId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [currentPeriodId, setCurrentActiveId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPeriods();
      setPeriods(res?.periods || []);
      setCurrentActiveId(res?.current_period_id || '');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    await seedDefaultPeriods();
    await load();
    onPeriodsChange?.();
  };

  const handleSave = async () => {
    if (!editing.name_ar || !editing.start_time || !editing.end_time) return alert('املأ الحقول المطلوبة');
    await savePeriod(editing);
    setEditing(null);
    await load();
    onPeriodsChange?.();
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفترة؟ سيتم حذف جميع القواعد المرتبطة بها.')) return;
    await deletePeriod(id);
    await load();
    onPeriodsChange?.();
  };

  if (loading) return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>;

  if (periods.length === 0 && !editing) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">لا توجد فترات زمنية بعد.</p>
        <button onClick={handleSeed} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold">إنشاء الفترات الافتراضية</button>
      </div>
    );
  }

  return (
    <div>
      {/* Timeline visualization */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <h3 className="font-bold text-sm mb-2">الجدول الزمني (24 ساعة)</h3>
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200">
          {Array.from({ length: 24 }, (_, h) => {
            const period = periods.find((p) => {
              const sh = parseInt(p.start_time?.split(':')[0] || 0);
              const eh = parseInt(p.end_time?.split(':')[0] || 0);
              if (sh <= eh) return h >= sh && h < eh;
              return h >= sh || h < eh;
            });
            const colors = ['bg-blue-300', 'bg-green-300', 'bg-yellow-300', 'bg-orange-300', 'bg-purple-300', 'bg-pink-300', 'bg-teal-300'];
            const colorIdx = periods.indexOf(period);
            return <div key={h} className={`flex-1 ${period ? colors[colorIdx % colors.length] : 'bg-white'} relative group`} title={period?.name_ar || ''}>
              <span className="absolute -top-0.5 left-0.5 text-[8px] text-gray-500">{h}</span>
            </div>;
          })}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {periods.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1 text-xs">
              <span className={`w-3 h-3 rounded ${['bg-blue-300','bg-green-300','bg-yellow-300','bg-orange-300','bg-purple-300'][i % 5]}`} />
              {p.start_time}–{p.end_time} | {p.name_ar}
              {p.id === currentPeriodId && <span className="text-green-600 font-bold">(الحالية)</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Periods list */}
      <div className="space-y-2 mb-4">
        {periods.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-white border rounded-xl p-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{p.name_ar}</span>
                <span className="text-xs text-gray-400">{p.name_he}</span>
                {p.is_fallback && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">احتياطية</span>}
                {p.id === currentPeriodId && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">نشطة الآن</span>}
              </div>
              <span className="text-xs text-gray-500">{p.start_time}–{p.end_time} | {p.key}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing({ ...p })} className="text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200">تعديل</button>
              <button onClick={() => handleDelete(p.id)} className="text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200">حذف</button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setEditing({ ...EMPTY })} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm mb-4">+ فترة جديدة</button>

      {/* Edit form */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{editing.id ? 'تعديل فترة' : 'فترة جديدة'}</h3>
            <div className="space-y-3">
              <Field label="المفتاح (early_morning, lunch, ...)">
                <input value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value })} className="w-full border rounded-lg p-2 text-sm" placeholder="evening" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="الاسم (عربي)"><input value={editing.name_ar} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></Field>
                <Field label="الاسم (عبري)"><input value={editing.name_he} onChange={(e) => setEditing({ ...editing, name_he: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="وقت البداية (HH:MM)"><input type="time" value={editing.start_time} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></Field>
                <Field label="وقت النهاية (HH:MM)"><input type="time" value={editing.end_time} onChange={(e) => setEditing({ ...editing, end_time: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></Field>
              </div>
              <Field label="أيام الأسبوع">
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d, i) => (
                    <button key={i} onClick={() => { const wd = editing.weekdays || []; setEditing({ ...editing, weekdays: wd.includes(i) ? wd.filter((x) => x !== i) : [...wd, i] }); }}
                      className={`px-2.5 py-1 rounded-lg text-xs ${editing.weekdays?.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{d}</button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="الأولوية"><input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} className="w-full border rounded-lg p-2 text-sm" /></Field>
                <Field label="ترتيب العرض"><input type="number" value={editing.sort_order || 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="w-full border rounded-lg p-2 text-sm" /></Field>
              </div>
              <Field label="مودات مقترحة (مفصولة بفاصلة)">
                <input value={(editing.recommended_moods || []).join(', ')} onChange={(e) => setEditing({ ...editing, recommended_moods: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full border rounded-lg p-2 text-sm" placeholder="early-morning, guests-coming" />
              </Field>
              <Field label="تصنيفات مقترحة (مفصولة بفاصلة)">
                <input value={(editing.recommended_categories || []).join(', ')} onChange={(e) => setEditing({ ...editing, recommended_categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full border rounded-lg p-2 text-sm" placeholder="فطور, قهوة" />
              </Field>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> مفعّل</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_fallback} onChange={(e) => setEditing({ ...editing, is_fallback: e.target.checked })} /> فترة احتياطية</label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold">حفظ</button>
              <button onClick={() => setEditing(null)} className="flex-1 bg-gray-100 py-2.5 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-xs text-gray-500 mb-1">{label}</label>{children}</div>;
}