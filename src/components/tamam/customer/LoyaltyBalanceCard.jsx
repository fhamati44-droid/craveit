import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoyaltyAccount } from '@/lib/loyaltyApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const NEXT_REWARD_AT = 350;

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
        <div className="bg-gradient-to-l from-primary/15 to-tertiary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold">نقاط TAMAM</h3>
            <p className="text-xs text-on-surface-variant">كل طلب بجمعلك نقاط</p>
          </div>
          <button onClick={() => navigate('/account/rewards')} className="bg-primary text-on-primary px-4 py-2 rounded-full text-sm font-bold">سجّل دخول وابدأ تجمع</button>
        </div>
      </section>
    );
  }

  const balance = data.account?.balance || 0;
  const pending = data.account?.pending_balance || 0;
  const coupons = (data.coupons || []).length;
  const remaining = Math.max(0, NEXT_REWARD_AT - balance);
  const pct = Math.min(100, Math.round((balance / NEXT_REWARD_AT) * 100));

  return (
    <section className="px-4 py-4">
      <button onClick={() => navigate('/account/rewards')} className="block w-full text-right bg-gradient-to-l from-primary/15 to-tertiary/10 border border-primary/20 rounded-2xl p-4 active:scale-[0.99]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Icon name="stars" className="text-primary" /></div>
            <div>
              <h3 className="font-bold">نقاط TAMAM</h3>
              <p className="text-[11px] text-on-surface-variant">معك {balance} نقطة</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-[11px] text-on-surface-variant">كوبونات نشطة</p>
            <p className="font-bold text-primary">{coupons}</p>
          </div>
        </div>
        <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mb-2"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-on-surface-variant">{pending ? `${pending} نقطة قيد التأكيد` : 'باقي ' + remaining + ' نقطة وبتفتح مكافأة جديدة'}</span>
          <span className="text-primary text-xs font-bold">شوف نقاطي وكوبوناتي</span>
        </div>
      </button>
    </section>
  );
}