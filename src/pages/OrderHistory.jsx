import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrdersByPhone } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { statusLabel } from '@/lib/orderUtils';
import { useCart } from '@/lib/CartContext';
import { getLoyaltyAccount } from '@/lib/loyaltyApi';
import { buildReorderCart } from '@/lib/reorder';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const ACTIVE = new Set(['new', 'pending', 'pending_payment', 'confirmed', 'preparing', 'ready', 'courier_assigned', 'picked_up', 'on_the_way', 'arriving_soon']);
const TERMINAL = new Set(['delivered', 'picked_up_by_customer', 'cancelled', 'rejected']);

export default function OrderHistory() {
  const navigate = useNavigate();
  const { addItem, restaurant: cartRest, clearCart } = useCart();
  const [phone, setPhone] = useState(localStorage.getItem('user_phone') || '');
  const [orders, setOrders] = useState([]);
  const [pointsMap, setPointsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(null);

  const norm = (p) => '972' + p.replace(/^0/, '').replace(/[^\d]/g, '');

  const load = async (p) => {
    if (!p) return;
    setLoading(true);
    try {
      const list = await getOrdersByPhone(norm(p));
      const ids = (list || []).map(o => o.id);
      if (ids.length) {
        const metas = await base44.entities.OrderCheckoutMeta.list().catch(() => []);
        const map = {}; (metas || []).forEach(m => { map[m.order_id] = m; });
        setOrders((list || []).map(o => ({ ...o, _meta: map[o.id] })));
      } else setOrders([]);
      const acc = await getLoyaltyAccount(norm(p)).catch(() => null);
      const pm = {};
      (acc?.transactions || []).forEach(t => { if (t.order_id && t.type === 'earn') pm[t.order_id] = (pm[t.order_id] || 0) + (t.status === 'reversed' ? 0 : t.points); });
      setPointsMap(pm);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (phone) load(phone); }, []);

  const reorder = async (o) => {
    setReordering(o.id);
    if (cartRest && o && cartRest.id !== o.kitchen_id) clearCart();
    const res = await buildReorderCart(o, { addItem });
    setReordering(null);
    if (!res.ok) { alert(res.reason || 'ما قدرنا نعيد الطلب.'); return; }
    if (res.changed.length || res.missing.length) alert('صار تغيير على بعض الأصناف أو الأسعار. راجع السلة قبل التأكيد.');
    navigate('/cart');
  };

  if (!phone) {
    return (
      <div className="pt-10 px-4">
        <h1 className="text-xl font-bold mb-2">طلباتي</h1>
        <p className="text-on-surface-variant text-sm mb-6">دخل رقم هاتفك لشوف طلباتك.</p>
        <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" dir="ltr" className="w-full bg-surface-container rounded-xl p-3 outline-none mb-3" placeholder="05X-XXXXXXX" />
        <button onClick={() => { localStorage.setItem('user_phone', phone); load(phone); }} className="w-full h-12 bg-primary text-on-primary rounded-full font-bold">عرض الطلبات</button>
      </div>
    );
  }

  const active = orders.filter(o => !TERMINAL.has(o.status));
  const previous = orders.filter(o => TERMINAL.has(o.status));

  return (
    <div className="pt-4 pb-8">
      <div className="px-4 mb-4"><h1 className="text-xl font-bold">طلباتي</h1><p className="text-on-surface-variant text-sm">{phone}</p></div>
      {loading ? <div className="flex justify-center py-10"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="px-4 space-y-6">
          <section>
            <h2 className="font-bold mb-3 flex items-center gap-2"><Icon name="autorenew" className="text-primary" />طلبات جارية ({active.length})</h2>
            {active.length ? active.map(o => <OrderCard key={o.id} o={o} active points={pointsMap[o.id]} navigate={navigate} />) : <p className="text-on-surface-variant text-sm">ما في طلبات جارية.</p>}
          </section>
          <section>
            <h2 className="font-bold mb-3 flex items-center gap-2"><Icon name="history" className="text-primary" />طلبات سابقة ({previous.length})</h2>
            {previous.length ? previous.map(o => <OrderCard key={o.id} o={o} points={pointsMap[o.id]} navigate={navigate} onReorder={() => reorder(o)} reordering={reordering === o.id} />) : <p className="text-on-surface-variant text-sm">ما في طلبات سابقة.</p>}
          </section>
          {orders.length === 0 && <p className="text-center text-on-surface-variant py-10">ما لقينا طلبات على هالرقم.</p>}
        </div>
      )}
    </div>
  );
}

function OrderCard({ o, active, points, navigate, onReorder, reordering }) {
  const ref = o._meta?.order_number || o.order_number || `TAM-${o.id}`;
  const delivered = ['delivered', 'picked_up_by_customer'].includes(o.status);
  return (
    <div className="bg-surface-container rounded-2xl p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div><p className="font-bold text-sm">{ref}</p><p className="text-[11px] text-on-surface-variant">{o._meta?.restaurant_name || `مطعم #${o.kitchen_id}`}</p></div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>{statusLabel(o.status)}</span>
      </div>
      <p className="text-[11px] text-on-surface-variant mb-2">{new Date(o.created_at).toLocaleDateString('ar')} · ₪{Math.round(o.amount)}</p>
      {delivered && points ? (
        <p className="text-[11px] text-primary font-bold mb-2 flex items-center gap-1"><Icon name="stars" className="text-[14px]" />ربحت {points} نقطة من هذا الطلب</p>
      ) : null}
      <div className="flex gap-2">
        <button onClick={() => navigate(`/orders/${o.id}`)} className="flex-1 h-9 bg-primary/10 text-primary rounded-full text-sm font-bold">{active ? 'تابع الطلب' : 'شوف التفاصيل'}</button>
        {!active && delivered && <button onClick={() => navigate(`/orders/${o.id}/rate`)} className="flex-1 h-9 bg-surface-container-high text-on-surface rounded-full text-sm font-bold">قيّم</button>}
        {!active && delivered && onReorder && <button onClick={onReorder} disabled={reordering} className="flex-1 h-9 bg-surface-container-high text-on-surface rounded-full text-sm font-bold flex items-center justify-center gap-1">{reordering ? '...' : <><Icon name="replay" className="text-[14px]" />إعادة</>}</button>}
      </div>
    </div>
  );
}