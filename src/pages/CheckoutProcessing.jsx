import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { getCheckout, clearCheckout } from '@/lib/checkoutStore';
import { createOrder } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { genOrderNumber, genDeliveryRef, METHOD_LABELS, paymentStatusLabel } from '@/lib/orderUtils';
import { recordPendingPoints, redeemPoints, markCouponUsed } from '@/lib/loyaltyApi';
import { verifyStripeSession } from '@/lib/stripeApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const STEPS = ['عم نتأكد من الوجبات والأسعار', 'عم نأكد طريقة الدفع', 'عم نرسل الطلب للمطعم', 'عم ننشئ رقم الطلب', 'عم نجهز مرجع التوصيل'];
const PENDING_KEY = 'tamam_pending_order';

export default function CheckoutProcessing() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { items, restaurant, subtotal, deliveryFee, clearCart } = useCart();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const started = useRef(false);
  const sessionId = params.get('session_id');
  const isPaidReturn = params.get('paid') === '1' && !!sessionId;

  const buildOrderData = (form, paymentStatus) => {
    const isDelivery = form.method === 'delivery';
    const fee = isDelivery ? (restaurant?.delivery_fee ?? deliveryFee ?? 0) : 0;
    const couponDiscount = form.couponDiscount || 0;
    const pointsDiscount = form.pointsDiscount || 0;
    const grand = Math.max(0, subtotal + fee - couponDiscount - pointsDiscount);
    const address = [form.city, form.street, form.building && `بناية ${form.building}`, form.entrance && `مدخل ${form.entrance}`, form.floor && `طابق ${form.floor}`, form.apartment && `شقة ${form.apartment}`].filter(Boolean).join('، ');
    const notes = `ملاحظات المندوب: ${[...(form.deliveryQuick || []), form.deliveryNotes].filter(Boolean).join('، ') || '-'} | ملاحظات المطعم: ${form.restaurantNotes || '-'}${form.email ? ' | الإيميل: ' + form.email : ''}`;
    const orderItems = items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, extras: i.extras || [], notes: i.note || '' }));
    const itemsStr = items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
    return {
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
      order_number: form._orderNumber || genOrderNumber(),
    };
  };

  const finalize = async (form, paymentStatus) => {
    for (let i = 0; i < STEPS.length - 1; i++) { setStep(i); await wait(450); }
    setStep(3);
    const orderData = buildOrderData(form, paymentStatus);
    const order = await createOrder(orderData);
    if (!order || !order.id) throw new Error('ما انشأ الطلب');
    localStorage.setItem(PENDING_KEY, JSON.stringify({ orderId: order.id, at: Date.now() }));
    setStep(4);
    const phone = '972' + form.phone.replace(/^0/, '').replace(/[^\d]/g, '');
    await base44.entities.OrderCheckoutMeta.create({
      order_id: order.id, order_number: orderData.order_number,
      delivery_reference: form.method === 'delivery' ? genDeliveryRef() : '',
      fulfillment_method: form.method,
      payment_method: form.payment,
      payment_status: paymentStatus,
      email: form.email || '',
      city: form.city || '', street: form.street || '', building: form.building || '', entrance: form.entrance || '', floor: form.floor || '', apartment: form.apartment || '',
      latitude: form.latitude ?? null, longitude: form.longitude ?? null,
      delivery_notes: form.deliveryNotes || '',
      restaurant_notes: form.restaurantNotes || '',
      cash_denomination: form.cashDenomination === 'yes' ? 'yes' : '',
      restaurant_name: restaurant?.name || '',
      total: orderData.amount,
    }).catch(() => null);
    // Loyalty: coupon + points redemption + pending earn
    if (form.couponCode) await markCouponUsed(form.couponCode).catch(() => null);
    if (form.pointsUsed > 0) await redeemPoints({ phone, points: form.pointsUsed, order_id: order.id, order_number: orderData.order_number }).catch(() => null);
    await recordPendingPoints({ order_id: order.id, order_number: orderData.order_number, phone, amount: orderData.amount }).catch(() => null);
    clearCart(); clearCheckout();
    localStorage.setItem('active_order', JSON.stringify({ id: order.id, eta: 30 }));
    localStorage.removeItem(PENDING_KEY);
    await wait(400);
    navigate(`/order-confirmation/${order.id}`, { replace: true });
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      if (pending && pending.orderId && Date.now() - pending.at < 120000 && !isPaidReturn) {
        navigate(`/order-confirmation/${pending.orderId}`, { replace: true });
        return;
      }
    } catch {}

    (async () => {
      const form = getCheckout();
      if (!items.length || !form) { navigate('/cart', { replace: true }); return; }
      try {
        if (isPaidReturn) {
          // Verify Stripe payment before creating the order
          setStep(1);
          const verified = await verifyStripeSession(sessionId);
          if (!verified?.paid) throw new Error('الدفع ما تم. سلتك محفوظة، جرّب مرة ثانية.');
          await finalize(form, 'paid');
        } else {
          const paymentStatus = (form.payment === 'cash' || form.payment === 'card_on_delivery') ? 'cash_on_delivery_pending' : 'pending';
          await finalize(form, paymentStatus);
        }
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
        <p className="text-on-surface-variant mb-6 text-sm">{error}. سلتك وتفاصيلك محفوظة.</p>
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