import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { getCheckout, setCheckout } from '@/lib/checkoutStore';
import { METHOD_LABELS, PAYMENT_LABELS } from '@/lib/orderUtils';
import { getLoyaltyAccount, getLoyaltyConfig, expectedPoints, redeemPoints, markCouponUsed } from '@/lib/loyaltyApi';
import { createStripeSession, isInIframe } from '@/lib/stripeApi';
import CheckoutHeader from '@/components/checkout/CheckoutHeader';
import CouponInput from '@/components/tamam/customer/CouponInput';
import PointsEarnedBanner from '@/components/tamam/customer/PointsEarnedBanner';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function CheckoutReview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { items, restaurant, subtotal, total, deliveryFee } = useCart();
  const [form, setForm] = useState(() => getCheckout());
  const [account, setAccount] = useState(null);
  const [config, setConfig] = useState(null);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [coupon, setCoupon] = useState(null); // {code, discount, coupon}
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    if (!items.length) { navigate('/cart', { replace: true }); return; }
    if (!form) { navigate('/checkout', { replace: true }); return; }
    const norm = '972' + (form.phone || '').replace(/^0/, '').replace(/[^\d]/g, '');
    if (norm.length >= 10) {
      getLoyaltyAccount(norm).then(setAccount).catch(() => {});
      getLoyaltyConfig().then(setConfig).catch(() => {});
    }
  }, []);

  if (!form || !items.length) return null;
  const fee = form.method === 'delivery' ? (deliveryFee ?? 0) : 0;
  const base = subtotal + fee;
  const balance = account?.account?.balance || 0;
  const redeemValue = config?.redeem_value_per_point || 1;
  const minPayable = base * ((config?.min_payable_fraction ?? 0.5));
  const maxPointsDiscount = Math.max(0, base - minPayable);
  const maxPointsUsable = Math.min(balance, Math.floor(maxPointsDiscount / redeemValue));
  const pointsDiscount = Math.min(pointsUsed, maxPointsUsable) * redeemValue;
  const couponDiscount = coupon?.discount || 0;
  const grand = Math.max(minPayable, base - couponDiscount - pointsDiscount);
  const pts = expectedPoints(config, grand);

  const persist = (patch) => {
    const next = { ...form, ...patch, pointsUsed: Math.min(pointsUsed, maxPointsUsable), couponCode: coupon?.code || '', couponDiscount, pointsDiscount };
    setCheckout(next);
  };

  const submit = async () => {
    persist({});
    if (form.payment === 'cash' || form.payment === 'card_on_delivery') {
      navigate('/checkout/processing');
      return;
    }
    // Stripe (card / google_pay)
    if (isInIframe()) {
      setPayError('الدفع بالبطاقة يعمل فقط من التطبيق المنشور. انشر التطبيق أولًا ثم جرّب.');
      return;
    }
    setPaying(true); setPayError('');
    try {
      const res = await createStripeSession({
        amount: grand,
        description: `طلب TAMAM · ${restaurant?.name || ''} (${items.length} أصناف)`,
        orderRef: `REV-${Date.now()}`,
        email: form.email || undefined,
      });
      if (!res?.url) throw new Error('ما قدرنا نبدأ الدفع.');
      window.location.href = res.url;
    } catch (e) {
      setPayError(e.message || 'ما قدرنا نبدأ الدفع. جرّب مرة ثانية.');
      setPaying(false);
    }
  };

  const address = [form.city, form.street, form.building && `بناية ${form.building}`, form.entrance && `مدخل ${form.entrance}`, form.floor && `طابق ${form.floor}`, form.apartment && `شقة ${form.apartment}`].filter(Boolean).join('، ');
  const cancelled = params.get('cancelled') === '1';

  return (
    <div dir="rtl" className="font-tamam min-h-[100dvh] bg-surface text-on-surface max-w-[480px] mx-auto pb-32">
      <CheckoutHeader step={4} title="راجع طلبك" />
      <div className="px-4 py-4 space-y-4">
        {cancelled && <div className="bg-error/10 border border-error/30 rounded-xl p-3 text-sm text-error">رجعت من الدفع بدون إكمال. سلتك وتفاصيلك محفوظة، تقدر تكمل.</div>}
        <Section title="بيانات العميل" onEdit={() => navigate('/checkout')}>
          <p className="font-semibold">{form.name}</p>
          <p className="text-sm text-on-surface-variant" dir="ltr">+972{form.phone.replace(/^0/, '').replace(/[^\d]/g, '')}</p>
        </Section>
        <Section title="طريقة الدفع" onEdit={() => navigate('/checkout')}>
          <p className="font-semibold">{PAYMENT_LABELS[form.payment]}</p>
        </Section>
        {form.method === 'delivery' && (
          <Section title="العنوان" onEdit={() => navigate('/checkout')}>
            <p className="font-semibold">{address || '—'}</p>
          </Section>
        )}
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

        <CouponInput
          amount={base}
          phone={'972' + form.phone.replace(/^0/, '').replace(/[^\d]/g, '')}
          onApplied={(c) => setCoupon(c)}
          onClear={() => setCoupon(null)}
        />

        {balance > 0 && (
          <div className="bg-surface-container rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><Icon name="stars" className="text-primary" />استخدم نقاطك</h3>
            <p className="text-[11px] text-on-surface-variant mb-2">رصيدك: {balance} نقطة. أقصى استخدام: {maxPointsUsable} نقطة (₪{maxPointsUsable * redeemValue}).</p>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={maxPointsUsable} value={Math.min(pointsUsed, maxPointsUsable)} onChange={e => setPointsUsed(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-sm font-bold w-20 text-left">{Math.min(pointsUsed, maxPointsUsable)} نقطة</span>
            </div>
            {pointsUsed > 0 && <p className="text-[11px] text-primary mt-1">خصم ₪{pointsDiscount} · يبقى {balance - Math.min(pointsUsed, maxPointsUsable)} نقطة بحسابك.</p>}
          </div>
        )}

        <PointsEarnedBanner points={pts} pending />

        <div className="bg-surface-container/40 rounded-2xl p-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-on-surface-variant"><span>مجموع المنتجات</span><span>₪{Math.round(subtotal)}</span></div>
            <div className="flex justify-between text-on-surface-variant"><span>رسوم التوصيل</span><span>{form.method === 'delivery' ? (fee === 0 ? 'مجاني' : `₪${Math.round(fee)}`) : '—'}</span></div>
            {couponDiscount > 0 && <div className="flex justify-between text-primary"><span>كوبون {coupon.code}</span><span>-₪{Math.round(couponDiscount)}</span></div>}
            {pointsDiscount > 0 && <div className="flex justify-between text-primary"><span>خصم النقاط</span><span>-₪{Math.round(pointsDiscount)}</span></div>}
            <div className="flex justify-between font-bold text-base pt-1 border-t border-outline-variant/30 mt-1"><span>الإجمالي</span><span className="text-primary">₪{Math.round(grand)}</span></div>
          </div>
        </div>
        <p className="text-center text-xs text-on-surface-variant">رح يوصلك رقم طلب وتقدر تتابع كل مرحلة.</p>
      </div>
      <div className="fixed bottom-0 inset-x-0 px-4 pb-4 pt-3 bg-gradient-to-t from-surface via-surface/95 to-transparent z-40 max-w-[480px] mx-auto">
        {payError && <p className="text-error text-xs text-center mb-2">{payError}</p>}
        <button onClick={submit} disabled={paying} className="w-full h-14 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-50">
          {paying ? 'عم نوجّهك للدفع...' : <>تأكيد وتنفيذ الطلب · ₪{Math.round(grand)}<Icon name="keyboard_double_arrow_left" /></>}
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