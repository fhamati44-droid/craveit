import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { submitPartnerApplication } from '@/lib/partnerApi';

/**
 * Shown when an authenticated user has no active RestaurantMembership.
 * The user may submit a partner application; access is never granted on click.
 */
export default function PartnerDenied() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ restaurant_name: '', restaurant_phone: '', restaurant_city: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!form.restaurant_name.trim()) { setError('اسم المطعم مطلوب'); return; }
    setSubmitting(true); setError(null);
    try {
      await submitPartnerApplication(form);
      setDone(true);
    } catch (e) { setError(e?.error === 'auth_required' ? 'سجّل الدخول أولًا' : 'صار خطأ، جرّب مرة ثانية'); }
    finally { setSubmitting(false); }
  };

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-tamam-bg text-tamam-text font-tamam flex flex-col items-center justify-center px-6" style={{ maxWidth: '430px', margin: '0 auto' }}>
      <div className="w-16 h-16 rounded-2xl bg-tamam-surface flex items-center justify-center mb-4">
        <Store size={30} className="text-tamam-green-bright" />
      </div>
      <h1 className="text-lg font-bold mb-1">حسابك مش مربوط بمطعم</h1>
      <p className="text-tamam-text-muted text-sm text-center mb-5">إذا أنت صاحب مطعم أو موظف مخوّل، ابعث طلب انضمام لفريق TAMAM.</p>

      {done ? (
        <div className="w-full bg-tamam-surface border border-tamam-green/30 rounded-2xl p-4 text-center">
          <p className="text-tamam-green-bright font-bold text-sm mb-3">وصلنا طلبك ✅</p>
          <p className="text-tamam-text-muted text-xs mb-4">رح يواصل معك فريق TAMAM قريب.</p>
          <button onClick={() => navigate('/profile')} className="w-full h-12 bg-tamam-surface-high rounded-xl font-bold text-sm">ارجع للبروفايل</button>
        </div>
      ) : (
        <div className="w-full bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-4 space-y-3">
          <Field label="اسم المطعم" value={form.restaurant_name} onChange={(v) => setForm({ ...form, restaurant_name: v })} />
          <Field label="رقم المطعم" value={form.restaurant_phone} onChange={(v) => setForm({ ...form, restaurant_phone: v })} />
          <Field label="المدينة" value={form.restaurant_city} onChange={(v) => setForm({ ...form, restaurant_city: v })} />
          <Field label="ملاحظات" value={form.message} onChange={(v) => setForm({ ...form, message: v })} textarea />
          {error && <p className="text-error text-xs">{error}</p>}
          <button onClick={submit} disabled={submitting} className="w-full h-12 bg-tamam-green text-tamam-ink rounded-xl font-bold text-sm disabled:opacity-50">
            {submitting ? 'جاري الإرسال…' : 'اطلب الانضمام كشريك'}
          </button>
          <button onClick={() => navigate('/profile')} className="w-full h-11 text-tamam-text-muted font-semibold text-sm">ارجع للبروفايل</button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, textarea }) {
  return (
    <label className="block">
      <span className="text-[11px] text-tamam-text-muted block mb-1">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full bg-tamam-surface-low border border-tamam-outline/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-tamam-green/50 text-right" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-tamam-surface-low border border-tamam-outline/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-tamam-green/50 text-right" />
      )}
    </label>
  );
}