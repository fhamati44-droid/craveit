import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoyaltyAccount, getLoyaltyConfig, expectedPoints } from '@/lib/loyaltyApi';
import { SkeletonCard, ErrorState } from '@/components/tamam/customer/States';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const TABS = [{ id: 'points', label: 'النقاط' }, { id: 'coupons', label: 'الكوبونات' }];

export default function Rewards() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(localStorage.getItem('user_phone') || '');
  const [tab, setTab] = useState('points');
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);

  const norm = (p) => '972' + p.replace(/^0/, '').replace(/[^\d]/g, '');

  const load = async (p) => {
    if (!p) return;
    setLoading(true);
    const [acc, cfg] = await Promise.all([getLoyaltyAccount(norm(p)), getLoyaltyConfig()]);
    setData(acc); setConfig(cfg); setLoading(false);
  };

  useEffect(() => { if (phone) load(phone); }, []);

  if (!phone) {
    return (
      <div className="pt-10 px-4">
        <h1 className="text-xl font-bold mb-2">نقاطي وكوبوناتي</h1>
        <p className="text-on-surface-variant text-sm mb-6">دخل رقم هاتفك لشوف رصيدك ومكافآتك.</p>
        <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" dir="ltr" className="w-full bg-surface-container rounded-xl p-3 outline-none mb-3" placeholder="05X-XXXXXXX" />
        <button onClick={() => { localStorage.setItem('user_phone', phone); setAsked(true); load(phone); }} className="w-full h-12 bg-primary text-on-primary rounded-full font-bold">عرض النقاط</button>
      </div>
    );
  }

  if (loading) return <div className="px-4 py-6 space-y-3">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>;

  const acc = data?.account || {};
  const txs = data?.transactions || [];
  const coupons = data?.coupons || [];

  return (
    <div className="pb-10">
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold">نقاطي وكوبوناتي</h1>
        <p className="text-on-surface-variant text-sm">{phone}</p>
      </div>

      <div className="px-4 mt-4 grid grid-cols-3 gap-2">
        <Stat label="متاح" value={acc.balance || 0} />
        <Stat label="قيد التأكيد" value={acc.pending_balance || 0} />
        <Stat label="مستخدم" value={acc.used_points || 0} />
      </div>

      <div className="sticky top-14 z-30 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 mt-4">
        <div className="flex">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-3 text-sm font-bold border-b-2 ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'points' ? (
          txs.length ? txs.map(t => {
            const earn = t.points >= 0;
            return (
              <div key={t.id} className="flex items-center justify-between bg-surface-container rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${earn ? 'bg-primary/15' : 'bg-surface-container-high'}`}><Icon name={earn ? 'add' : 'remove'} className={earn ? 'text-primary' : 'text-on-surface-variant'} /></div>
                  <div>
                    <p className="font-bold text-sm">{t.order_number || `طلب #${t.order_id}`}</p>
                    <p className="text-[11px] text-on-surface-variant">{new Date(t.created_date).toLocaleDateString('ar')} · {t.status === 'pending' ? 'قيد التأكيد' : t.status === 'available' ? 'متاح' : t.status === 'reversed' ? 'تم التراجع' : 'منتهي'}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${earn ? 'text-primary' : 'text-on-surface-variant'}`}>{earn ? '+' : ''}{t.points} نقطة</span>
              </div>
            );
          }) : <EmptyTab icon="stars" title="ما في نقاط لسه" subtitle="كل طلب يوصل بجمعلك نقاط." cta="ابدأ تطلب" onCta={() => navigate('/')} />
        ) : (
          coupons.length ? coupons.map(c => (
            <div key={c.id} className="bg-gradient-to-l from-tertiary/15 to-primary/10 border border-tertiary/30 rounded-2xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-tertiary font-bold">كوبون مكافأة</p>
                  <p className="font-bold">{c.type === 'percent' ? `خصم ${c.value}%` : c.type === 'free_delivery' ? 'توصيل مجاني' : `خصم ₪${c.value}`}</p>
                  {c.min_order ? <p className="text-[11px] text-on-surface-variant">أدنى طلب ₪{c.min_order}</p> : null}
                  {c.expiry ? <p className="text-[11px] text-on-surface-variant">ينتهي {new Date(c.expiry).toLocaleDateString('ar')}</p> : null}
                </div>
                <div className="bg-surface-container/60 rounded-lg px-3 py-2">
                  <span className="text-sm font-bold tracking-wider" dir="ltr">{c.code}</span>
                </div>
              </div>
              <button onClick={() => navigate('/restaurants')} className="w-full mt-3 h-10 bg-primary text-on-primary rounded-xl font-bold text-sm">استخدمه بالطلب الجاي</button>
            </div>
          )) : <EmptyTab icon="confirmation_number" title="ما في كوبونات لسه" subtitle="بعد توصيل طلبك رح يوصلك كوبون مكافأة." cta="تصفح المطاعم" onCta={() => navigate('/restaurants')} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-3 text-center">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-[11px] text-on-surface-variant">{label}</p>
    </div>
  );
}

function EmptyTab({ icon, title, subtitle, cta, onCta }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="text-4xl mb-3 opacity-80">{icon}</div>
      <p className="font-bold mb-1">{title}</p>
      <p className="text-sm text-on-surface-variant mb-4">{subtitle}</p>
      <button onClick={onCta} className="bg-primary text-on-primary px-5 py-2.5 rounded-full text-sm font-bold">{cta}</button>
    </div>
  );
}