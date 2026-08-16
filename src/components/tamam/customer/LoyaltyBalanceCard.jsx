import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoyaltyAccount } from '@/lib/loyaltyApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const NEXT_REWARD_AT = 350;
const KHABYA_UNLOCK_AT = 50; // lowest known khabya unlock cost

export default function LoyaltyBalanceCard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const phone = localStorage.getItem('user_phone');
    if (!phone) { setLoading(false); return; }
    getLoyaltyAccount('972' + phone.replace(/^0/, '').replace(/[^\d]/g, '')).then(d => { setData(d); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="px-4 py-3"><div className="h-24 skeleton-t rounded-2xl" /></div>;

  const phone = localStorage.getItem('user_phone');
  if (!phone || !data) {
    return (
      <section className="px-4 py-4">
        <div className="bg-gradient-to-l from-tamam-green/15 to-tamam-gold/10 border border-tamam-green/25 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-tamam-text">نقاط TAMAM</h3>
            <p className="text-xs text-tamam-text-muted">كل طلب بجمعلك نقاط</p>
          </div>
          <button onClick={() => navigate('/account/rewards')} className="bg-tamam-green text-tamam-ink px-4 py-2 rounded-full text-sm font-bold">سجّل وابدأ تجمع</button>
        </div>
      </section>
    );
  }

  const balance = data.account?.balance || 0;
  const pending = data.account?.pending_balance || 0;
  const coupons = (data.coupons || []).length;
  const remaining = Math.max(0, NEXT_REWARD_AT - balance);
  const pct = Math.min(100, Math.round((balance / NEXT_REWARD_AT) * 100));
  const canUnlockKhabya = balance >= KHABYA_UNLOCK_AT;

  return (
    <section className="px-4 py-4">
      <button onClick={() => navigate('/account/rewards')} className="block w-full text-right bg-gradient-to-l from-tamam-green/15 to-tamam-gold/10 border border-tamam-green/25 rounded-2xl p-4 active:scale-[0.99] transition-transform">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-tamam-green/20 flex items-center justify-center"><Icon name="stars" className="text-tamam-green-bright" /></div>
            <div>
              <h3 className="font-bold text-tamam-text">نقاط TAMAM</h3>
              <p className="text-[11px] text-tamam-text-muted">معك {balance} نقطة</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-[11px] text-tamam-text-muted">كوبونات نشطة</p>
            <p className="font-bold text-tamam-green-bright">{coupons}</p>
          </div>
        </div>
        <div className="w-full h-2 bg-tamam-surface-high rounded-full overflow-hidden mb-2">
          <div className="h-full bg-tamam-green-bright rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-tamam-text-muted">
            {canUnlockKhabya
              ? 'جاهز تفتح خبايا 👀'
              : (pending ? `${pending} نقطة قيد التأكيد` : `باقي ${remaining} نقطة وبتفتح عرض جديد`)}
          </span>
          <span className="text-tamam-green-bright text-xs font-bold inline-flex items-center gap-0.5">
            شوف مكافآتي
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          </span>
        </div>
      </button>
    </section>
  );
}