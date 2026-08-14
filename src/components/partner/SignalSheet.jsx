import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createSignal } from '@/lib/partnerApi';

const TYPE_META = {
  kitchen_pressure: { title: 'عندي ضغط', fields: ['expected_duration', 'reason'] },
  sold_out: { title: 'صنف خلص', fields: ['menu_item_id', 'expires_at', 'reason'] },
  surplus: { title: 'عندي كمية', fields: ['menu_item_id', 'quantity', 'expires_at', 'minimum_restaurant_net'] },
  strengthen_item: { title: 'بدي أقوّي وجبة', fields: ['menu_item_id', 'quantity', 'reason'] },
};

const FIELD_LABEL = {
  expected_duration: 'المدة المتوقعة (دقيقة)',
  reason: 'السبب / التفاصيل',
  menu_item_id: 'الصنف',
  quantity: 'الكمية المتوفرة',
  expires_at: 'حتى (وقت العودة/الانتهاء)',
  minimum_restaurant_net: 'أقل صافي للمطعم (₪)',
};

export default function SignalSheet({ open, type, restaurantId, menuItems, onClose, onSubmitted }) {
  const meta = TYPE_META[type] || {};
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!type) return;
    setSubmitting(true); setError(null);
    try {
      const payload = { type };
      for (const f of meta.fields) {
        if (f === 'menu_item_id') payload.menu_item_id = form.menu_item_id || null;
        else if (f === 'quantity' || f === 'expected_duration' || f === 'minimum_restaurant_net') payload[f] = form[f] != null ? Number(form[f]) : null;
        else if (f === 'expires_at') payload.expires_at = form.expires_at ? new Date(form.expires_at).toISOString() : null;
        else payload[f] = form[f] || '';
      }
      await createSignal(restaurantId, payload);
      onSubmitted?.();
      setForm({});
      onClose?.();
    } catch (e) {
      setError(e?.error === 'no_permission' ? 'ما عندك صلاحية' : 'صار خطأ، جرّب مرة ثانية');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <div className="px-1 pb-2">
          <h2 className="font-bold text-base">{meta.title}</h2>
          <p className="text-[11px] text-tamam-text-muted">رح يوصل هالإشارة لفريق TAMAM لتعديل العروض والقدرة التشغيلية.</p>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {meta.fields?.map((f) => (
            <div key={f}>
              <Label className="text-[11px] text-tamam-text-muted mb-1 block">{FIELD_LABEL[f]}</Label>
              {f === 'menu_item_id' ? (
                <select value={form.menu_item_id || ''} onChange={(e) => set('menu_item_id', e.target.value)} className="w-full bg-tamam-surface-low border border-tamam-outline/30 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="">— اختار —</option>
                  {(menuItems || []).map((it) => (<option key={it.id} value={it.id}>{it.name}</option>))}
                </select>
              ) : f === 'reason' ? (
                <Textarea value={form[f] || ''} onChange={(e) => set(f, e.target.value)} rows={2} className="bg-tamam-surface-low border-tamam-outline/30 text-right" />
              ) : f === 'expires_at' ? (
                <Input type="datetime-local" value={form[f] || ''} onChange={(e) => set(f, e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" />
              ) : (
                <Input type="number" value={form[f] || ''} onChange={(e) => set(f, e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" />
              )}
            </div>
          ))}
          {error && <p className="text-error text-xs">{error}</p>}
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={submit} disabled={submitting} className="flex-1 bg-tamam-green text-tamam-ink hover:bg-tamam-green-dark">{submitting ? 'جاري…' : 'إرسال الإشارة'}</Button>
          <Button variant="outline" onClick={() => onClose?.()} className="border-tamam-outline/40 text-tamam-text">إلغاء</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}