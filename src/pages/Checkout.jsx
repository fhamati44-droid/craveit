import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { getCheckout, setCheckout, clearCheckout, defaultCheckout } from '@/lib/checkoutStore';
import { isValidIsraeliPhone, normalizePhone, METHOD_LABELS, PAYMENT_LABELS, osmEmbed, reverseGeocode } from '@/lib/orderUtils';
import CheckoutHeader from '@/components/checkout/CheckoutHeader';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const DELIVERY_QUICK = ['اتصل قبل الوصول', 'لا تدق الجرس', 'اترك الطلب عند الباب', 'المدخل من الخلف'];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, restaurant, subtotal, deliveryFee, total, totalItems } = useCart();
  const [form, setForm] = useState(() => getCheckout() || defaultCheckout());
  const [errors, setErrors] = useState({});
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState('');

  useEffect(() => { if (!items.length) navigate('/cart', { replace: true }); }, [items.length]);
  useEffect(() => { setCheckout(form); }, [form]);
  useEffect(() => { if (form.city) localStorage.setItem('tamam_location', form.city); }, [form.city]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isDelivery = form.method === 'delivery';
  const fee = isDelivery ? (restaurant?.delivery_fee ?? deliveryFee ?? 0) : 0;
  const grand = subtotal + fee;

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setLocMsg('الموقع غير مدعوم على جهازك. اكتب العنوان يدويًا.'); return; }
    setLocating(true); setLocMsg('عم نحدد موقعك...');
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      set('latitude', latitude); set('longitude', longitude);
      const addr = await reverseGeocode(latitude, longitude);
      if (addr) set('resolvedAddress', addr);
      setLocMsg('تم تحديد موقعك.');
      setLocating(false);
    }, () => { setLocMsg('ما قدرنا نوصل لموقعك. اكتب العنوان أو حدده على الخريطة.'); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    if (!isValidIsraeliPhone(form.phone)) e.phone = 'دخل رقم هاتف صحيح';
    if (isDelivery) {
      if (!form.city.trim()) e.city = 'المدينة مطلوبة';
      if (!form.street.trim()) e.street = 'الشارع مطلوب';
      if (!form.building.trim()) e.building = 'رقم البناية مطلوب';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goReview = () => {
    if (!validate()) return;
    localStorage.setItem('user_name', form.name);
    localStorage.setItem('user_phone', form.phone);
    navigate('/checkout/review');
  };

  const mapUrl = osmEmbed(form.latitude, form.longitude);

  return (
    <div dir="rtl" className="font-tamam min-h-[100dvh] bg-surface text-on-surface max-w-[480px] mx-auto pb-32">
      <CheckoutHeader step={2} />

      <div className="px-4 py-4 space-y-6">
        {/* Order method */}
        <section>
          <h3 className="font-bold mb-3">كيف بدك تستلم طلبك؟</h3>
          <div className="grid grid-cols-3 gap-2 bg-surface-container p-1 rounded-xl">
            {[{ id: 'delivery', t: 'توصيل', i: 'delivery_dining' }, { id: 'pickup', t: 'استلام', i: 'shopping_bag' }, { id: 'dinein', t: 'بالطعم', i: 'restaurant' }].map(o => (
              <button key={o.id} onClick={() => set('method', o.id)} className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-all ${form.method === o.id ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}>
                <Icon name={o.i} /><span className="text-xs font-medium">{o.t}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between px-4 py-3 bg-secondary-container/20 rounded-xl border border-secondary-container/30">
            <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container"><Icon name="schedule" /></div><div><p className="text-[11px] text-on-secondary-container/70">وقت الوصول المتوقع</p><p className="text-sm font-bold text-on-secondary-container">{restaurant?.delivery_time ? `${restaurant.delivery_time} دقيقة` : '30–40 دقيقة'}</p></div></div>
            <div className="text-left"><p className="text-[11px] text-on-secondary-container/70">رسوم التوصيل</p><p className="text-sm font-bold text-on-secondary-container">{isDelivery ? (fee === 0 ? 'مجاني' : `₪${Math.round(fee)}`) : '—'}</p></div>
          </div>
        </section>

        {/* Customer details */}
        <section>
          <h3 className="font-bold mb-3 flex items-center gap-2"><Icon name="person" className="text-primary" />بيانات العميل</h3>
          <div className="space-y-3">
            <div className="bg-surface-container rounded-xl p-3"><label className="block text-[11px] text-on-surface-variant mb-1">الاسم الكامل</label><input value={form.name} onChange={e => set('name', e.target.value)} className="w-full bg-transparent outline-none text-on-surface" placeholder="مثال: أحمد محمد" />{errors.name && <p className="text-error text-[11px] mt-1">{errors.name}</p>}</div>
            <div className="bg-surface-container rounded-xl p-3"><label className="block text-[11px] text-on-surface-variant mb-1">رقم الهاتف</label><div className="flex items-center gap-2"><span className="text-on-surface-variant" dir="ltr">+972</span><input value={form.phone} onChange={e => set('phone', e.target.value)} type="tel" inputMode="tel" className="w-full bg-transparent outline-none text-on-surface" placeholder="05X-XXXXXXX" dir="ltr" />{errors.phone && <p className="text-error text-[11px] mt-1">{errors.phone}</p>}</div></div>
            <div className="bg-surface-container rounded-xl p-3"><label className="block text-[11px] text-on-surface-variant mb-1">البريد الإلكتروني (اختياري)</label><input value={form.email} onChange={e => set('email', e.target.value)} type="email" className="w-full bg-transparent outline-none text-on-surface" placeholder="email@example.com" /></div>
          </div>
        </section>

        {/* Address */}
        {isDelivery && (
          <section>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold flex items-center gap-2"><Icon name="location_on" className="text-primary" />عنوان التوصيل</h3><button onClick={useCurrentLocation} className="text-primary text-sm font-semibold flex items-center gap-1"><Icon name="my_location" className="text-[16px]" />موقعي الحالي</button></div>
            {locating && <p className="text-sm text-primary mb-2 flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />{locMsg}</p>}
            {!locating && locMsg && <p className="text-sm text-on-surface-variant mb-2">{locMsg}</p>}
            {mapUrl && <div className="relative w-full h-44 rounded-xl overflow-hidden mb-3 border border-outline-variant/30"><iframe title="map" className="w-full h-full" src={mapUrl} /><button onClick={() => set('latitude', null)} className="absolute top-2 left-2 bg-surface/80 backdrop-blur px-2 py-1 rounded-lg text-xs">إلغاء الموقع</button></div>}
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
              {[{ id: 'home', t: 'البيت', i: 'home' }, { id: 'work', t: 'الشغل', i: 'work' }, { id: 'other', t: 'عنوان آخر', i: 'add_location' }].map(a => (
                <button key={a.id} onClick={() => set('addressLabel', a.id)} className={`flex-none flex items-center gap-2 px-3 py-2 rounded-xl border ${form.addressLabel === a.id ? 'bg-primary/10 border-primary/30' : 'bg-surface-container border-transparent'}`}><Icon name={a.i} className="text-primary" /><span className="text-sm">{a.t}</span></button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="المدينة أو البلدة *" value={form.city} onChange={v => set('city', v)} error={errors.city} />
              <Field label="الشارع *" value={form.street} onChange={v => set('street', v)} error={errors.street} />
              <Field label="رقم البناية *" value={form.building} onChange={v => set('building', v)} error={errors.building} />
              <Field label="المدخل" value={form.entrance} onChange={v => set('entrance', v)} />
              <Field label="الطابق" value={form.floor} onChange={v => set('floor', v)} />
              <Field label="رقم الشقة" value={form.apartment} onChange={v => set('apartment', v)} />
            </div>
          </section>
        )}

        {/* Instructions */}
        {isDelivery && (
          <section>
            <h3 className="font-bold mb-2">ملاحظات للمندوب</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {DELIVERY_QUICK.map(q => {
                const on = form.deliveryQuick.includes(q);
                return <button key={q} onClick={() => set('deliveryQuick', on ? form.deliveryQuick.filter(x => x !== q) : [...form.deliveryQuick, q])} className={`px-3 py-1.5 rounded-full text-xs border ${on ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30 text-on-surface-variant'}`}>{q}</button>;
              })}
            </div>
            <textarea value={form.deliveryNotes} onChange={e => set('deliveryNotes', e.target.value)} rows={2} className="w-full bg-surface-container rounded-xl p-3 outline-none resize-none text-sm" placeholder="مثلاً: الطابق الثالث، اتصل لما توصل..." />
          </section>
        )}
        <section>
          <h3 className="font-bold mb-2">ملاحظات للمطعم</h3>
          <textarea value={form.restaurantNotes} onChange={e => set('restaurantNotes', e.target.value)} rows={2} className="w-full bg-surface-container rounded-xl p-3 outline-none resize-none text-sm" placeholder="مثلاً: الصوص عالجنب، بدون بصل..." />
        </section>

        {/* Payment */}
        <section>
          <h3 className="font-bold mb-3 flex items-center gap-2"><Icon name="payments" className="text-primary" />طريقة الدفع</h3>
          <div className="space-y-2">
            {[{ id: 'cash', t: PAYMENT_LABELS.cash, i: 'handshake', d: 'بتدفع للمندوب وقت استلام الطلب' }, { id: 'card_on_delivery', t: PAYMENT_LABELS.card_on_delivery, i: 'credit_card', d: 'بتدفع بالبطاقة للمندوب وقت الاستلام' }].map(p => (
              <button key={p.id} onClick={() => set('payment', p.id)} className={`w-full p-3 rounded-xl flex items-center justify-between border ${form.payment === p.id ? 'bg-primary/10 border-primary/30' : 'bg-surface-container border-outline-variant/30'}`}>
                <div className="flex items-center gap-3"><Icon name={p.i} className="text-primary" /><div className="text-right"><p className="font-semibold text-sm">{p.t}</p><p className="text-[11px] text-on-surface-variant">{p.d}</p></div></div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.payment === p.id ? 'border-primary' : 'border-outline'}`}>{form.payment === p.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}</div>
              </button>
            ))}
            <p className="text-[11px] text-on-surface-variant px-1">الدفع الآمن بالبطاقة أونلاين بيكون متاح قريبًا. هسا الدفع عند الاستلام.</p>
          </div>
          {form.payment === 'cash' && (
            <div className="mt-3 bg-surface-container rounded-xl p-3">
              <p className="text-sm mb-2">بتحتاج فكة؟</p>
              <div className="flex gap-2">
                {[{ id: 'no', t: 'لا' }, { id: 'yes', t: 'نعم' }].map(o => (
                  <button key={o.id} onClick={() => set('cashDenomination', o.id === 'no' ? '' : 'yes')} className={`px-4 py-2 rounded-lg text-sm border ${form.cashDenomination === 'yes' && o.id === 'yes' ? 'bg-primary/10 border-primary/30 text-primary' : form.cashDenomination !== 'yes' && o.id === 'no' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container-high border-outline-variant/30'}`}>{o.t}</button>
                ))}
              </div>
              {form.cashDenomination === 'yes' && <input value={form.cashDenomination === 'yes' ? '' : form.cashDenomination} onChange={e => set('cashDenomination', e.target.value)} className="mt-2 w-full bg-surface-container-high rounded-lg p-2 outline-none text-sm" placeholder="رح تدفع بأي مبلغ؟" />}
            </div>
          )}
        </section>

        {/* Summary */}
        <section className="bg-surface-container/40 rounded-2xl p-4">
          <h3 className="text-xs text-on-surface-variant uppercase tracking-wider mb-3">ملخص الطلب · {restaurant?.name || 'TAMAM'}</h3>
          <div className="space-y-2 mb-3">
            {items.map(it => (
              <div key={it.cartId} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><span className="text-primary font-bold">{it.quantity}×</span><span className="truncate">{it.name}</span></div>
                <span>₪{Math.round((it.price + (it.extras || []).reduce((s, e) => s + (e.price || 0), 0)) * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-sm border-t border-outline-variant/30 pt-2">
            <Row label="مجموع المنتجات" value={`₪${Math.round(subtotal)}`} />
            <Row label="رسوم التوصيل" value={isDelivery ? (fee === 0 ? 'مجاني' : `₪${Math.round(fee)}`) : '—'} />
            <div className="flex justify-between font-bold text-base pt-1"><span>الإجمالي</span><span className="text-primary">₪{Math.round(grand)}</span></div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-4 pb-4 pt-3 bg-gradient-to-t from-surface via-surface/95 to-transparent z-40 max-w-[480px] mx-auto">
        <button onClick={goReview} className="w-full h-14 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform">متابعة لمراجعة الطلب · ₪{Math.round(grand)}</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-on-surface-variant">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className={`bg-surface-container rounded-xl p-2.5 outline-none text-sm border ${error ? 'border-error' : 'border-transparent'}`} />
      {error && <p className="text-error text-[11px]">{error}</p>}
    </div>
  );
}
function Row({ label, value }) { return <div className="flex justify-between text-on-surface-variant"><span>{label}</span><span>{value}</span></div>; }