import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createMenuItem, updateMenuItem } from '@/lib/partnerApi';

export default function MenuItemSheet({ open, restaurantId, item, onClose, onSaved }) {
  const editing = !!item;
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(item ? {
        restaurant_product_name: item.name || '',
        price: item.price ?? '',
        compare_at_price: item.compare_at_price ?? '',
        short_description_ar: item.short_description_ar || '',
        primary_image: item.primary_image || '',
        available: item.available !== false,
        active: item.active !== false,
        preparation_time_override: item.preparation_time_override ?? '',
        available_quantity: item.available_quantity ?? '',
        restaurant_category_name: item.restaurant_category_name || '',
      } : { available: true, active: true });
      setError(null);
    }
  }, [open, item]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.restaurant_product_name?.trim()) { setError('اسم الصنف مطلوب'); return; }
    if (!form.price || Number(form.price) <= 0) { setError('السعر مطلوب'); return; }
    setSaving(true); setError(null);
    try {
      const data = {
        restaurant_product_name: form.restaurant_product_name,
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        short_description_ar: form.short_description_ar,
        primary_image: form.primary_image,
        available: !!form.available,
        active: !!form.active,
        preparation_time_override: form.preparation_time_override ? Number(form.preparation_time_override) : null,
        available_quantity: form.available_quantity !== '' ? Number(form.available_quantity) : null,
        restaurant_category_name: form.restaurant_category_name,
      };
      if (editing) await updateMenuItem(restaurantId, item.id, data);
      else await createMenuItem(restaurantId, data);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.error === 'no_permission' ? 'ما عندك صلاحية لتعديل المنيو' : 'صار خطأ، جرّب مرة ثانية');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <h2 className="font-bold text-base mb-3">{editing ? 'تعديل صنف' : 'إضافة صنف'}</h2>
        <div className="space-y-3 max-h-[62vh] overflow-y-auto">
          <Row label="اسم الصنف"><Input value={form.restaurant_product_name || ''} onChange={(e) => set('restaurant_product_name', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="السعر (₪)"><Input type="number" value={form.price ?? ''} onChange={(e) => set('price', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
            <Row label="سعر قبل الخصم (₪)"><Input type="number" value={form.compare_at_price ?? ''} onChange={(e) => set('compare_at_price', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
          </div>
          <Row label="الفئة"><Input value={form.restaurant_category_name || ''} onChange={(e) => set('restaurant_category_name', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
          <Row label="وصف قصير"><Textarea value={form.short_description_ar || ''} onChange={(e) => set('short_description_ar', e.target.value)} rows={2} className="bg-tamam-surface-low border-tamam-outline/30 text-right" /></Row>
          <Row label="رابط الصورة"><Input value={form.primary_image || ''} onChange={(e) => set('primary_image', e.target.value)} placeholder="https://…" className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="وقت التحضير (دقيقة)"><Input type="number" value={form.preparation_time_override ?? ''} onChange={(e) => set('preparation_time_override', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
            <Row label="الكمية المتوفرة"><Input type="number" value={form.available_quantity ?? ''} onChange={(e) => set('available_quantity', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
          </div>
          <div className="flex items-center justify-between bg-tamam-surface-low rounded-xl px-3 py-2.5">
            <span className="text-sm">متوفر للبيع</span>
            <Switch checked={!!form.available} onCheckedChange={(v) => set('available', v)} />
          </div>
          <div className="flex items-center justify-between bg-tamam-surface-low rounded-xl px-3 py-2.5">
            <span className="text-sm">مفعّل</span>
            <Switch checked={!!form.active} onCheckedChange={(v) => set('active', v)} />
          </div>
          {error && <p className="text-error text-xs">{error}</p>}
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={save} disabled={saving} className="flex-1 bg-tamam-green text-tamam-ink hover:bg-tamam-green-dark">{saving ? 'جاري…' : 'حفظ'}</Button>
          <Button variant="outline" onClick={() => onClose?.()} className="border-tamam-outline/40 text-tamam-text">إلغاء</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <Label className="text-[11px] text-tamam-text-muted mb-1 block">{label}</Label>
      {children}
    </div>
  );
}