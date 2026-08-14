import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listMenuItems, submitOfferRequest } from '@/lib/partnerApi';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const GOALS = [
  { key: 'strengthen_item', label: 'تقوية وجبة' },
  { key: 'quiet_hour', label: 'تحريك ساعة هادية' },
  { key: 'surplus', label: 'استخدام كمية فائضة' },
  { key: 'attract_new', label: 'جذب زباين جدد' },
  { key: 'reactivate', label: 'إعادة تنشيط وجبة' },
];
const DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export default function PartnerOfferRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const prefill = location.state?.prefill;
  const isReview = !!prefill;
  const [menu, setMenu] = useState([]);
  const [form, setForm] = useState(() => ({
    goal: 'strengthen_item', requested_menu_items: [], allowed_days: [], pickup_allowed: true, delivery_allowed: true,
    ...(prefill || {}),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => { listMenuItems(rid, 'available').then(setMenu).catch(() => {}); }, [rid]);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const toggleItem = (id) => set('requested_menu_items', form.requested_menu_items.includes(id) ? form.requested_menu_items.filter((x) => x !== id) : [...form.requested_menu_items, id]);
  const toggleDay = (i) => set('allowed_days', form.allowed_days.includes(i) ? form.allowed_days.filter((x) => x !== i) : [...form.allowed_days, i]);

  const submit = async () => {
    setSaving(true); setError(null);
    try { await submitOfferRequest(rid, form); setDone(true); }
    catch (e) { setError(e?.error === 'no_permission' ? 'ما عندك صلاحية لطلب عرض' : 'صار خطأ'); }
    finally { setSaving(false); }
  };

  if (done) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-tamam-green/15 border border-tamam-green/30 rounded-2xl p-6 text-center space-y-3">
          <span className="material-symbols-outlined text-tamam-green-bright text-[44px]">task_alt</span>
          <h2 className="font-bold text-tamam-text text-base">تم إرسال الحملة إلى فريق TAMAM للمراجعة</h2>
          <p className="text-tamam-text-muted text-xs">رح نراجعها ونشغّلها بالوقت اللي حدّدته. ما رح تنشر للزبائن قبل الموافقة.</p>
          <Button onClick={() => navigate('/partner/offers')} className="w-full h-12 bg-tamam-green text-tamam-ink hover:bg-tamam-green-dark">روح لصفحة العروض</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="font-bold text-lg">{isReview ? 'مراجعة فرصة TAMAM' : 'اطلب فكرة عرض'}</h1>
      <p className="text-[11px] text-tamam-text-muted">{isReview ? 'جهّزنالك اقتراح من بياناتك. عدّله أو وافق عليه.' : 'احكيلنا شو بدك تحرّك، وTAMAM بتجهزلك فكرة ضمن حدودك.'}</p>
      {isReview && (
        <div className="space-y-2">
          <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3 space-y-1.5">
            <p className="text-xs font-bold text-tamam-text-muted">TAMAM ستقوم بـ</p>
            <ul className="text-[11px] text-tamam-text space-y-1 list-disc pr-4">
              <li>تجهيز الحملة واختيار الجمهور المناسب.</li>
              <li>تشغيلها بالوقت المحدد وإيقافها عند انتهاء الوقت أو الكمية.</li>
              <li>متابعة النتائج وتفريفها معك.</li>
            </ul>
          </div>
          <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3 space-y-1.5">
            <p className="text-xs font-bold text-tamam-text-muted">المطلوب من المطعم</p>
            <ul className="text-[11px] text-tamam-text space-y-1 list-disc pr-4">
              <li>تأكيد توفر الوجبة وتجهيز الطلب بالوقت.</li>
              <li>المحافظة على الجودة وتقديم خدمة ترجّع الزبون.</li>
            </ul>
          </div>
        </div>
      )}
      <Section title="الهدف">
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <button key={g.key} onClick={() => set('goal', g.key)} className={`p-2.5 rounded-xl text-xs font-bold ${form.goal === g.key ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-low border border-tamam-outline/30 text-tamam-text'}`}>{g.label}</button>
          ))}
        </div>
      </Section>
      <Section title="الأصناف">
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {menu.length === 0 && <p className="text-tamam-text-muted text-xs">ما في أصناف متوفرة.</p>}
          {menu.map((it) => (
            <button key={it.id} onClick={() => toggleItem(it.id)} className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm ${form.requested_menu_items.includes(it.id) ? 'bg-tamam-green/15 border border-tamam-green/40' : 'bg-tamam-surface-low border border-tamam-outline/30'}`}>
              <span className="truncate">{it.name}</span>
              <span>{form.requested_menu_items.includes(it.id) ? '✓' : '+'}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="التفاصيل">
        <div className="grid grid-cols-2 gap-3">
          <Field label="كمية متوفرة"><Input type="number" value={form.available_quantity ?? ''} onChange={(e) => set('available_quantity', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
          <Field label="أعلى كمية"><Input type="number" value={form.max_quantity ?? ''} onChange={(e) => set('max_quantity', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
          <Field label="أقل سعر زبون (₪)"><Input type="number" value={form.minimum_customer_offer_price ?? ''} onChange={(e) => set('minimum_customer_offer_price', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
          <Field label="أقل صافي مطعم (₪)"><Input type="number" value={form.minimum_restaurant_net ?? ''} onChange={(e) => set('minimum_restaurant_net', e.target.value)} className="bg-tamam-surface-low border-tamam-outline/30" /></Field>
        </div>
        <Field label="أيام مسموحة">
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${form.allowed_days.includes(i) ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-low border border-tamam-outline/30 text-tamam-text-muted'}`}>{d}</button>
            ))}
          </div>
        </Field>
        <Field label="ملاحظات لفريق TAMAM"><Textarea value={form.restaurant_notes || ''} onChange={(e) => set('restaurant_notes', e.target.value)} rows={2} className="bg-tamam-surface-low border-tamam-outline/30 text-right" /></Field>
      </Section>
      {error && <p className="text-error text-xs">{error}</p>}
      <Button onClick={submit} disabled={saving} className="w-full h-12 bg-tamam-green text-tamam-ink hover:bg-tamam-green-dark">{saving ? 'جاري الإرسال…' : isReview ? 'وافق وشغّل الحملة' : 'إرسال الطلب'}</Button>
    </div>
  );
}

function Section({ title, children }) {
  return <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3 space-y-2"><p className="text-xs font-bold text-tamam-text-muted">{title}</p>{children}</div>;
}
function Field({ label, children }) {
  return <div><Label className="text-[11px] text-tamam-text-muted mb-1 block">{label}</Label>{children}</div>;
}