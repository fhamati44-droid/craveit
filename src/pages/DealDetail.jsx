import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeals } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { buildTiers, currentTier, nextTier, countdown, pad, tierProgress } from '@/lib/dealTiers';
import { dealStatus } from '@/lib/dealStatus';
import { track } from '@/lib/analytics';
import { getSessionId } from '@/lib/tamamApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const PAYMENT_TEXT = {
  reserve: 'بنحجز المبلغ، والخصم النهائي بصير عند انتهاء العرض.',
  pay_current: 'بتدفع السعر الحالي، وإذا انفتح سعر أفضل بنرجعلك الفرق حسب سياسة العرض.',
  join_only: 'هسا بتسجل مشاركتك، والدفع بصير بعد تثبيت العرض.',
};

export default function DealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [participants, setParticipants] = useState(0);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getDeals();
      const d = (list || []).find(x => String(x.id) === dealId);
      setDeal(d || null);
      const parts = await base44.entities.DealParticipation.filter({ deal_id: Number(dealId) }).catch(() => []);
      setParticipants(Math.max((parts || []).length, d?.participants_count ?? d?.participants ?? 0));
      const phone = localStorage.getItem('user_phone');
      const mine = phone ? (parts || []).some(p => p.phone === phone) : (parts || []).some(p => p.session_id === getSessionId());
      setJoined(mine);
      if (d) track('deal_page_viewed', { deal_id: d.id });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [dealId]);

  if (loading) return <div className="flex items-center justify-center py-32"><div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!deal) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <p className="text-4xl mb-2">🤔</p>
      <p className="text-on-surface-variant mb-4">العرض غير موجود</p>
      <button onClick={() => navigate('/deals')} className="text-primary underline">العودة للعروض</button>
    </div>
  );

  const tiers = buildTiers(deal);
  const cur = currentTier(tiers, participants);
  const next = nextTier(tiers, participants);
  const cd = countdown(deal.end_time || deal.valid_until);
  const status = dealStatus(deal);
  const expired = cd?.expired || status === 'ended';
  const soldOut = deal.max_quantity != null && participants >= deal.max_quantity;
  const savings = (deal.original_price != null && cur) ? Math.round(deal.original_price - cur.price) : null;
  const included = Array.isArray(deal.included_items) ? deal.included_items : [];
  const payModel = deal.payment_model || 'reserve';
  const payText = PAYMENT_TEXT[payModel] || PAYMENT_TEXT.reserve;

  const endStr = (deal.end_time || deal.valid_until) ? new Date(deal.end_time || deal.valid_until).toLocaleString('ar', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

  let cta;
  if (expired) cta = <div className="w-full bg-surface-container-high text-on-surface-variant py-4 rounded-full text-center font-bold">انتهى العرض</div>;
  else if (soldOut) cta = <div className="w-full bg-surface-container-high text-on-surface-variant py-4 rounded-full text-center font-bold">اكتملت الكمية</div>;
  else if (joined) cta = <button onClick={() => { track('joined_deal_opened', { deal_id: deal.id }); navigate('/account/deals'); }} className="w-full bg-primary text-on-primary py-4 rounded-full font-bold active:scale-[0.98]">أنت مشترك بالعرض · تابع العرض</button>;
  else cta = (
    <button onClick={() => { track('deal_join_started', { deal_id: deal.id }); navigate(`/deals/${dealId}/join`); }} className="w-full bg-primary text-on-primary py-4 rounded-full shadow-lg shadow-primary/20 flex flex-col items-center justify-center active:scale-[0.98] transition-transform">
      <div className="flex items-center gap-2"><span className="font-bold">اشترك بالعرض</span><span className="opacity-40">|</span><span className="font-bold">₪{cur ? Math.round(cur.price) : '—'}</span></div>
      <span className="text-[11px] opacity-80">السعر ممكن ينزل إذا زاد عدد المشتركين</span>
    </button>
  );

  return (
    <div className="pb-40">
      <section className="relative w-full aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
        {deal.image_url ? <img className="w-full h-full object-cover" src={deal.image_url} alt={deal.title} /> : <div className="w-full h-full bg-surface-container-high" />}
        <button onClick={() => navigate('/deals')} aria-label="رجوع" className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-surface/40 backdrop-blur-md text-on-surface z-20"><Icon name="arrow_forward" /></button>
        <div className="absolute bottom-0 inset-x-0 p-4 z-20">
          {deal.restaurant_name && (
            <div className="inline-flex items-center gap-1 bg-primary/20 backdrop-blur-md px-2 py-1 rounded-full mb-2"><Icon name="restaurant" className="text-primary text-[16px]" /><span className="text-primary text-xs">{deal.restaurant_name}</span></div>
          )}
          <h2 className="text-2xl font-bold text-white">{deal.title || deal.name || 'عرض جماعي'}</h2>
          <p className="text-sm text-on-surface-variant">{deal.subtitle || 'وجبة مناسبة لمجموعة'}</p>
        </div>
      </section>

      <section className="px-4 py-4 flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-on-surface-variant">السعر الحالي</span>
          <div className="flex items-baseline gap-2">
            {cur && <span className="text-2xl font-bold text-primary">₪{Math.round(cur.price)}</span>}
            {deal.original_price != null && <span className="text-sm text-on-surface-variant line-through">₪{deal.original_price}</span>}
          </div>
        </div>
        {savings != null && savings > 0 && (
          <div className="bg-secondary-container px-4 py-2 rounded-xl flex flex-col items-center"><span className="text-xs text-on-secondary-container">وفرت</span><span className="font-bold text-on-secondary-container">₪{savings}</span></div>
        )}
      </section>

      <section className="px-4 mb-6">
        <div className="bg-surface-container rounded-2xl p-4">
          <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-semibold">مستويات الخصم</h3><span className="text-primary text-xs">{cur ? `وصلنا لسعر ₪${Math.round(cur.price)}` : ''}</span></div>
          <div className="relative h-3 bg-surface-variant rounded-full mb-8">
            <div className="absolute inset-y-0 right-0 bg-primary rounded-full" style={{ width: `${tierProgress(tiers, participants)}%` }} />
            <div className="absolute inset-0 flex justify-between px-1">
              {tiers.map((t, i) => {
                const reached = participants >= t.at;
                return (
                  <div key={i} className="relative -top-1 flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full ring-4 ring-background z-10 ${reached ? 'bg-primary' : 'bg-surface-variant border-2 border-outline/30'}`} />
                    <div className="absolute top-8 flex flex-col items-center whitespace-nowrap">
                      <span className="text-xs">{t.at} {t.at === 1 ? 'شخص' : 'أشخاص'}</span>
                      <span className={`text-xs ${reached ? 'font-bold' : 'text-on-surface-variant'}`}>₪{Math.round(t.price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface-container-high rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><Icon name="person" className="text-primary text-[18px]" /></div>
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center"><span className="text-xs text-on-secondary-container">+</span></div>
          </div>
          <div className="mt-3"><p className="text-sm font-semibold">انضم {participants} أشخاص</p></div>
          <button onClick={() => setShowParticipants(true)} className="text-primary text-xs font-bold mt-2 flex items-center gap-1">شوف عدد المشتركين <Icon name="arrow_back" className="text-[14px]" /></button>
        </div>
        <div className="bg-surface-container-high rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          {cd && !expired ? (
            <>
              <div className="flex gap-2 tabular-nums items-center">
                <div className="flex flex-col"><span className="text-xl font-bold">{pad(cd.h)}</span><span className="text-[10px] text-on-surface-variant">ساعة</span></div>
                <span className="text-xl font-bold text-primary">:</span>
                <div className="flex flex-col"><span className="text-xl font-bold">{pad(cd.m)}</span><span className="text-[10px] text-on-surface-variant">دقيقة</span></div>
                <span className="text-xl font-bold text-primary">:</span>
                <div className="flex flex-col"><span className="text-xl font-bold">{pad(cd.s)}</span><span className="text-[10px] text-on-surface-variant">ثانية</span></div>
              </div>
              <span className="text-[10px] text-primary mt-2">{endStr ? `العرض بنتهي ${endStr}` : 'ينتهي العرض قريباً'}</span>
            </>
          ) : <span className="text-error font-bold">انتهى العرض</span>}
        </div>
      </section>

      {included.length > 0 && (
        <section className="px-4 mb-6">
          <h3 className="font-bold mb-3">شو في بالعرض؟</h3>
          <div className="grid grid-cols-2 gap-2">
            {included.map((it, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface-container/50 p-3 rounded-xl">
                <Icon name="lunch_dining" className="text-tertiary" />
                <span className="text-sm">{typeof it === 'string' ? it : it.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 mb-8">
        <h3 className="font-bold mb-4">كيف TAMAM بتشتغل؟</h3>
        <div className="space-y-4">
          <Rule n="1" title="اشترك بالعرض" desc="احجز مكانك في العرض بدون دفع فوري." active />
          <Rule n="2" title="استنى العدد" desc="كل ما زاد عدد المشتركين، السعر بينزل لكل المجموعة تلقائياً." />
          <Rule n="3" title="بنثبت السعر" desc={payText} />
        </div>
      </section>

      {next && !expired && <p className="px-4 text-center text-xs text-on-surface-variant mb-4">ناقص {next.at - participants} مشترك للوصول لسعر ₪{Math.round(next.price)}</p>}

      <div className="fixed inset-x-0 px-4 z-40 max-w-[480px] mx-auto" style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}>
        {cta}
      </div>

      {showParticipants && (
        <div className="fixed inset-0 z-[100]" onClick={() => setShowParticipants(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-0 inset-x-0 bg-surface-container-high rounded-t-[28px] p-6 max-w-[480px] mx-auto text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-5" />
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3"><Icon name="groups" className="text-primary text-3xl" /></div>
            <p className="text-2xl font-bold mb-1">{participants}</p>
            <p className="text-sm text-on-surface-variant mb-6">مشترك بالعرض هسا</p>
            <button onClick={() => setShowParticipants(false)} className="w-full h-12 bg-primary text-on-primary rounded-2xl font-bold">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Rule({ n, title, desc, active }) {
  return (
    <div className="flex gap-3">
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold ${active ? 'bg-primary text-on-primary' : 'bg-primary/20 text-primary'}`}>{n}</div>
      <div><h4 className="font-semibold">{title}</h4><p className="text-sm text-on-surface-variant">{desc}</p></div>
    </div>
  );
}