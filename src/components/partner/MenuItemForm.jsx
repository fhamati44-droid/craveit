import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createMenuItem, updateMenuItem, saveGuardrail } from '@/lib/partnerApi';
import Toggle from '@/components/partner/Toggle';

export default function MenuItemForm({ restaurantId, item, guardrail, onSaved, onCancel }) {
  const editing = !!item;
  const [form, setForm] = useState(() => ({
    restaurant_product_name: item?.restaurant_product_name || item?.name || '',
    restaurant_sku: item?.restaurant_sku || '',
    restaurant_category_name: item?.restaurant_category_name || '',
    short_description_ar: item?.short_description_ar || item?.customer_visible_description || '',
    ingredients_ar: item?.ingredients_ar || '',
    price: item?.price ?? '',
    primary_image: item?.primary_image || '',
    available: item ? item.available !== false : true,
    preparation_time_override: item?.preparation_time_override ?? '',
    available_quantity: item?.available_quantity ?? '',
    minimum_customer_offer_price: guardrail?.minimum_customer_offer_price ?? '',
    minimum_restaurant_net: guardrail?.minimum_restaurant_net ?? '',
    pickup_allowed: guardrail ? guardrail.pickup_allowed !== false : true,
    delivery_allowed: guardrail ? guardrail.delivery_allowed !== false : true,
    guardrail_id: guardrail?.id || null,
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      set('primary_image', res?.file_url || '');
    } catch { setError('ما قدرنا نرفع الصورة'); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.restaurant_product_name?.trim()) { setError('اسم الوجبة مطلوب'); return; }
    if (!form.price || Number(form.price) <= 0) { setError('السعر مطلوب'); return; }
    setSaving(true); setError(null);
    try {
      const menuData = {
        restaurant_product_name: form.restaurant_product_name,
        restaurant_sku: form.restaurant_sku,
        restaurant_category_name: form.restaurant_category_name,
        short_description_ar: form.short_description_ar,
        ingredients_ar: form.ingredients_ar,
        price: Number(form.price),
        primary_image: form.primary_image,
        available: !!form.available,
        preparation_time_override: form.preparation_time_override ? Number(form.preparation_time_override) : null,
        available_quantity: form.available_quantity !== '' ? Number(form.available_quantity) : null,
      };
      let itemId = item?.id;
      if (editing) await updateMenuItem(restaurantId, item.id, menuData);
      else { const r = await createMenuItem(restaurantId, menuData); itemId = r?.id; }

      const hasGuardrail = form.minimum_customer_offer_price !== '' || form.minimum_restaurant_net !== '';
      if (itemId && hasGuardrail) {
        await saveGuardrail(restaurantId, {
          id: form.guardrail_id || undefined,
          menu_item_id: itemId,
          normal_price: Number(form.price),
          minimum_customer_offer_price: form.minimum_customer_offer_price !== '' ? Number(form.minimum_customer_offer_price) : null,
          minimum_restaurant_net: form.minimum_restaurant_net !== '' ? Number(form.minimum_restaurant_net) : null,
          pickup_allowed: form.pickup_allowed,
          delivery_allowed: form.delivery_allowed,
          status: 'active',
        }).catch(() => {});
      }
      onSaved?.(itemId);
    } catch (e) {
      setError(e?.error === 'no_permission' ? 'ما عندك صلاحية لتعديل المنيو' : 'صار خطأ، جرّب مرة ثانية');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => fileRef.current?.click()} className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-tamam-outline/50 bg-tamam-surface-low flex flex-col items-center justify-center gap-2 overflow-hidden relative">
        {form.primary_image ? (
          <img src={form.primary_image} alt="" className="w-full h-full object-cover" />
        ) : (
          <>
            <span className="material-symbols-outlined text-tamam-text-muted text-[32px]">add_a_photo</span>
            <span className="text-tamam-text-muted text-xs">{uploading ? 'جاري الرفع…' : 'اضغط لرفع صورة شهية للوجبة'}</span>
          </>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <Field label="اسم الوجبة"><Input value={form.restaurant_product_name} onChange={(e) => set('restaurant_product_name', e.target.value)} placeholder="مثال: برجر دجاج كلاسيك" className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="رمز الصنف (SKU)"><Input value={form.restaurant_sku} onChange={(e) => set('restaurant_sku', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
        <Field label="الفئة"><Input value={form.restaurant_category_name} onChange={(e) => set('restaurant_category_name', e.target.value)} placeholder="مثال: برجر" className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
      </div>
      <Field label="الوصف"><Textarea value={form.short_description_ar} onChange={(e) => set('short_description_ar', e.target.value)} rows={2} className="bg-tamam-surface-low border-tamam-outline/30 text-right" /></Field>
      <Field label="المكونات (افصل بفاصلة)"><Textarea value={form.ingredients_ar} onChange={(e) => set('ingredients_ar', e.target.value)} rows={2} placeholder="شريحة لحم، جبن، خس…" className="bg-tamam-surface-low border-tamam-outline/30 text-right" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="السعر العادي (₪)"><Input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
        <Field label="وقت التحضير (دقيقة)"><Input type="number" value={form.preparation_time_override} onChange={(e) => set('preparation_time_override', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
      </div>
      <Field label="الكمية المتوفرة"><Input type="number" value={form.available_quantity} onChange={(e) => set('available_quantity', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
      <div className="flex items-center justify-between bg-tamam-surface-low rounded-xl px-3 py-3">
        <div><p className="text-sm font-medium text-tamam-text">متاح للطلب</p><p className="text-[11px] text-tamam-text-muted">إظهار الوجبة في القائمة للعملاء</p></div>
        <Toggle checked={!!form.available} onChange={(v) => set('available', v)} />
      </div>

      <div className="bg-tamam-surface-low rounded-2xl p-4 border-r-4 border-tamam-outline/40 space-y-3">
        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-tamam-green-bright text-[20px]">tune</span><div><p className="text-sm font-bold text-tamam-text">إعدادات TAMAM التجارية (اختياري)</p><p className="text-[11px] text-tamam-text-muted">حدد حدود العروض لتمكين TAMAM من ترويج الوجبة بذكاء.</p></div></div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="أدنى سعر عرض (₪)"><Input type="number" value={form.minimum_customer_offer_price} onChange={(e) => set('minimum_customer_offer_price', e.target.value)} placeholder="0.00" className="bg-tamam-surface border-tamam-outline/30" /></Field>
          <Field label="الحد الأدنى للصافي للمطعم (₪)"><Input type="number" value={form.minimum_restaurant_net} onChange={(e) => set('minimum_restaurant_net', e.target.value)} placeholder="0.00" className="bg-tamam-surface border-tamam-outline/30" /></Field>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs text-tamam-text"><input type="checkbox" checked={!!form.pickup_allowed} onChange={(e) => set('pickup_allowed', e.target.checked)} /> استلام</label>
          <label className="flex items-center gap-2 text-xs text-tamam-text"><input type="checkbox" checked={!!form.delivery_allowed} onChange={(e) => set('delivery_allowed', e.target.checked)} /> توصيل</label>
        </div>
      </div>

      {error && <p className="text-tamam-error text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} className="flex-1 bg-tamam-green-bright text-tamam-ink hover:bg-tamam-green">{saving ? 'جاري…' : 'حفظ الوجبة'}</Button>
        <Button variant="outline" onClick={onCancel} className="border-tamam-outline/40 text-tamam-text">إلغاء</Button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><Label className="text-[11px] text-tamam-text-muted mb-1 block">{label}</Label>{children}</div>;
}