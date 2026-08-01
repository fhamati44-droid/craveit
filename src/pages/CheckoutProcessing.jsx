import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { getCheckout, clearCheckout } from '@/lib/checkoutStore';
import { createOrder } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { genOrderNumber, genDeliveryRef, METHOD_LABELS } from '@/lib/orderUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const STEPS = ['عم نتأكد من الوجبات والأسعار', 'عم نأكد طريقة الدفع', 'عم نرسل الطلب للمطعم', 'عم ننشئ رقم الطلب', 'عم نجهز مرجع التوصيل'];
const PENDING_KEY = 'tamam_pending_order';

export default function CheckoutProcessing() {
  const navigate = useNavigate();
  const { items, restaurant, subtotal, deliveryFee, clearCart } = useCart();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Idempotency: recover a pending order if we just created one
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      if (pending && pending.orderId && Date.now() - pending.at < 120000) {
        navigate(`/order-confirmation/${pending.orderId}`, { replace: true });
        return;
      }
    } catch {}

    (async () => {
      const form = getCheckout();
      if (!items.length || !form) { navigate('/cart', { replace: true }); return; }
      try {
        for (let i = 0; i < STEPS.length - 1; i++) { setStep(i); await wait(550); }
        const order_number = genOrderNumber();
        const isDelivery = form.method === 'delivery';
        const fee = isDelivery ? (restaurant?.delivery_fee ?? deliveryFee ?? 0) : 0;
        const grand = subtotal + fee;
        const address = [form.city, form.street, form.building && `بناية ${form.building}`, form.entrance && `مدخل ${form.entrance}`, form.floor && `طابق ${form.floor}`, form.apartment && `شقة ${form.apartment}`].filter(Boolean).join('، ');
        const notes = `ملاحظات المندوب: ${[...(form.deliveryQuick || []), form.deliveryNotes].filter(Boolean).join('، ') || '-'} | ملاحظات المطعم: ${form.restaurantNotes || '-'}${form.email ? ' | الإيميل: ' + form.email : ''}`;
        const orderItems = items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, extras: i.extras || [], notes: i.note || '' }));
        const itemsStr = items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
        const orderData = {
          customer_name: form.name,
          phone: '972' + form.phone.replace(/^0/, '').replace(/[^\d]/g, ''),
          address: address || (isDelivery ? '—' : 'استلام من المطعم'),
          notes,
          kitchen_id: restaurant?.kitchen_id ?? restaurant?.id ?? 1,
          courier_id: null,
          channel: METHOD_LABELS[form.method],
          items: itemsStr,
          order_items: orderItems,
          drinks: null, dessert: null,
          quantity: items.reduce((s, i) => s + i.quantity, 0),
          amount: grand,
          status: 'new',
          order_number,
        };
        setStep(3);
        const order = await createOrder(orderData);
        if (!order || !order.id) throw new Error('ما انشأ الطلب');
        localStorage.setItem(PENDING_KEY, JSON.stringify({ orderId: order.id, at: Date.now() }));
        setStep(4);
        // store extended checkout metadata (non-destructive)
        await base44.entities.OrderCheckoutMeta.create({
          order_id: order.id, order_number,
          delivery_reference: isDelivery ? genDeliveryRef() : '',
          fulfillment_method: form.method,
          payment_method: form.payment,
          payment_status: 'pending',
          email: form.email || '',
          city: form.city || '', street: form.street || '', building: form.building || '', entrance: form.entrance || '', floor: form.floor || '', apartment: form.apartment || '',
          latitude: form.latitude ?? null, longitude: form.longitude ?? null,
          delivery_notes: [`${form.deliveryNotes || ''}`].join(' | ') || '',
          restaurant_notes: form.restaurantNotes || '',
          cash_denomination: form.cashDenomination === 'yes' ? 'yes' : '',
          restaurant_name: restaurant?.name || '',
          total: grand,
        }).catch(() => null);
        clearCart(); clearCheckout();
        localStorage.setItem('active_order', JSON.stringify({ id: order.id, eta: 30 }));
        localStorage.removeItem(PENDING_KEY);
        await wait(500);
        navigate(`/order-confirmation/${order.id}`, { replace: true });
      } catch (e) {
        console.error(e);
        setError(e.message || 'صار خطأ بإنشاء الطلب');
        localStorage.removeItem(PENDING_KEY);
      }
    })();
  }, []);

  if (error) {
    return (
      <div dir="rtl" className="font-tamam min-h-[100dvh] bg-surface text-on-surface max-w-[480px] mx-auto flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-error/15 flex items-center justify-center mb-4"><Icon name="error" className="text-error text-4xl" /></div>
        <h1 className="text-xl font-bold mb-2">ما قدرنا نكمل الطلب</h1>
        <p className="text-on-surface-variant mb-6 text-sm">{error}. سلتك وتفاصيلك محفوظة، جرّب مرة ثانية.</p>
        <button onClick={() => navigate('/checkout/review')} className="w-full bg-primary text-on-primary h-14 rounded-full font-bold mb-3">رجوع للمراجعة</button>
        <button onClick={() => navigate('/cart')} className="text-primary font-semibold">العودة للسلة</button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="font-tamam min-h-[100dvh] bg-surface text-on-surface max-w-[480px] mx-auto flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-6"><span className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      <h1 className="text-2xl font-bold mb-2">عم نثبت طلبك</h1>
      <p className="text-on-surface-variant mb-8 text-sm">ما تقفل الصفحة، لحظة فقط...</p>
      <div className="w-full space-y-3 text-right">
        {STEPS.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 transition-opacity ${i <= step ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${i < step ? 'bg-primary text-on-primary' : i === step ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
              {i < step ? <Icon name="check" className="text-[14px]" /> : <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            </div>
            <span className="text-sm">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }