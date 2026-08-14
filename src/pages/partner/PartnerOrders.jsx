import { useState, useEffect } from 'react';
import { usePartner } from '@/lib/partnerContext';
import { listPartnerOrders, updateOrderStatus } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import OrderDetailSheet from '@/components/partner/OrderDetailSheet';

const TABS = [
  { key: 'new', label: 'جديدة' },
  { key: 'preparing', label: 'بالتحضير' },
  { key: 'ready', label: 'جاهزة' },
  { key: 'done', label: 'خلصت' },
];

const FULFILLMENT = {
  delivery: { icon: 'two_wheeler', label: 'توصيل', accent: 'bg-tamam-error' },
  pickup: { icon: 'storefront', label: 'استلام', accent: 'bg-tamam-gold' },
  dinein: { icon: 'restaurant', label: 'محلي', accent: 'bg-tamam-text-muted' },
  dine_in: { icon: 'restaurant', label: 'محلي', accent: 'bg-tamam-text-muted' },
};

const NEXT_ACTION = {
  new: { status: 'preparing', label: 'ابدأ التحضير' },
  preparing: { status: 'ready', label: 'جاهز للاستلام' },
  ready: { status: 'delivered', label: 'تم التسليم' },
};

export default function PartnerOrders() {
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [tab, setTab] = useState('new');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    listPartnerOrders(rid, tab).then(setOrders).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid, tab]);

  const advance = async (o) => {
    const next = NEXT_ACTION[tab] || NEXT_ACTION[o.status];
    if (!next) return;
    setBusyId(o.id);
    try { await updateOrderStatus(rid, o.id, next.status); load(); } catch {} finally { setBusyId(null); }
  };

  const parseItems = (o) => {
    if (Array.isArray(o.items) && o.items.length) return o.items;
    if (typeof o.items === 'string') { try { const p = JSON.parse(o.items); if (Array.isArray(p)) return p; } catch {} }
    return [];
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-tamam-text">الطلبات</h1>
          <p className="text-tamam-text-muted text-xs mt-0.5">{orders.length} طلب قيد التنفيذ</p>
        </div>
        <button className="w-10 h-10 flex items-center justify-center bg-tamam-surface-high rounded-full text-tamam-text active:scale-95">
          <span className="material-symbols-outlined text-[22px]">filter_list</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${tab === t.key ? 'bg-tamam-green-bright text-tamam-ink shadow' : 'bg-tamam-surface-low text-tamam-text-muted'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 skeleton-t rounded-2xl" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title="ما قدرنا نحمّل الطلبات" actionLabel="إعادة" onAction={load} />
      ) : orders.length === 0 ? (
        <EmptyState icon="📦" title="ما في طلبات بهاد القسم" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const ff = FULFILLMENT[o.fulfillment_type] || FULFILLMENT[o.fulfillment_type === 'delivery' ? 'delivery' : 'pickup'];
            const items = parseItems(o);
            const action = NEXT_ACTION[tab];
            return (
              <div key={o.id} className="bg-tamam-surface rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2">
                <div className={`absolute right-0 top-0 bottom-0 w-1 ${ff.accent}`} />
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base text-tamam-text">#{o.parent_order_number || o.id?.slice(-6)}</span>
                      <span className="px-2 py-0.5 bg-tamam-surface-high text-tamam-text-muted rounded text-[10px]">{timeAgo(o.created_date)}</span>
                    </div>
                    <p className="text-tamam-text-muted text-xs">{o.customer_name || 'زبون'}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-tamam-surface-high px-2 py-1 rounded text-tamam-text">
                    <span className="material-symbols-outlined text-[16px]">{ff.icon}</span>
                    <span className="text-[10px]">{ff.label}</span>
                  </div>
                </div>
                <div className="h-px bg-tamam-outline/30 w-full my-1" />
                {items.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {items.slice(0, 3).map((it, i) => (
                      <div key={i} className="flex justify-between items-center text-sm text-tamam-text">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="text-tamam-green-bright bg-tamam-green/15 w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold shrink-0">{it.quantity || 1}x</span>
                          <span className="truncate">{it.name || it.item_name}</span>
                        </span>
                        {it.price != null && <span className="text-tamam-text-muted text-xs shrink-0">₪{Math.round(it.price * (it.quantity || 1))}</span>}
                      </div>
                    ))}
                    {o.customer_note && (
                      <div className="flex items-center gap-1 mt-1 text-tamam-error text-[11px] bg-tamam-error/10 px-2 py-1 rounded w-fit">
                        <span className="material-symbols-outlined text-[14px]">warning</span>{o.customer_note}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-tamam-text-muted text-xs">{o.items_count || 0} صنف</p>
                )}
                <div className="flex justify-between items-center mt-1 pt-2 border-t border-tamam-outline/30">
                  <div className="font-bold text-base text-tamam-text" dir="ltr">₪{Math.round(o.total || 0)}</div>
                  <div className="flex gap-2">
                    <button onClick={() => setDetail({ order: o })} className="bg-tamam-surface-high text-tamam-text text-xs font-bold px-3 py-2 rounded-lg active:scale-95">تفاصيل</button>
                    {action && (
                      <button onClick={() => advance(o)} disabled={busyId === o.id} className="bg-tamam-green-bright text-tamam-ink text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1 active:scale-95 disabled:opacity-50">
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>{action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OrderDetailSheet open={!!detail} order={detail} restaurantId={rid} onClose={() => setDetail(null)} onChanged={load} />
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'الآن';
  if (diff < 60) return `منذ ${Math.round(diff)} دقيقة`;
  const h = Math.round(diff / 60);
  return `منذ ${h} ساعة`;
}