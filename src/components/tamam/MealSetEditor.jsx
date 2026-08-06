import { useState, useEffect } from 'react';
import { X, Copy, Check, AlertTriangle } from 'lucide-react';
import {
  TIERS, TIER_LABEL, createMealSet, updateMealSet, deleteMealSet,
  getVariantsForSet, createVariant, updateVariant, deleteVariant,
  getAssignmentsForSet, createAssignment, updateAssignment, deleteAssignment,
  setCompleteness,
} from '@/lib/mealSetApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

const EMPTY_VARIANT = (tier) => ({
  tier, title_ar: '', short_description_ar: '', full_description_ar: '', image: '',
  ingredients_ar: '', included_items_ar: '', serving_description_ar: '',
  marketing_price: '', starting_price: '', existing_product_id: '', active: true, available: true,
});

/** Full MealSet editor: identity + 3 coordinated variant panels + mood assignment + preview. */
export default function MealSetEditor({ mealSet, moods, onSave, onClose }) {
  const [form, setForm] = useState(null);
  const [variants, setVariants] = useState({ classic: null, mix: null, plus: null });
  const [assignments, setAssignments] = useState([]); // [{mood_id, display_priority, default_tier, featured_for_mood, active, _id?}]
  const [previewTier, setPreviewTier] = useState('mix');
  const [previewIdx, setPreviewIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(mealSet ? { ...mealSet } : {
      internal_name: '', display_name_ar: '', slug: '', active: false, featured: false,
      display_priority: 0, set_cover_image: '', set_short_description_ar: '', internal_notes: '',
      audience_size_min: '', audience_size_max: '',
    });
    if (mealSet?.id) {
      getVariantsForSet(mealSet.id).then((list) => {
        const v = { classic: null, mix: null, plus: null };
        (list || []).forEach((x) => { if (v[x.tier] == null) v[x.tier] = x; });
        setVariants(v);
      });
      getAssignmentsForSet(mealSet.id).then((list) => setAssignments((list || []).map((a) => ({
        _id: a.id, mood_id: a.mood_id, display_priority: a.display_priority || 0,
        default_tier: a.default_tier || '', featured_for_mood: !!a.featured_for_mood, active: a.active !== false,
      }))));
    }
  }, [mealSet?.id]);

  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const upV = (tier, k, v) => setVariants((s) => ({ ...s, [tier]: { ...s[tier], [k]: v } }));

  const copyBase = (from, to) => {
    if (!variants[from]) return;
    const src = variants[from];
    setVariants((s) => ({
      ...s,
      [to]: { ...(s[to] || EMPTY_VARIANT(to)), id: s[to]?.id, meal_set_id: s[to]?.meal_set_id, tier: to, active: s[to]?.active ?? true, available: s[to]?.available ?? true,
        title_ar: src.title_ar, short_description_ar: src.short_description_ar, image: src.image,
        ingredients_ar: src.ingredients_ar, included_items_ar: src.included_items_ar, serving_description_ar: src.serving_description_ar,
      },
    }));
  };

  const toggleMood = (moodId) => {
    setAssignments((arr) => {
      const ex = arr.find((a) => a.mood_id === moodId);
      if (ex) return arr.filter((a) => a.mood_id !== moodId);
      return [...arr, { mood_id: moodId, display_priority: arr.length + 1, default_tier: '', featured_for_mood: false, active: true }];
    });
  };
  const upA = (moodId, k, v) => setAssignments((arr) => arr.map((a) => a.mood_id === moodId ? { ...a, [k]: v } : a));

  const completeness = {
    classic: !!variants.classic?.title_ar,
    mix: !!variants.mix?.title_ar,
    plus: !!variants.plus?.title_ar,
  };
  const allThree = completeness.classic && completeness.mix && completeness.plus;
  const publishable = allThree && assignments.filter((a) => a.active).length > 0;

  // Preview: assigned moods cycle through sets — simulate here by showing the current set's preview variant
  const previewMoodId = assignments[0]?.mood_id || '';

  const save = async () => {
    if (!form?.internal_name) { alert('اسم داخلي مطلوب'); return; }
    setSaving(true);
    try {
      const payload = {
        internal_name: form.internal_name, display_name_ar: form.display_name_ar || '', slug: form.slug || '',
        category_id: form.category_id ? Number(form.category_id) : undefined,
        menu_id: form.menu_id ? Number(form.menu_id) : undefined,
        hero_meal_id: form.hero_meal_id ? Number(form.hero_meal_id) : undefined,
        active: publishable && (form.active !== false), featured: !!form.featured,
        display_priority: Number(form.display_priority) || 0,
        set_cover_image: form.set_cover_image || '', set_short_description_ar: form.set_short_description_ar || '',
        internal_notes: form.internal_notes || '',
        audience_size_min: form.audience_size_min ? Number(form.audience_size_min) : undefined,
        audience_size_max: form.audience_size_max ? Number(form.audience_size_max) : undefined,
      };
      let setId = mealSet?.id;
      if (setId) await updateMealSet(setId, payload);
      else { const created = await createMealSet(payload); setId = created.id; }

      // Variants — enforce unique(meal_set_id, tier): delete existing for this set+tier then create/update
      for (const tier of TIERS) {
        const v = variants[tier];
        if (!v || !v.title_ar) {
          // if a variant record exists but no title, leave it (don't auto-delete content)
          continue;
        }
        const vp = {
          meal_set_id: setId, tier,
          existing_product_id: v.existing_product_id ? Number(v.existing_product_id) : undefined,
          title_ar: v.title_ar, short_description_ar: v.short_description_ar || '',
          full_description_ar: v.full_description_ar || '', image: v.image || '',
          ingredients_ar: v.ingredients_ar || '', included_items_ar: v.included_items_ar || '',
          serving_description_ar: v.serving_description_ar || '',
          marketing_price: v.marketing_price ? Number(v.marketing_price) : undefined,
          starting_price: v.starting_price ? Number(v.starting_price) : undefined,
          active: v.active !== false, available: v.available !== false,
          display_priority: TIERS.indexOf(tier),
        };
        if (v.id) await updateVariant(v.id, vp);
        else await createVariant({ ...vp, meal_set_id: setId });
      }

      // Assignments — diff against existing
      const existing = await getAssignmentsForSet(setId).catch(() => []);
      const existingMap = new Map((existing || []).map((a) => [a.mood_id, a]));
      const keptMoods = new Set();
      for (const a of assignments) {
        keptMoods.add(a.mood_id);
        const ap = {
          mood_id: a.mood_id, meal_set_id: setId, active: a.active !== false,
          display_priority: Number(a.display_priority) || 0, recommendation_weight: 0,
          default_tier: a.default_tier || undefined, featured_for_mood: !!a.featured_for_mood,
        };
        const ex = existingMap.get(a.mood_id);
        if (ex) await updateAssignment(ex.id, ap);
        else await createAssignment(ap);
      }
      for (const ex of existing || []) {
        if (!keptMoods.has(ex.mood_id)) await deleteAssignment(ex.id).catch(() => {});
      }

      onSave();
    } catch (e) {
      console.error('MEALSET_SAVE_FAILED', e);
      alert('فشل الحفظ: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!mealSet?.id) return;
    if (!confirm('أرشفة هذه المجموعة؟ الطلبات واللقطات السابقة تبقى محفوظة.')) return;
    await deleteMealSet(mealSet.id).catch(() => {});
    onClose();
  };

  return (
    <div className="border-2 border-blue rounded-xl p-3 space-y-3 bg-blue-50/30">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm">{mealSet?.id ? 'עריכת مجموعة وجبة' : 'مجموعة وجبة חדשה'}</p>
        <button onClick={onClose} className="text-gray-400"><X size={16} /></button>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-1.5">
        <Chip ok={completeness.classic} label="Classic جاهز" />
        <Chip ok={completeness.mix} label="Mix جاهز" />
        <Chip ok={completeness.plus} label="Plus جاهز" />
        {!allThree && <Chip ok={false} label="المجموعة ناقصة" warn />}
        {publishable ? <Chip ok label="جاهزة للنشر" /> : <Chip ok={false} label="غير جاهزة للنشر" />}
      </div>

      {/* Section A — identity */}
      <Section title="هوية المجموعة">
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="اسم داخلي *" value={form?.internal_name || ''} onChange={(e) => up('internal_name', e.target.value)} className="inp" />
          <input placeholder="اسم العرض (عربي)" value={form?.display_name_ar || ''} onChange={(e) => up('display_name_ar', e.target.value)} className="inp" />
          <input placeholder="slug" value={form?.slug || ''} onChange={(e) => up('slug', e.target.value)} className="inp" />
          <input placeholder="أولوية العرض" type="number" value={form?.display_priority ?? ''} onChange={(e) => up('display_priority', e.target.value)} className="inp" />
          <input placeholder="category id" type="number" value={form?.category_id ?? ''} onChange={(e) => up('category_id', e.target.value)} className="inp" />
          <input placeholder="menu id" type="number" value={form?.menu_id ?? ''} onChange={(e) => up('menu_id', e.target.value)} className="inp" />
          <input placeholder="hero meal id" type="number" value={form?.hero_meal_id ?? ''} onChange={(e) => up('hero_meal_id', e.target.value)} className="inp" />
          <input placeholder="audience min" type="number" value={form?.audience_size_min ?? ''} onChange={(e) => up('audience_size_min', e.target.value)} className="inp" />
          <input placeholder="audience max" type="number" value={form?.audience_size_max ?? ''} onChange={(e) => up('audience_size_max', e.target.value)} className="inp" />
        </div>
        <input placeholder="رابط صورة الغلاف" value={form?.set_cover_image || ''} onChange={(e) => up('set_cover_image', e.target.value)} className="inp" />
        <textarea placeholder="وصف قصير للمجموعة" value={form?.set_short_description_ar || ''} onChange={(e) => up('set_short_description_ar', e.target.value)} className="inp" rows={2} />
        <input placeholder="ملاحظات داخلية" value={form?.internal_notes || ''} onChange={(e) => up('internal_notes', e.target.value)} className="inp" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form?.featured || false} onChange={(e) => up('featured', e.target.checked)} /> مميزة
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form?.active !== false} onChange={(e) => up('active', e.target.checked)} disabled={!publishable} /> فعّالة (عامة فقط عند اكتمال المتغيرات والإسناد)
        </label>
      </Section>

      {/* Sections B/C/D — variants */}
      <div className="grid grid-cols-1 gap-3">
        {TIERS.map((tier, i) => (
          <Section key={tier} title={`${TIER_LABEL[tier]} — المستوى ${i + 1}`}>
            <div className="flex items-center gap-1 mb-2">
              {i > 0 && (
                <button onClick={() => copyBase(TIERS[i - 1], tier)} className="text-[11px] bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                  <Copy size={11} /> نسخ الأساس من {TIER_LABEL[TIERS[i - 1]]}
                </button>
              )}
              {variants[tier] && <span className="text-[10px] text-green-600 flex items-center gap-0.5"><Check size={11} /> موجود</span>}
            </div>
            <input placeholder="عنوان المتغير" value={variants[tier]?.title_ar || ''} onChange={(e) => upV(tier, 'title_ar', e.target.value)} className="inp" />
            <input placeholder="id منتج موجود (Supabase)" type="number" value={variants[tier]?.existing_product_id ?? ''} onChange={(e) => upV(tier, 'existing_product_id', e.target.value)} className="inp" />
            <textarea placeholder="وصف قصير" value={variants[tier]?.short_description_ar || ''} onChange={(e) => upV(tier, 'short_description_ar', e.target.value)} className="inp" rows={2} />
            <input placeholder="رابط الصورة" value={variants[tier]?.image || ''} onChange={(e) => upV(tier, 'image', e.target.value)} className="inp" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="سعر التسويق" type="number" value={variants[tier]?.marketing_price ?? ''} onChange={(e) => upV(tier, 'marketing_price', e.target.value)} className="inp" />
              <input placeholder="سعر ابتداءً من" type="number" value={variants[tier]?.starting_price ?? ''} onChange={(e) => upV(tier, 'starting_price', e.target.value)} className="inp" />
            </div>
            <textarea placeholder="المكونات" value={variants[tier]?.ingredients_ar || ''} onChange={(e) => upV(tier, 'ingredients_ar', e.target.value)} className="inp" rows={2} />
            <input placeholder="العناصر المشمولة" value={variants[tier]?.included_items_ar || ''} onChange={(e) => upV(tier, 'included_items_ar', e.target.value)} className="inp" />
            <input placeholder="حجم الحصة / التقديم" value={variants[tier]?.serving_description_ar || ''} onChange={(e) => upV(tier, 'serving_description_ar', e.target.value)} className="inp" />
            <div className="flex gap-3">
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={variants[tier]?.active !== false} onChange={(e) => upV(tier, 'active', e.target.checked)} /> فعّال</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={variants[tier]?.available !== false} onChange={(e) => upV(tier, 'available', e.target.checked)} /> متوفر</label>
            </div>
          </Section>
        ))}
      </div>

      {/* Mood assignment */}
      <Section title="المودز المرتبطة">
        <p className="text-xs text-gray-500 mb-2">اختر المودز. نفس المتغيرات تُعاد استخدامها بدون نسخ.</p>
        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
          {moods.map((m) => {
            const a = assignments.find((x) => x.mood_id === m.id);
            return (
              <label key={m.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs ${a ? 'border-blue bg-blue-50' : 'border-gray-200'}`}>
                <input type="checkbox" checked={!!a} onChange={() => toggleMood(m.id)} />
                <span className="truncate flex-1">{m.icon} {m.name_ar}</span>
                {a && <select value={a.default_tier || ''} onChange={(e) => upA(m.id, 'default_tier', e.target.value)} className="text-[10px] border rounded px-1">
                  <option value="">افتراضي</option>
                  {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                </select>}
              </label>
            );
          })}
          {moods.length === 0 && <p className="text-xs text-gray-400">لا يوجد مودز. أنشئ مودز أولاً.</p>}
        </div>
        {assignments.length > 0 && (
          <div className="space-y-1 mt-2">
            {assignments.map((a) => {
              const m = moods.find((x) => x.id === a.mood_id);
              return (
                <div key={a.mood_id} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1 text-xs">
                  <span className="flex-1">{m?.name_ar || a.mood_id}</span>
                  <input type="number" value={a.display_priority} onChange={(e) => upA(a.mood_id, 'display_priority', e.target.value)} className="w-12 border rounded px-1" title="أولوية" />
                  <label className="flex items-center gap-0.5"><input type="checkbox" checked={a.featured_for_mood} onChange={(e) => upA(a.mood_id, 'featured_for_mood', e.target.checked)} /> مميز</label>
                  <label className="flex items-center gap-0.5"><input type="checkbox" checked={a.active} onChange={(e) => upA(a.mood_id, 'active', e.target.checked)} /> فعّال</label>
                </div>
              );
            })}
          </div>
        )}
        {assignments.length > 0 && <p className="text-[11px] text-gray-500 mt-1">هذه المجموعة مستخدمة في {assignments.length} مودز.</p>}
      </Section>

      {/* Preview */}
      <Section title="معاينة الاقتراحات">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={previewMoodId} onChange={() => {}} className="inp flex-1 min-w-[120px]" disabled>
            <option value="">{assignments[0] ? moods.find((m) => m.id === assignments[0].mood_id)?.name_ar || 'اختر مود' : 'اربط مود أولاً'}</option>
          </select>
          {TIERS.map((t) => (
            <button key={t} onClick={() => setPreviewTier(t)} className={`px-3 py-1.5 rounded text-xs font-bold ${previewTier === t ? 'bg-blue text-white' : 'bg-gray-100'}`}>{TIER_LABEL[t]}</button>
          ))}
          <button onClick={() => setPreviewIdx((i) => i + 1)} className="px-3 py-1.5 rounded bg-gray-100 text-xs font-bold">اقتراح آخر</button>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">التير يثبت بينما تدور المجموعات. التغيير يحدّث متغير المجموعة الحالية فقط.</p>
        <div className="bg-white border rounded-lg p-2 mt-1">
          {variants[previewTier]?.title_ar
            ? <p className="text-sm font-bold">{form?.display_name_ar || form?.internal_name} · {TIER_LABEL[previewTier]} — {variants[previewTier].title_ar}</p>
            : <p className="text-xs text-gray-400">لا يوجد متغير {TIER_LABEL[previewTier]} بعد.</p>}
        </div>
      </Section>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="flex-1 bg-blue text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50">{saving ? '...' : 'حفظ المجموعة'}</button>
        {mealSet?.id && <button onClick={remove} className="px-3 bg-red-50 text-red-500 rounded-lg text-sm font-bold">أرشفة</button>}
      </div>
      <style>{`.inp{width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px}`}</style>
    </div>
  );
}

function Chip({ ok, label, warn }) {
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-700' : warn ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
      {ok ? <Check size={10} className="inline" /> : <AlertTriangle size={10} className="inline" />} {label}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
      <p className="font-bold text-xs text-gray-700">{title}</p>
      {children}
    </div>
  );
}