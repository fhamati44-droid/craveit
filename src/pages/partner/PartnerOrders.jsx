import { useState, useEffect } from 'react';
import { usePartner } from '@/lib/partnerContext';
import { listPartnerOrders } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import OrderDetailSheet from '@/components/partner/OrderDetailSheet';

const TABS = [
  { key: 'new', label: 'جديدة' },
  { key: 'preparing', label: 'بالتحضير' },
  { key: 'ready', label: 'جاهزة' },
  { key: 'done', label: 'خلصت' },
];

const STATUS_LABEL = {
  pending: 'جديد', accepted: 'مقبول', preparing: 'بالتحضير', ready: 'جاهز',
  picked_up: 'استُلم', on_the_way: 'بالطريق', delivered: 'تم التوصيل',
  rejected: 'مرفوض', cancelled: 'ملغى',
};

export default function PartnerOrders() {
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [tab, setTab] = useState('new');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    listPartnerOrders(rid, tab).then(setOrders).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid, tab]);

  return (
    <div className="p-4 space-y-3">
      <h1 className="font-bold text-lg">الطلبات</h1>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${tab === t.key ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface text-tamam-text-muted border border-tamam-outline/30'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-20 skeleton-t rounded-2xl" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title="ما قدرنا نحمّل الطلبات" actionLabel="إعادة" onAction={load} />
      ) : orders.length === 0 ? (
        <EmptyState icon="📦" title="ما في طلبات بهاد القسم" />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <button key={o.id} onClick={() => setDetail({ order: o })} className="w-full text-right bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3 active:scale-[0.99]">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm">{o.parent_order_number || `#${o.id?.slice(-6)}`}</span>
                <span className="text-[11px] text-tamam-text-muted">{STATUS_LABEL[o.status] || o.status}</span>
              </div>
              <p className="text-xs text-tamam-text-muted truncate">{o.customer_name || 'زبون'} · {o.items_count} صنف</p>
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-[11px] text-tamam-text-muted">{new Date(o.created_date).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-primary text-sm font-bold" dir="ltr">₪{Math.round(o.total || 0)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <OrderDetailSheet open={!!detail} order={detail} restaurantId={rid} onClose={() => setDetail(null)} onChanged={load} />
    </div>
  );
}