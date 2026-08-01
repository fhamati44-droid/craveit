import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getDeals } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { buildTiers, currentTier, nextTier, countdown, pad, tierProgress } from '@/lib/dealTiers';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function DealJoined() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [deal, setDeal] = useState(null);
  const [participants, setParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!state) { navigate(`/deals/${dealId}`, { replace: true }); return; }
    (async () => {
      try {
        const list = await getDeals();
        setDeal((list || []).find(x => String(x.id) === dealId) || null);
        const parts = await base44.entities.DealParticipation.filter({ deal_id: Number(dealId) }).catch(() => []);
        setParticipants((parts || []).length);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [dealId]);

  if (loading) return <div className="flex items-center justify-center py-32"><div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const tiers = deal ? buildTiers(deal) : [];
  const cur = currentTier(tiers, participants);
  const next = nextTier(tiers, participants);
  const cd = deal ? countdown(deal.end_time || deal.valid_until) : null;

  return (
    <div className="pt-8 pb-8 px-4 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-4"><Icon name="check_circle" className="text-primary text-5xl" /></div>
      <h1 className="text-2xl font-bold mb-1">تم اشتراكك بالعرض!</h1>
      <p className="text-on-surface-variant mb-6">{deal?.title || ''}</p>

      <div className="w-full bg-surface-container rounded-2xl p-5 text-right space-y-4 mb-6">
        <Row icon="person" label="موقعك بالمشتركين" value={`#${participants}`} />
        <Row icon="payments" label="السعر الحالي لك" value={cur ? `₪${Math.round(cur.price)}` : '—'} />
        {next && <Row icon="trending_down" label="السعر القادم" value={`₪${Math.round(next.price)} (${next.at - participants} مشترك)`} />}
        <Row icon="schedule" label="الوقت المتبقي" value={cd && !cd.expired ? `${pad(cd.h)}:${pad(cd.m)}:${pad(cd.s)}` : 'انتهى'} />
        <Row icon="credit_card" label="حالة الدفع" value="محجوز — بدون دفع فوري" />
      </div>

      <p className="text-label-sm text-on-surface-variant mb-6">بنحدّث السعر تلقائياً مع كل مشترك جديد. رح نوصلك إشعار لما يخلص العرض.</p>

      <div className="w-full flex flex-col gap-3">
        <button onClick={() => navigate('/deals')} className="w-full bg-primary text-on-primary h-14 rounded-full font-bold">شوف باقي العروض</button>
        <button onClick={() => navigate('/')} className="w-full text-on-surface-variant font-medium">العودة للرئيسية</button>
      </div>
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2 text-on-surface-variant"><Icon name={icon} className="text-[18px]" /><span className="text-label-lg">{label}</span></div>
      <span className="font-bold">{value}</span>
    </div>
  );
}