import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrdersByPhone } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { stageIndex, STAGES } from '@/lib/orderUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const TERMINAL = new Set(['delivered', 'picked_up_by_customer', 'cancelled', 'rejected']);

export default function HomepageActiveOrderCard() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    const phone = localStorage.getItem('user_phone');
    if (!phone) return;
    const norm = '972' + phone.replace(/^0/, '').replace(/[^\d]/g, '');
    let alive = true;
    (async () => {
      try {
        const list = await getOrdersByPhone(norm);
        const active = (list || []).find(o => !TERMINAL.has(o.status));
        if (active && alive) {
          setOrder(active);
          const metas = await base44.entities.OrderCheckoutMeta.filter({ order_id: active.id }).catch(() => []);
          if (alive) setMeta((metas || [])[0] || null);
        }
      } catch {}
    })();
    const t = setInterval(async () => {
      try {
        const list = await getOrdersByPhone(norm);
        const active = (list || []).find(o => !TERMINAL.has(o.status));
        if (active && alive) setOrder(active); else if (alive) setOrder(null);
      } catch {}
    }, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!order) return null;
  const si = stageIndex(order.status);
  const stage = STAGES[Math.min(si, STAGES.length - 1)];
  const ref = meta?.order_number || order.order_number || `TAM-${order.id}`;
  const pct = Math.round((si / (STAGES.length - 1)) * 100);

  return (
    <section className="px-4 pt-3">
      <button onClick={() => navigate(`/orders/${order.id}`)} className="block w-full text-right bg-surface-container border border-primary/30 rounded-2xl p-3 active:scale-[0.99]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center"><Icon name={stage.icon} className="text-primary" /></div>
            <div>
              <p className="font-bold text-sm">{stage.label}</p>
              <p className="text-[11px] text-on-surface-variant">{ref} · {meta?.restaurant_name || `مطعم #${order.kitchen_id}`}</p>
            </div>
          </div>
          <span className="text-primary text-xs font-bold flex items-center gap-1">تابع الطلب<Icon name="chevron_left" className="text-[16px]" /></span>
        </div>
        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
        <p className="text-[11px] text-on-surface-variant mt-1.5">متوقع يوصل خلال {order.estimated_time || '30–45'} دقيقة</p>
      </button>
    </section>
  );
}