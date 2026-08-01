import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { statusLabel, stageIndex, STAGES, osmEmbed, METHOD_LABELS, PAYMENT_LABELS } from '@/lib/orderUtils';
import OrderStatusTimeline from '@/components/checkout/OrderStatusTimeline';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function OrderTracking() {
  const { orderId, id } = useParams();
  const navigate = useNavigate();
  const oid = orderId || id;
  const [order, setOrder] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const load = async () => {
    try {
      const o = await getOrderById(oid);
      setOrder(o || null);
      const metas = await base44.entities.OrderCheckoutMeta.filter({ order_id: Number(oid) }).catch(() => []);
      setMeta((metas || [])[0] || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [oid]);

  if (loading) return <div className="flex items-center justify-center py-32"><div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return <div className="text-center py-32"><p className="text-on-surface-variant mb-4">الطلب غير موجود</p><button onClick={() => navigate('/orders')} className="text-primary underline">طلباتي</button></div>;

  const si = stageIndex(order.status);
  const stage = STAGES[Math.min(si, STAGES.length - 1)];
  const isDelivery = (meta?.fulfillment_method || 'delivery') === 'delivery';
  const mapUrl = isDelivery && meta ? osmEmbed(meta.latitude, meta.longitude) : null;
  const delivered = order.status === 'delivered' || order.status === 'picked_up_by_customer';

  return (
    <div className="pb-10">
      {/* Status header */}
      <div className="px-4 py-4 bg-surface-container/50">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/orders')} className="flex items-center gap-1 text-on-surface-variant text-sm"><Icon name="arrow_forward" className="text-[18px]" />طلباتي</button>
          <span className="text-[11px] text-on-surface-variant">آخر تحديث: {new Date(order.updated_at || order.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-[11px] text-on-surface-variant">رقم الطلب</p>
        <h1 className="text-xl font-bold text-primary mb-2">{meta?.order_number || order.order_number || `TAM-${order.id}`}</h1>
        <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center"><Icon name={stage.icon} className="text-primary" /></div><div><p className="font-bold">{stage.label}</p><p className="text-sm text-on-surface-variant">{stage.desc}</p></div></div>
        <div className="flex gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1 text-on-surface-variant"><Icon name="schedule" className="text-[16px]" /><span>الوقت المتوقع: {order.estimated_time || '30–45'} دقيقة</span></div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Timeline */}
        <OrderStatusTimeline status={order.status} />

        {/* Map */}
        {isDelivery && mapUrl && (
          <div className="bg-surface-container rounded-2xl p-3">
            <h3 className="font-bold text-sm mb-2">موقع التوصيل</h3>
            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-outline-variant/30"><iframe title="map" className="w-full h-full" src={mapUrl} /></div>
            <p className="text-[11px] text-on-surface-variant mt-2 flex items-center gap-1"><Icon name="info" className="text-[14px]" />موقع المندوب مش متاح حاليًا، لكن حالة الطلب محدثة.</p>
          </div>
        )}
        {isDelivery && !mapUrl && (
          <div className="bg-surface-container rounded-2xl p-4 text-center text-on-surface-variant text-sm"><Icon name="location_off" className="text-2xl block mb-1" />ما في إحداثيات للموقع. المندوب رح يتواصل معك.</div>
        )}

        {/* Courier */}
        <div className="bg-surface-container rounded-2xl p-4">
          <h3 className="font-bold text-sm mb-2">المندوب</h3>
          {order.courier_id ? (
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Icon name="person" className="text-primary" /></div><div className="flex-1"><p className="font-semibold text-sm">مندوب التوصيل</p><p className="text-[11px] text-on-surface-variant">المركبة: دراجة نارية</p></div><a href="tel:0" className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center"><Icon name="phone" /></a></div>
          ) : <p className="text-sm text-on-surface-variant">لسا ما تعيّن مندوب. رح يظهر هون أول ما يتعيّن.</p>}
        </div>

        {/* Details */}
        <div className="bg-surface-container rounded-2xl p-4">
          <button onClick={() => setShowDetails(s => !s)} className="w-full flex justify-between items-center"><h3 className="font-bold text-sm">تفاصيل الطلب</h3><Icon name={showDetails ? 'expand_less' : 'expand_more'} /></button>
          {showDetails && (
            <div className="mt-3 space-y-2 text-sm">
              {(order.order_items || []).map((it, i) => (
                <div key={i} className="flex justify-between"><div><span className="text-primary font-bold">{it.quantity}×</span> {it.name}{it.extras?.length ? ` + ${it.extras.map(e => e.name).join('، ')}` : ''}</div><span>₪{Math.round((it.price || 0) * it.quantity)}</span></div>
              ))}
              <div className="border-t border-outline-variant/30 pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-on-surface-variant"><span>طريقة الاستلام</span><span>{METHOD_LABELS[meta?.fulfillment_method] || order.channel}</span></div>
                <div className="flex justify-between text-on-surface-variant"><span>طريقة الدفع</span><span>{PAYMENT_LABELS[meta?.payment_method] || '—'}</span></div>
                {meta?.delivery_reference && <div className="flex justify-between text-on-surface-variant"><span>مرجع التوصيل</span><span>{meta.delivery_reference}</span></div>}
                {order.address && <div className="text-on-surface-variant"><span className="block mb-0.5">العنوان</span>{order.address}</div>}
                <div className="flex justify-between font-bold pt-1"><span>الإجمالي</span><span className="text-primary">₪{Math.round(order.amount)}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {delivered ? (
            <button onClick={() => navigate(`/orders/${order.id}/rate`)} className="flex-1 h-12 bg-primary text-on-primary rounded-full font-bold">قيّم الطلب</button>
          ) : (
            <button onClick={() => navigate(`/orders/${order.id}/help`)} className="flex-1 h-12 bg-surface-container-high text-on-surface rounded-full font-bold">تواصل / مشكلة</button>
          )}
        </div>
      </div>
    </div>
  );
}