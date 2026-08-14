import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listPartnerOrders, updateOrderStatus } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';

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

const ACTION_BY_STATUS = {
  pending: { status: 'accepted', label: 'اقبل الطلب' },
  accepted: { status: 'preparing', label: 'ابدأ التحضير' },
  preparing: { status: 'ready', label: 'جاهز' },
  ready: { status: 'delivered', label: 'تم التسليم' },
};

const STATUS_BADGE = {
  pending: { label: 'جديد', cls: 'bg-tamam-green/20 text-tamam-green-bright' },
  accepted: { label: 'مقبول', cls: 'bg-tamam-gold-dark/30 text-tamam-gold' },
  preparing: { label: 'بالتحضير', cls: 'bg-tamam-green/15 text-tamam-green-bright' },
  ready: { label: 'جاهز', cls: 'bg-tamam-green-bright text-tamam-ink' },
};

export default function PartnerOrders() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [tab, setTab] = useState('new');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    listPartnerOrders(rid, tab).then(setOrders).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid, tab]);

  const advance = async (e, o) => {
    e.stopPropagation();
    const next = ACTION_BY_STATUS[o.status];
    if (!next) return;
    setBusyId(o.id);
    try { await updateOrderStatus(rid, o.id, next.status); load(); } catch {} finally { setBusyId(null); }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-tamam-text">الطلبات</h1>
          <p className="text-tamam-text-muted text-xs mt-0.5">{orders.length} طلب في القسم</p>
        </div>
        <button className="w-10 h-10 flex items-center justify-center bg-tamam-surface-high rounded-full text-tamam-text active:scale-95"><span className="material-symbols-outlined text-[22px]">filter_list</span></button>
      </div>

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
            const ff = FULFILLMENT[o.fulfillment] || FULFILLMENT.pickup;
            const items = Array.isArray(o.items_preview) ? o.items_preview : [];
            const action = ACTION_BY_STATUS[o.status];
            const badge = STATUS_BADGE[o.status];
            return (
              <div key={o.id} onClick={() => navigate(`/partner/orders/${o.id}`)} className="bg-tamam-surface rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 cursor-pointer active:scale-[0.99]">
                <div className={`absolute right-0 top-0 bottom-0 w-1 ${ff.accent}`} />
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-base text-tamam-text">#{o.parent_order_number || o.id?.slice(-6)}</span>
                      {badge && <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>}
                      <span className="px-2 py-0.5 bg-tamam-surface-high text-tamam-text-muted rounded text-[10px]">{timeAgo(o.created_date)}</span>
                    </div>
                    <p className="text-tamam-text-muted text-xs">{o.customer_name || 'زبون'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 bg-tamam-surface-high px-2 py-1 rounded text-tamam-text"><span className="material-symbols-outlined text-[16px]">{ff.icon}</span><span className="text-[10px]">{ff.label}</span></div>
                    <span className="font-bold text-sm text-tamam-text" dir="ltr">₪{Math.round(o.total || 0)}</span>
                  </div>
                </div>

                {o.offer_title && (
                  <div className="flex items-center gap-1 bg-tamam-green/10 text-tamam-green-bright text-[11px] px-2 py-1 rounded w-fit">
                    <span className="material-symbols-outlined text-[14px]">sell</span>{o.offer_title}
                  </div>
                )}

                <div className="h-px bg-tamam-outline/30 w-full my-1" />
                {items.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {items.slice(0, 2).map((it, i) => (
                      <div key={i} className="flex items-center text-sm text-tamam-text">
                        <span className="text-tamam-green-bright bg-tamam-green/15 w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold shrink-0 ml-1.5">{it.quantity || 1}x</span>
                        <span className="truncate">{it.name}</span>
                      </div>
                    ))}
                    {items.length > 2 && <span className="text-tamam-text-muted text-[11px]">+{items.length - 2} أصناف أخرى</span>}
                  </div>
                ) : (
                  <p className="text-tamam-text-muted text-xs">{o.items_count || 0} صنف</p>
                )}

                {o.customer_notes && (
                  <div className="flex items-start gap-1.5 text-tamam-text text-[11px] bg-tamam-surface-low px-2.5 py-2 rounded-lg">
                    <span className="material-symbols-outlined text-[14px] text-tamam-gold shrink-0">notes</span>
                    <span className="text-tamam-text-muted truncate">{o.customer_notes}</span>
                  </div>
                )}

                {action && (
                  <button onClick={(e) => advance(e, o)} disabled={busyId === o.id} className="w-full bg-tamam-green-bright text-tamam-ink text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 mt-1">
                    <span className="material-symbols-outlined text-[16px]">{o.status === 'pending' ? 'check' : 'play_arrow'}</span>{action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
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