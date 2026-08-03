import { useState, useEffect } from 'react';
import { getPeriods, getSlotRules, saveSlotRule, deleteSlotRule } from '@/lib/homepageTimeApi';

/**
 * Generic slot rules editor — used for hero, suggestions, banners, carousels tabs.
 * Shows period selector + slot rule forms for the selected period.
 */
export default function SlotRulesTab({ slotKeys, tabTitle }) {
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPeriods();
      const ps = res?.periods || [];
      setPeriods(ps);
      if (ps.length && !periodId) setPeriodId(ps[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadRules = async () => {
    if (!periodId) { setRules([]); return; }
    try {
      const r = await getSlotRules(periodId);
      setRules(r || []);
    } catch (e) { console.error(e); setRules([]); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadRules(); }, [periodId]);

  const getRule = (slotKey) => rules.find((r) => r.slot_key === slotKey) || null;

  const handleSave = async () => {
    if (!editing || !editing.slot_key || !editing.period_id) return;
    const settings = editing.settings_json || {};
    await saveSlotRule({
      ...editing,
      settings_json: typeof settings === 'string' ? settings : JSON.stringify(settings),
      content_ids: editing.content_ids || [],
      fallback_content_ids: editing.fallback_content_ids || [],
    });
    setEditing(null);
    await loadRules();
  };

  const handleDelete = async (rule) => {
    if (!confirm('حذف هذه القاعدة؟')) return;
    await deleteSlotRule(rule.id, rule.slot_key);
    await loadRules();
  };

  if (loading) return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>;
  if (periods.length === 0) return <div className="text-center py-8 text-gray-500">أنشئ فترات زمنية أولاً.</div>;

  return (
    <div>
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">الفترة الزمنية</label>
        <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-white">
          {periods.map((p) => <option key={p.id} value={p.id}>{p.name_ar} ({p.start_time}–{p.end_time})</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {slotKeys.map((slotKey) => {
          const rule = getRule(slotKey);
          const isConfigured = !!rule;
          return (
            <div key={slotKey} className={`border rounded-xl p-3 ${isConfigured ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">{SLOT_LABELS[slotKey] || slotKey}</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(rule ? { ...rule, settings_json: rule.settings_json ? (typeof rule.settings_json === 'string' ? JSON.parse(rule.settings_json) : rule.settings_json) : {} } : { slot_key: slotKey, period_id: periodId, selection_mode: 'manual', content_type: 'suggestion', content_ids: [], fallback_content_ids: [], settings_json: {}, is_active: true, priority: 0, max_items: slotKey.includes('carousel') ? 8 : 1 })}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600">
                    {isConfigured ? 'تعديل' : 'إعداد'}
                  </button>
                  {isConfigured && <button onClick={() => handleDelete(rule)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-red-600">حذف</button>}
                </div>
              </div>
              {isConfigured ? (
                <div className="text-xs text-gray-500">
                  الوضع: {rule.selection_mode === 'manual' ? 'يدوي' : 'تلقائي'} | النوع: {rule.content_type || '-'} | {rule.is_active ? '✅ مفعّل' : '❌ معطّل'}
                </div>
              ) : (
                <div className="text-xs text-gray-400">غير مُعد — سيتم استخدام المحتوى الثابت الاحتياطي.</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-1">إعداد: {SLOT_LABELS[editing.slot_key]}</h3>
            <p className="text-xs text-gray-500 mb-4">الفترة: {periods.find((p) => p.id === editing.period_id)?.name_ar}</p>
            <div className="space-y-3">
              <Field label="وضع الاختيار">
                <select value={editing.selection_mode} onChange={(e) => setEditing({ ...editing, selection_mode: e.target.value })} className="w-full border rounded-lg p-2 text-sm bg-white">
                  <option value="manual">يدوي (اختيار محتوى محدد)</option>
                  <option value="automatic">تلقائي (اختيار بناءً على التصنيفات والمودات)</option>
                </select>
              </Field>
              <Field label="نوع المحتوى">
                <select value={editing.content_type} onChange={(e) => setEditing({ ...editing, content_type: e.target.value })} className="w-full border rounded-lg p-2 text-sm bg-white">
                  <option value="suggestion">اقتراح TAMAM</option>
                  <option value="meal">وجبة</option>
                  <option value="media">وسائط (صورة/فيديو)</option>
                  <option value="category">تصنيف</option>
                  <option value="mood">مود</option>
                </select>
              </Field>
              <Field label={`معرفات المحتوى (يدوي) — ${editing.content_type === 'suggestion' ? 'معرفات اقتراح' : editing.content_type === 'meal' ? 'معرفات وجبة' : 'معرفات'}`}>
                <input value={(editing.content_ids || []).join(', ')} onChange={(e) => setEditing({ ...editing, content_ids: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full border rounded-lg p-2 text-sm" placeholder="abc123, def456" />
                <p className="text-[10px] text-gray-400 mt-1">مفصولة بفاصلة. استخدم معرفات حقيقية من قاعدة البيانات.</p>
              </Field>
              <Field label="أقصى عدد عناصر">
                <input type="number" value={editing.max_items || 1} onChange={(e) => setEditing({ ...editing, max_items: Number(e.target.value) })} className="w-full border rounded-lg p-2 text-sm" />
              </Field>

              {/* Slot-specific settings */}
              {editing.slot_key === 'homepage_hero' && (
                <>
                  <Field label="عنوان البانر (عربي)"><input value={editing.settings_json?.headline_ar || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, headline_ar: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" placeholder="العشا جاهز" /></Field>
                  <Field label="نص مساعد (عربي)"><input value={editing.settings_json?.subtitle_ar || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, subtitle_ar: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" /></Field>
                  <Field label="نص الزر (عربي)"><input value={editing.settings_json?.cta_label_ar || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, cta_label_ar: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" placeholder="شوف الاقتراح" /></Field>
                </>
              )}

              {editing.slot_key === 'homepage_top_suggestions' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-bold">معرفات الاقتراحات لكل باقة (يدوي):</p>
                  {['classic', 'mix', 'plus'].map((pkg) => (
                    <Field key={pkg} label={`${pkg === 'classic' ? 'كلاسيك' : pkg === 'mix' ? 'ميكس' : 'بلس'} — معرف الاقتراح`}>
                      <input value={editing.settings_json?.[`content_id_${pkg}`] || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, [`content_id_${pkg}`]: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" placeholder="معرف الاقتراح" />
                    </Field>
                  ))}
                </div>
              )}

              {editing.slot_key?.includes('banner') && (
                <>
                  <Field label="عنوان البانر (عربي)"><input value={editing.settings_json?.headline_ar || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, headline_ar: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" /></Field>
                  <Field label="نص مساعد (عربي)"><input value={editing.settings_json?.subtitle_ar || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, subtitle_ar: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" /></Field>
                  <Field label="نص الزر (عربي)"><input value={editing.settings_json?.cta_label_ar || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, cta_label_ar: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" /></Field>
                  <Field label="وجهة الزر"><input value={editing.settings_json?.cta_route || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, cta_route: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" placeholder="/restaurants" /></Field>
                  <Field label="معرف وسائط (صورة)"><input value={editing.settings_json?.media_id || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, media_id: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" placeholder="معرف HomepageMedia" /></Field>
                </>
              )}

              {editing.slot_key?.includes('carousel') && (
                <>
                  <Field label="عنوان القسم (عربي)"><input value={editing.settings_json?.title_ar || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, title_ar: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" placeholder="مناسب لهسا" /></Field>
                  <Field label="نص مساعد (عربي)"><input value={editing.settings_json?.subtitle_ar || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, subtitle_ar: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" /></Field>
                  <Field label="وضع التلقائي">
                    <select value={editing.settings_json?.auto_mode || 'category'} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, auto_mode: e.target.value } })} className="w-full border rounded-lg p-2 text-sm bg-white">
                      <option value="category">حسب التصنيفات</option>
                      <option value="random">عشوائي</option>
                      <option value="new">جديد</option>
                    </select>
                  </Field>
                  <Field label="وجهة زر الكل"><input value={editing.settings_json?.view_all_route || ''} onChange={(e) => setEditing({ ...editing, settings_json: { ...editing.settings_json, view_all_route: e.target.value } })} className="w-full border rounded-lg p-2 text-sm" placeholder="/restaurants" /></Field>
                </>
              )}

              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> مفعّل</label>
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

const SLOT_LABELS = {
  homepage_hero: 'البانر الرئيسي',
  homepage_top_suggestions: 'اقتراحات TAMAM (Classic/Mix/Plus)',
  homepage_time_banner_1: 'بانر زمني 1',
  homepage_time_banner_2: 'بانر زمني 2',
  homepage_time_carousel_1: 'كروسول زمني 1',
  homepage_time_carousel_2: 'كروسول زمني 2',
};

function Field({ label, children }) {
  return <div><label className="block text-xs text-gray-500 mb-1">{label}</label>{children}</div>;
}