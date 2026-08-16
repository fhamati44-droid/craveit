import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { saveMenuCandidates } from '@/lib/partnerApi';

export default function PartnerMenuAddReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const { session_id, source_type, selected } = location.state || {};
  const [forms, setForms] = useState(() => {
    const map = {};
    (selected || []).forEach((p, i) => {
      map[p.id] = {
        name: p.name_ar || p.name || '', price: '', description: p.description || '', image: p.image_url || '', available: true, prep_time: '', category: p.category_name || '', campaign_permission: true, max_daily_quantity: '',
        // Optional partner-provided operational facts (section 13) — additive, no existing field touched
        vertical_code: '', weak_item: false, late_night_fit: false, quiet_hours: '', quiet_days: '', surplus_risk: false,
        available_quantity: '', max_campaign_quantity: '',
        supports_classic: true, supports_mix: true, supports_plus: false,
        compatible_side_skus: '', compatible_drink_skus: '', compatible_addon_skus: '',
        mood_slugs: '', recommended_time_windows: '', recommended_days: '',
      };
    });
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const list = selected || [];
  const readyCount = useMemo(() => list.filter((p) => { const f = forms[p.id] || {}; return f.name && f.price && Number(f.price) > 0 && f.image; }).length, [list, forms]);

  if (!list.length || !rid) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-tamam-text font-bold">ما في أصناف مختارة للمراجعة.</p>
        <button onClick={() => navigate('/partner/menu/add/catalog')} className="mt-4 h-12 px-5 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm">اختار من الكتالوج</button>
      </div>
    );
  }

  const set = (pid, k, v) => setForms((prev) => ({ ...prev, [pid]: { ...prev[pid], [k]: v } }));

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const items = list.map((p) => {
        const f = forms[p.id] || {};
        return {
          mapped_master_catalog_product_id: p.id, source_reference: `catalog:${p.id}`,
          generic_name: p.name_ar || p.name, generic_description: p.description, generic_category: p.category_name, generic_image: p.image_url,
          name: f.name, price: f.price ? Number(f.price) : null, description: f.description, image: f.image, available: f.available,
          prep_time: f.prep_time ? Number(f.prep_time) : null, category: f.category, campaign_permission: f.campaign_permission,
          max_daily_quantity: f.max_daily_quantity ? Number(f.max_daily_quantity) : null,
          rights_status: 'approved', image_source_type: 'tamam_owned',
          // Optional partner-provided operational facts (section 13)
          vertical_code: f.vertical_code || null,
          operational_facts_json: JSON.stringify({
            weak_item: f.weak_item, late_night_fit: f.late_night_fit, quiet_hours: f.quiet_hours, quiet_days: f.quiet_days, surplus_risk: f.surplus_risk,
            available_quantity: f.available_quantity ? Number(f.available_quantity) : null, max_campaign_quantity: f.max_campaign_quantity ? Number(f.max_campaign_quantity) : null,
            supports_classic: f.supports_classic, supports_mix: f.supports_mix, supports_plus: f.supports_plus,
            compatible_side_skus: splitList(f.compatible_side_skus), compatible_drink_skus: splitList(f.compatible_drink_skus), compatible_addon_skus: splitList(f.compatible_addon_skus),
            mood_slugs: splitList(f.mood_slugs), recommended_time_windows: splitList(f.recommended_time_windows), recommended_days: splitList(f.recommended_days),
          }),
        };
      });
      await saveMenuCandidates(rid, null, { session_id, source_type: source_type || 'tamam_master_catalog', items });
      navigate('/partner/menu/drafts', { replace: true });
    } catch (e) { setError(e?.error === 'no_permission' ? 'ما عندك صلاحية' : 'ما قدرنا نحفظ المسودات. جرّب مرة ثانية.'); setSaving(false); }
  };

  return (
    <div className="pb-32" dir="rtl">
      <div className="sticky top-0 z-20 bg-tamam-bg/95 backdrop-blur-xl border-b border-tamam-outline/20 px-3 py-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="w-10 h-10 flex items-center justify-center rounded-xl bg-tamam-surface"><span className="material-symbols-outlined text-tamam-text text-[22px]">arrow_forward</span></button>
        <div className="flex-1"><h1 className="font-bold text-sm text-tamam-text">راجع الأصناف المختارة</h1><p className="text-[10px] text-tamam-text-muted">{list.length} صنف · {readyCount} جاهز للنشر</p></div>
      </div>

      <div className="px-4 mt-3 space-y-3">
        <p className="text-[11px] text-tamam-text-muted leading-snug bg-tamam-surface-low rounded-xl p-2.5">حدّد اسم مطعمك، السعر، والصورة لكل صنف. الأصناف رح تتحفظ كمسودات، وتقدر تنشرها بعدين من صفحة المراجعة.</p>
        {list.map((p) => {
          const f = forms[p.id] || {};
          const ready = f.name && f.price && Number(f.price) > 0 && f.image;
          const open = expanded === p.id;
          return (
            <div key={p.id} className={`bg-tamam-surface-low rounded-2xl border ${ready ? 'border-tamam-green/40' : 'border-tamam-error/30'} overflow-hidden`}>
              <button onClick={() => setExpanded(open ? null : p.id)} className="w-full flex items-center gap-3 p-3 text-right">
                <div className="w-14 h-14 rounded-xl bg-tamam-surface overflow-hidden shrink-0 flex items-center justify-center">{f.image ? <img src={f.image} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-tamam-text-muted/40 text-[20px]">fastfood</span>}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-tamam-text truncate">{f.name || 'بدون اسم'}</p>
                  <p className="text-[11px] text-tamam-text-muted">{f.category || '—'} · {f.price ? `${Math.round(f.price)} ₪` : 'بدون سعر'}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ready ? 'bg-tamam-green/15 text-tamam-green-bright' : 'bg-tamam-error/15 text-tamam-error'}`}>{ready ? 'جاهز' : 'ناقص'}</span>
                <span className="material-symbols-outlined text-tamam-text-muted text-[20px]">{open ? 'expand_less' : 'expand_more'}</span>
              </button>
              {open && (
                <div className="px-3 pb-3 space-y-2.5 border-t border-tamam-outline/20 pt-3">
                  <Field label="اسم الصنف عندك (مطلوب)"><input value={f.name} onChange={(e) => set(p.id, 'name', e.target.value)} placeholder="مثلاً: برجر كلاسيك" className="ipt" /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="السعر ₪ (مطلوب)"><input value={f.price} onChange={(e) => set(p.id, 'price', e.target.value)} inputMode="decimal" placeholder="0" className="ipt" /></Field>
                    <Field label="التصنيف"><input value={f.category} onChange={(e) => set(p.id, 'category', e.target.value)} placeholder="برجر" className="ipt" /></Field>
                  </div>
                  <Field label="الوصف"><textarea value={f.description} onChange={(e) => set(p.id, 'description', e.target.value)} rows={2} className="ipt resize-none" /></Field>
                  <Field label="رابط الصورة (مطلوب)"><input value={f.image} onChange={(e) => set(p.id, 'image', e.target.value)} placeholder="https://…" className="ipt" dir="ltr" /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="وقت التحضير (دقيقة)"><input value={f.prep_time} onChange={(e) => set(p.id, 'prep_time', e.target.value)} inputMode="numeric" placeholder="اختياري" className="ipt" /></Field>
                    <Field label="أقصى كمية يومية"><input value={f.max_daily_quantity} onChange={(e) => set(p.id, 'max_daily_quantity', e.target.value)} inputMode="numeric" placeholder="اختياري" className="ipt" /></Field>
                  </div>
                  <label className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[12px] text-tamam-text">متوفر للطلب</span>
                    <input type="checkbox" checked={f.available} onChange={(e) => set(p.id, 'available', e.target.checked)} className="w-5 h-5 accent-tamam-green" />
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-tamam-text">سماح لتمام تستخدمه بالحملات</span>
                    <input type="checkbox" checked={f.campaign_permission} onChange={(e) => set(p.id, 'campaign_permission', e.target.checked)} className="w-5 h-5 accent-tamam-green" />
                  </label>
                  {!f.image && <p className="text-[10px] text-tamam-error flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">warning</span>الصورة محتاجة تأكيد قبل النشر — ارفع صورة مطعمك أو استخدم صورة الكتالوج.</p>}

                  <OperationalFields form={f} set={(k, v) => set(p.id, k, v)} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-16 inset-x-0 z-30 pointer-events-none">
        <div className="max-w-[430px] mx-auto px-3 flex justify-center">
          <div className="pointer-events-auto flex gap-2">
            <button onClick={save} disabled={saving} className="h-12 px-5 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform flex items-center gap-1">{saving ? 'جاري الحفظ…' : 'احفظ كمسودة'}</button>
            <button onClick={() => navigate(-1)} className="h-12 px-4 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">إلغاء</button>
          </div>
        </div>
      </div>
      {error && <div className="fixed bottom-32 inset-x-0 text-center"><span className="bg-tamam-error/20 text-tamam-error text-xs font-bold px-3 py-1.5 rounded-full">{error}</span></div>}
      <style>{`.ipt{width:100%;height:44px;background:#181D1A;border:1px solid rgba(64,73,60,.3);border-radius:12px;padding:8px 12px;font-size:14px;color:#DFE3E0;outline:none}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <span className="block text-[11px] text-tamam-text-muted mb-1">{label}</span>
      {children}
    </div>
  );
}

function splitList(v) {
  if (!v) return [];
  return String(v).split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-2 bg-tamam-surface rounded-xl px-3 py-2">
      <span className="text-[11px] text-tamam-text">{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="w-5 h-5 accent-tamam-green" />
    </label>
  );
}

function OperationalFields({ form, set }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 rounded-xl bg-tamam-surface-low/60 border border-tamam-outline/20 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2 text-right">
        <span className="text-[11px] font-bold text-tamam-text-muted">بيانات تشغيلية اختيارية</span>
        <span className="material-symbols-outlined text-tamam-text-muted text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-tamam-outline/20 pt-2.5">
          <Field label="نوع العمل (vertical code)"><input value={form.vertical_code} onChange={(e) => set('vertical_code', e.target.value)} placeholder="SHAWARMA, BURGER..." className="ipt" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Check label="صنف ضعيف الطلب" checked={form.weak_item} onChange={(e) => set('weak_item', e.target.checked)} />
            <Check label="يناسب الليل" checked={form.late_night_fit} onChange={(e) => set('late_night_fit', e.target.checked)} />
            <Check label="خطر فائض" checked={form.surplus_risk} onChange={(e) => set('surplus_risk', e.target.checked)} />
            <Check label="Classic" checked={form.supports_classic} onChange={(e) => set('supports_classic', e.target.checked)} />
            <Check label="Mix" checked={form.supports_mix} onChange={(e) => set('supports_mix', e.target.checked)} />
            <Check label="Plus" checked={form.supports_plus} onChange={(e) => set('supports_plus', e.target.checked)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="الكمية المتوفرة"><input value={form.available_quantity} onChange={(e) => set('available_quantity', e.target.value)} inputMode="numeric" className="ipt" /></Field>
            <Field label="أقصى كمية للحملة"><input value={form.max_campaign_quantity} onChange={(e) => set('max_campaign_quantity', e.target.value)} inputMode="numeric" className="ipt" /></Field>
          </div>
          <Field label="ساعات هدوء (مفصولة بفواصل)"><input value={form.quiet_hours} onChange={(e) => set('quiet_hours', e.target.value)} placeholder="14:00-17:00" className="ipt" dir="ltr" /></Field>
          <Field label="أيام هدوء (أرقام 0-6)"><input value={form.quiet_days} onChange={(e) => set('quiet_days', e.target.value)} placeholder="1,2,3" className="ipt" dir="ltr" /></Field>
          <Field label="أطباق جانبية متوافقة (SKU)"><input value={form.compatible_side_skus} onChange={(e) => set('compatible_side_skus', e.target.value)} className="ipt" dir="ltr" /></Field>
          <Field label="مشروبات متوافقة (SKU)"><input value={form.compatible_drink_skus} onChange={(e) => set('compatible_drink_skus', e.target.value)} className="ipt" dir="ltr" /></Field>
          <Field label="إضافات متوافقة (SKU)"><input value={form.compatible_addon_skus} onChange={(e) => set('compatible_addon_skus', e.target.value)} className="ipt" dir="ltr" /></Field>
          <Field label="Moods (مفصولة بفواصل)"><input value={form.mood_slugs} onChange={(e) => set('mood_slugs', e.target.value)} placeholder="comfort,energetic" className="ipt" dir="ltr" /></Field>
          <Field label="أوقات موصى بها"><input value={form.recommended_time_windows} onChange={(e) => set('recommended_time_windows', e.target.value)} placeholder="lunch,dinner" className="ipt" dir="ltr" /></Field>
          <Field label="أيام موصى بها"><input value={form.recommended_days} onChange={(e) => set('recommended_days', e.target.value)} placeholder="0,5,6" className="ipt" dir="ltr" /></Field>
        </div>
      )}
    </div>
  );
}