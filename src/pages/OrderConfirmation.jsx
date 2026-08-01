import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { METHOD_LABELS, PAYMENT_LABELS, statusLabel, paymentStatusLabel } from '@/lib/orderUtils';
import { getLoyaltyConfig, expectedPoints } from '@/lib/loyaltyApi';
import PointsEarnedBanner from '@/components/tamam/customer/PointsEarnedBanner';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [meta, setMeta] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const o = await getOrderById(orderId);
        setOrder(o || null);
        const metas = await base44.entities.OrderCheckoutMeta.filter({ order_id: Number(orderId) }).catch(() => []);
        setMeta((metas || [])[0] || null);
        getLoyaltyConfig().then(setConfig).catch(() => {});
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [orderId]);

  if (loading) return <div className="flex items-center justify-center py-32"><div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return <div className="text-center py-32"><p className="text-on-surface-variant mb-4">الطلب غير موجود</p><button onClick={() => navigate('/')} className="text-primary underline">العودة للرئيسية</button></div>;

  const isDelivery = (meta?.fulfillment_method || 'delivery') === 'delivery';
  const next = isDelivery
    ? ['المطعم بأكد الطلب', 'بيجهزوا طلبك', 'بنعيّن مندوب', 'المندوب بستلم الطلب', 'طلبك بوصلك']
    : ['المطعم بأكد الطلب', 'بيجهزوا طلبك', 'بنبعتلك لما يصير جاهز'];

  return (
    <div className="pt-6 pb-10 px-4">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-3"><Icon name="check_circle" className="text-primary text-5xl" /></div>
        <h1 className="text-2xl font-bold mb-1">تم استلام طلبك!</h1>
        <p className="text-on-surface-variant text-sm">وصلنا طلبك وعم نستنى تأكيد المطعم.</p>
      </div>

      <div className="bg-surface-container rounded-2xl p-4 mb-5 space-y-3">
        <Row label="رقم الطلب" value={meta?.order_number || order.order_number || `TAM-${order.id}`} highlight />
        {isDelivery && meta?.delivery_reference && <Row label="مرجع التوصيل" value={meta.delivery_reference} />}
        <Row label="العميل" value={order.customer_name} />
        <Row label="المطعم" value={meta?.restaurant_name || order.kitchen_id} />
        <Row label="طريقة الاستلام" value={METHOD_LABELS[meta?.fulfillment_method] || order.channel} />
        <Row label="طريقة الدفع" value={PAYMENT_LABELS[meta?.payment_method] || '—'} />
        <Row label="حالة الدفع" value={paymentStatusLabel(meta?.payment_status)} />
        <Row label="الإجمالي" value={`₪${Math.round(order.amount)}`} highlight />
      </div>
      {expectedPoints(config, order.amount) > 0 && (
        <div className="mb-5"><PointsEarnedBanner points={expectedPoints(config, order.amount)} pending /></div>
      )}

      <h2 className="font-bold mb-3">شو بصير هسا؟</h2>
      <div className="bg-surface-container rounded-2xl p-4 space-y-3 mb-6">
        {next.map((n, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">{i + 1}</div>
            <span className="text-sm">{n}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <button onClick={() => navigate(`/orders/${order.id}`)} className="w-full h-14 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2">تابع طلبك<Icon name="chevron_left" /></button>
        <button onClick={() => navigate('/orders')} className="w-full text-on-surface-variant font-semibold">شوف كل طلباتك</button>
        <button onClick={() => navigate(`/orders/${order.id}/help`)} className="w-full text-primary font-semibold">تواصل مع TAMAM</button>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-on-surface-variant text-sm">{label}</span>
      <span className={`font-bold ${highlight ? 'text-primary text-lg' : ''}`}>{value}</span>
    </div>
  );
}