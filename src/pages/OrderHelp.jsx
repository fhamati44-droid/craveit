import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById } from '@/lib/api';
import { base44 } from '@/api/base44Client';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const WA_NUMBER = '972544616474';
const ISSUES = [
  { id: 'late', t: 'الطلب متأخر', icon: 'schedule' },
  { id: 'missing', t: 'صنف ناقص', icon: 'remove_shopping_cart' },
  { id: 'wrong', t: 'الطلب غلط', icon: 'error' },
  { id: 'cold', t: 'الأكل وصل بارد', icon: 'ac_unit' },
  { id: 'payment', t: 'مشكلة بالدفع', icon: 'credit_card_off' },
  { id: 'courier', t: 'مشكلة مع المندوب', icon: 'delivery_dining' },
  { id: 'cancel', t: 'بدي ألغي الطلب', icon: 'cancel' },
  { id: 'other', t: 'مشكلة ثانية', icon: 'help' },
];

export default function OrderHelp() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => { getOrderById(orderId).then(o => setOrder(o || null)).catch(() => {}); }, [orderId]);

  const open = (issue) => {
    const ref = order?.order_number || `TAM-${orderId}`;
    const msg = `مرحبًا TAMAM، عندي مشكلة بطلبي رقم ${ref}:\n${issue.t}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="pt-4 pb-8 px-4">
      <div className="flex items-center gap-2 mb-4"><button onClick={() => navigate(`/orders/${orderId}`)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center"><Icon name="arrow_forward" /></button><h1 className="text-xl font-bold">كيف نقدر نساعدك؟</h1></div>
      <p className="text-on-surface-variant text-sm mb-6">طلب رقم {order?.order_number || `TAM-${orderId}`} · اختار المشكلة ورح نتواصل معك.</p>
      <div className="grid grid-cols-2 gap-3">
        {ISSUES.map(i => (
          <button key={i.id} onClick={() => open(i)} className="bg-surface-container rounded-2xl p-4 flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Icon name={i.icon} className="text-primary text-2xl" /></div>
            <span className="text-sm font-semibold">{i.t}</span>
          </button>
        ))}
      </div>
    </div>
  );
}