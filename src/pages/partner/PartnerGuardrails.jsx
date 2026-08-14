import { useState, useEffect } from 'react';
import { usePartner } from '@/lib/partnerContext';
import { listGuardrails, saveGuardrail } from '@/lib/partnerApi';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function PartnerGuardrails() {
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ status: 'active', pickup_allowed: true, delivery_allowed: true });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!rid) return;
    setLoading(true);
    listGuardrails(rid).then(setList).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [rid]);

  const save = async () => {
    setSaving(true);
    try {
      await saveGuardrail(rid, { ...form, restaurant_id: rid });
      setOpen(false);
      setForm({ status: 'active', pickup_allowed: true, delivery_allowed: true });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-lg">حدود الشغل</h1>
        <button onClick={() => setOpen(true)} className="bg-tamam-green text-tamam-ink text-xs font-bold px-3 py-2 rounded-xl">إضافة حد</button>
      </div>
      <p className="text-[11px] text-tamam-text-muted -mt-1">TAMAM ما بينشر عرض يخالف هالحدود بدون استثناء معتمد منك.</p>
      {loading ? (
        <div className="h-20 skeleton-t rounded-2xl" />
      ) : list.length === 0 ? (
        <p className="text-center text-tamam-text-muted text-sm py-8">ما في حدود محددة بعد.</p>
      ) : (
        <div className="space-y-2">
          {list.map((g) => (
            <div key={g.id} className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-bold">{g.menu_item_id ? 'لصنف محدد' : 'لكل المنيو'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${g.status === 'active' ? 'bg-tamam-green/20 text-tamam-green-bright' : 'bg-surface-container-high text-on-surface-variant'}`}>{g.status === 'active' ? 'فعّال' : 'غير فعّال'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-tamam-text-muted">
                <div><span className="block">السعر العادي</span><span className="font-bold text-tamam-text">{g.normal_price != null ? `₪${g.normal_price}` : '—'}</span></div>
                <div><span className="block">أقل سعر زبون</span><span className="font-bold text-tamam-text">{g.minimum_customer_offer_price != null ? `₪${g.minimum_customer_offer_price}` : '—'}</span></div>
                <div><span className="block">أقل صافي</span><span className="font-bold text-tamam-text">{g.minimum_restaurant_net != null ? `₪${g.minimum_restaurant_net}` : '—'}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
          <h2 className="font-bold text-base mb-3">حد تجاري جديد</h2>
          <div className="space-y-3 max-h-[62vh] overflow-y-auto">
            <Row label="السعر العادي (₪)"><Input type="number" value={form.normal_price ?? ''} onChange={(e) => setForm({ ...form, normal_price: e.target.value })} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
            <Row label="أقل سعر للزبون (₪)"><Input type="number" value={form.minimum_customer_offer_price ?? ''} onChange={(e) => setForm({ ...form, minimum_customer_offer_price: e.target.value })} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
            <Row label="أقل صافي للمطعم (₪)"><Input type="number" value={form.minimum_restaurant_net ?? ''} onChange={(e) => setForm({ ...form, minimum_restaurant_net: e.target.value })} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
            <Row label="أعلى كمية"><Input type="number" value={form.max_quantity ?? ''} onChange={(e) => setForm({ ...form, max_quantity: e.target.value })} className="bg-tamam-surface-low border-tamam-outline/30" /></Row>
            <div className="flex items-center justify-between bg-tamam-surface-low rounded-xl px-3 py-2.5"><span className="text-sm">استلام (Pickup)</span><Switch checked={!!form.pickup_allowed} onCheckedChange={(v) => setForm({ ...form, pickup_allowed: v })} /></div>
            <div className="flex items-center justify-between bg-tamam-surface-low rounded-xl px-3 py-2.5"><span className="text-sm">توصيل</span><Switch checked={!!form.delivery_allowed} onCheckedChange={(v) => setForm({ ...form, delivery_allowed: v })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={save} disabled={saving} className="flex-1 bg-tamam-green text-tamam-ink">{saving ? 'جاري…' : 'حفظ'}</Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-tamam-outline/40 text-tamam-text">إلغاء</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, children }) {
  return <div><Label className="text-[11px] text-tamam-text-muted mb-1 block">{label}</Label>{children}</div>;
}