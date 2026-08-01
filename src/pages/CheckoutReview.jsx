import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { getCheckout } from '@/lib/checkoutStore';
import { METHOD_LABELS, PAYMENT_LABELS } from '@/lib/orderUtils';
import CheckoutHeader from '@/components/checkout/CheckoutHeader';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function CheckoutReview() {
  const navigate = useNavigate();
  const { items, restaurant, subtotal, total, deliveryFee } = useCart();
  const [form, setForm] = useState(() => getCheckout());

  useEffect(() => {
    if (!items.length) { navigate('/cart', { replace: true }); return; }
    if (!form) { navigate('/checkout', { replace: true }); return; }
  }, []);

  if (!form || !items.length) return null;
  const fee = form.method === 'delivery' ? (restaurant?.delivery_fee ?? deliveryFee ?? 0) : 0;
  const grand = subtotal + fee;
  const address = [form.city, form.street, form.building && `بناية ${form.building}`, form.entrance && `مدخل ${form.entrance}`, form.floor && `طابق ${form.floor}`, form.apartment && `شقة ${form.apartment}`].filter(Boolean).join('، ');

  return (
    <div dir="rtl" className="font-tamam min-h-[100dvh] bg-surface text-on-surface max-w-[480px] mx-auto pb-32">
      <CheckoutHeader step={4} title="راجع طلبك" />
      <div className="px-4 py-4 space-y-4">
        <Section title="بيانات العميل" onEdit={() => navigate('/checkout')}>
          <p className="font-semibold">{form.name}</p>
          <p className="text-sm text-on-surface-variant" dir="ltr">+972{form.phone.replace(/^0/, '').replace(/[^\d]/g, '')}</p>
          {form.email && <p className="text-sm text-on-surface-variant">{form.email}</p>}
        </Section>
        <Section title="طريقة الاستلام" onEdit={() => navigate('/checkout')}>
          <p className="font-semibold">{METHOD_LABELS[form.method]}</p>
          {form.method === 'delivery' && <p className="text-sm text-on-surface-variant">رسوم التوصيل: {fee === 0 ? 'مجاني' : `₪${Math.round(fee)}`}</p>}
        </Section>
        {form.method === 'delivery' && (
          <Section title="العنوان" onEdit={() => navigate('/checkout')}>
            <p className="font-semibold">{address || '—'}</p>
            {(form.deliveryNotes || form.deliveryQuick?.length) && <p className="text-sm text-on-surface-variant">ملاحظات المندوب: {[...(form.deliveryQuick || []), form.deliveryNotes].filter(Boolean).join('، ') || '—'}</p>}
          </Section>
        )}
        <Section title="ملاحظات للمطعم" onEdit={() => navigate('/checkout')}>
          <p className="text-sm">{form.restaurantNotes || '—'}</p>
        </Section>
        <Section title="طريقة الدفع" onEdit={() => navigate('/checkout')}>
          <p className="font-semibold">{PAYMENT_LABELS[form.payment]}</p>
          {form.payment === 'cash' && form.cashDenomination === 'yes' && <p className="text-sm text-on-surface-variant">الدفع نقدًا عند الاستلام</p>}
        </Section>
        <Section title="الأصناف" onEdit={() => navigate('/cart')}>
          <div className="space-y-2">
            {items.map(it => (
              <div key={it.cartId} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><span className="text-primary font-bold">{it.quantity}×</span><span className="truncate">{it.name}</span></div>
                <span>₪{Math.round((it.price + (it.extras || []).reduce((s, e) => s + (e.price || 0), 0)) * it.quantity)}</span>
              </div>
            ))}
          </div>
        </Section>
        <div className="bg-surface-container/40 rounded-2xl p-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-on-surface-variant"><span>مجموع المنتجات</span><span>₪{Math.round(subtotal)}</span></div>
            <div className="flex justify-between text-on-surface-variant"><span>رسوم التوصيل</span><span>{form.method === 'delivery' ? (fee === 0 ? 'مجاني' : `₪${Math.round(fee)}`) : '—'}</span></div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-outline-variant/30 mt-1"><span>الإجمالي</span><span className="text-primary">₪{Math.round(grand)}</span></div>
          </div>
        </div>
        <p className="text-center text-xs text-on-surface-variant">رح يوصلك رقم طلب وتقدر تتابع كل مرحلة.</p>
      </div>
      <div className="fixed bottom-0 inset-x-0 px-4 pb-4 pt-3 bg-gradient-to-t from-surface via-surface/95 to-transparent z-40 max-w-[480px] mx-auto">
        <button onClick={() => navigate('/checkout/processing')} className="w-full h-14 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform">
          تأكيد وتنفيذ الطلب · ₪{Math.round(grand)}<Icon name="keyboard_double_arrow_left" />
        </button>
      </div>
    </div>
  );
}

function Section({ title, onEdit, children }) {
  return (
    <div className="bg-surface-container rounded-2xl p-4">
      <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-sm">{title}</h3><button onClick={onEdit} className="text-primary text-sm font-semibold">تعديل</button></div>
      {children}
    </div>
  );
}