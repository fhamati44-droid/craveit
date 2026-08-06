import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getAllMenuCategories } from '@/lib/api';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

const STATUSES = [
  { value: 'open', label: 'مفتوح' },
  { value: 'closed', label: 'مغلق' },
  { value: 'busy', label: 'مشغول' },
  { value: 'temporarily_unavailable', label: 'غير متاح مؤقتًا' },
];

const EMPTY = {
  name: '', name_ar: '', logo_url: '', cover_image_url: '', description: '',
  phone: '', whatsapp: '', email: '', address: '', city: '',
  latitude: null, longitude: null,
  active: true, verified: false, featured: false, rating: null,
  minimum_order: 0, delivery_fee: 0, free_delivery_threshold: null,
  preparation_time_min: null, preparation_time_max: null,
  delivery_time_min: null, delivery_time_max: null,
  accepts_orders: true, current_status: 'open',
  menu_types: [], supabase_restaurant_id: null,
};

export default function RestaurantEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [menus, setMenus] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!id;

  useEffect(() => {
    getAllMenuCategories().then(setMenus).catch(() => setMenus([]));
    if (isEdit) {
      base44.entities.Restaurant.get(id).then((r) => setForm({ ...EMPTY, ...r })).catch(() => setError('ما لقينا المطعم'));
    }
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

  const save = async () => {
    setError('');
    if (!form.name?.trim()) { setError('الاسم مطلوب'); return; }
    setSaving(true);
    try {
      const payload = { ...form, rating: numOrNull(form.rating), latitude: numOrNull(form.latitude), longitude: numOrNull(form.longitude), minimum_order: Number(form.minimum_order) || 0, delivery_fee: Number(form.delivery_fee) || 0, free_delivery_threshold: numOrNull(form.free_delivery_threshold), preparation_time_min: numOrNull(form.preparation_time_min), preparation_time_max: numOrNull(form.preparation_time_max), delivery_time_min: numOrNull(form.delivery_time_min), delivery_time_max: numOrNull(form.delivery_time_max), supabase_restaurant_id: numOrNull(form.supabase_restaurant_id) };
      if (isEdit) await base44.entities.Restaurant.update(id, payload);
      else await base44.entities.Restaurant.create(payload);
      navigate('/admin/restaurants');
    } catch (e) {
      setError(e?.message || 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  return (
    <div dir="rtl" className="font-tamam space-y-4 max-w-2xl">
      <button onClick={() => navigate('/admin/restaurants')} className="flex items-center gap-1 text-on-surface-variant text-sm">
        <ArrowRight size={16} /> المطاعم
      </button>
      <h1 className="text-xl font-bold">{isEdit ? 'تعديل مطعم' : 'إضافة مطعم'}</h1>
      {error && <div className="bg-error/10 border border-error/30 rounded-xl p-3 text-sm text-error">{error}</div>}

      <div className="bg-surface-container rounded-2xl p-4 space-y-3">
        <Section title="البيانات الأساسية">
          <div className="grid grid-cols-2 gap-3">
            <Field label="الاسم (إنجليزي)"><input value={form.name} onChange={(e) => set('name', e.target.value)} className="inp" /></Field>
            <Field label="الاسم (عربي)"><input value={form.name_ar} onChange={(e) => set('name_ar', e.target.value)} className="inp" /></Field>
            <Field label="رابط الشعار"><input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} className="inp" placeholder="https://..." /></Field>
            <Field label="رابط صورة الغلاف"><input value={form.cover_image_url} onChange={(e) => set('cover_image_url', e.target.value)} className="inp" placeholder="https://..." /></Field>
            <Field label="رقم الهاتف"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="inp" /></Field>
            <Field label="واتساب"><input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} className="inp" /></Field>
            <Field label="إيميل"><input value={form.email} onChange={(e) => set('email', e.target.value)} className="inp" /></Field>
            <Field label="المدينة"><input value={form.city} onChange={(e) => set('city', e.target.value)} className="inp" /></Field>
            <Field label="العنوان" full><input value={form.address} onChange={(e) => set('address', e.target.value)} className="inp" /></Field>
            <Field label="الوصف" full><textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="inp" rows={2} /></Field>
          </div>
        </Section>

        <Section title="التوصيل والتجهيز">
          <div className="grid grid-cols-2 gap-3">
            <Field label="رسوم التوصيل ₪"><input type="number" value={form.delivery_fee} onChange={(e) => set('delivery_fee', e.target.value)} className="inp" /></Field>
            <Field label="حد التوصيل المجاني ₪"><input type="number" value={form.free_delivery_threshold ?? ''} onChange={(e) => set('free_delivery_threshold', e.target.value)} className="inp" /></Field>
            <Field label="أدنى طلب ₪"><input type="number" value={form.minimum_order} onChange={(e) => set('minimum_order', e.target.value)} className="inp" /></Field>
            <Field label="التقييم"><input type="number" step="0.1" value={form.rating ?? ''} onChange={(e) => set('rating', e.target.value)} className="inp" /></Field>
            <Field label="تجهيز (د) من"><input type="number" value={form.preparation_time_min ?? ''} onChange={(e) => set('preparation_time_min', e.target.value)} className="inp" /></Field>
            <Field label="تجهيز (د) إلى"><input type="number" value={form.preparation_time_max ?? ''} onChange={(e) => set('preparation_time_max', e.target.value)} className="inp" /></Field>
            <Field label="توصيل (د) من"><input type="number" value={form.delivery_time_min ?? ''} onChange={(e) => set('delivery_time_min', e.target.value)} className="inp" /></Field>
            <Field label="توصيل (د) إلى"><input type="number" value={form.delivery_time_max ?? ''} onChange={(e) => set('delivery_time_max', e.target.value)} className="inp" /></Field>
          </div>
        </Section>

        <Section title="الحالة والقوائم">
          <div className="grid grid-cols-2 gap-3">
            <Field label="الحالة">
              <select value={form.current_status} onChange={(e) => set('current_status', e.target.value)} className="inp">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="معرف مطعم Supabase (اختياري)"><input type="number" value={form.supabase_restaurant_id ?? ''} onChange={(e) => set('supabase_restaurant_id', e.target.value)} className="inp" /></Field>
            <div className="col-span-2 flex flex-wrap gap-3">
              <Toggle label="فعّال" checked={form.active} onChange={(v) => set('active', v)} />
              <Toggle label="موثّق" checked={form.verified} onChange={(v) => set('verified', v)} />
              <Toggle label="مميّز" checked={form.featured} onChange={(v) => set('featured', v)} />
              <Toggle label="يستقبل طلبات" checked={form.accepts_orders} onChange={(v) => set('accepts_orders', v)} />
            </div>
            <Field label="القوائم المُقدَّمة" full>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {menus.length === 0 && <span className="text-xs text-on-surface-variant">لا توجد قوائم</span>}
                {menus.map((m) => {
                  const sel = (form.menu_types || []).includes(String(m.id));
                  return (
                    <button key={m.id} type="button" onClick={() => set('menu_types', sel ? form.menu_types.filter((x) => x !== String(m.id)) : [...(form.menu_types || []), String(m.id)])}
                      className={`text-xs px-3 py-1.5 rounded-full font-bold border ${sel ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'}`}>
                      {m.name || m.name_ar || `قائمة ${m.id}`}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </Section>

        <button onClick={save} disabled={saving} className="w-full bg-primary text-on-primary h-12 rounded-full font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? 'عم نحفظ...' : <><Save size={18} /> حفظ</>}
        </button>
      </div>
      <style>{`.inp{width:100%;background:var(--background);border:1px solid hsl(var(--outline-variant)/.4);border-radius:12px;padding:10px 12px;font-size:14px;color:inherit;outline:none}.inp:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border-b border-outline-variant/20 pb-3 last:border-0">
      <h3 className="font-bold text-sm mb-2 text-on-surface-variant">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="text-[11px] text-on-surface-variant block mb-1">{label}</span>
      {children}
    </label>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-1.5 text-sm">
      <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${checked ? 'bg-primary' : 'bg-surface-container-highest'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${checked ? '-translate-x-4' : ''}`} />
      </span>
      {label}
    </button>
  );
}