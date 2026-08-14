import { useState, useEffect } from 'react';
import { usePartner } from '@/lib/partnerContext';
import { updateRestaurantSettings } from '@/lib/partnerApi';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function PartnerSettings() {
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (activeRestaurant) {
      setForm({
        phone: activeRestaurant.phone || '', whatsapp: activeRestaurant.whatsapp || '', email: activeRestaurant.email || '',
        address: activeRestaurant.address || '', city: activeRestaurant.city || '',
        minimum_order: activeRestaurant.minimum_order ?? '', delivery_fee: activeRestaurant.delivery_fee ?? '',
        preparation_time_min: activeRestaurant.preparation_time_min ?? '', preparation_time_max: activeRestaurant.preparation_time_max ?? '',
        current_status: activeRestaurant.current_status || 'open',
      });
    }
  }, [activeRestaurant]);

  if (!form) return null;
  const set = (k, v) => setForm({ ...form, [k]: v });

  const save = async () => {
    setSaving(true); setMsg(null);
    try { await updateRestaurantSettings(rid, form); setMsg('تم الحفظ'); }
    catch { setMsg('صار خطأ'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="font-bold text-lg">معلومات المطعم</h1>
      <Card title="التواصل">
        <Field label="الهاتف"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
        <Field label="واتساب"><Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
        <Field label="البريد"><Input value={form.email} onChange={(e) => set('email', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
        <Field label="العنوان"><Textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} className="bg-tamam-surface-low border-tamam-outline/30 text-right" /></Field>
        <Field label="المدينة"><Input value={form.city} onChange={(e) => set('city', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
      </Card>
      <Card title="التشغيل">
        <div className="grid grid-cols-2 gap-3">
          <Field label="أقل طلب (₪)"><Input type="number" value={form.minimum_order} onChange={(e) => set('minimum_order', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
          <Field label="رسوم التوصيل (₪)"><Input type="number" value={form.delivery_fee} onChange={(e) => set('delivery_fee', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
          <Field label="تحضير من (دقيقة)"><Input type="number" value={form.preparation_time_min} onChange={(e) => set('preparation_time_min', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
          <Field label="تحضير إلى (دقيقة)"><Input type="number" value={form.preparation_time_max} onChange={(e) => set('preparation_time_max', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
        </div>
        <Field label="الحالة">
          <select value={form.current_status} onChange={(e) => set('current_status', e.target.value)} className="w-full bg-tamam-surface-low border border-tamam-outline/30 rounded-xl px-3 py-2.5 text-sm">
            <option value="open">مفتوح</option><option value="closed">مغلق</option><option value="busy">ضغط</option><option value="temporarily_unavailable">متوقف مؤقت</option>
          </select>
        </Field>
      </Card>
      {msg && <p className="text-center text-xs text-tamam-green-bright">{msg}</p>}
      <Button onClick={save} disabled={saving} className="w-full h-12 bg-tamam-green text-tamam-ink hover:bg-tamam-green-dark">{saving ? 'جاري…' : 'حفظ التغييرات'}</Button>
    </div>
  );
}

function Card({ title, children }) {
  return <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3 space-y-3">{title && <p className="text-xs font-bold text-tamam-text-muted">{title}</p>}{children}</div>;
}
function Field({ label, children }) {
  return <div><Label className="text-[11px] text-tamam-text-muted mb-1 block">{label}</Label>{children}</div>;
}