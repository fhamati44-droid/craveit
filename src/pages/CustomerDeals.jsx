import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeals } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { buildTiers, currentTier, nextTier, countdown, pad, tierProgress } from '@/lib/dealTiers';
import { dealStatus } from '@/lib/dealStatus';
import { getSessionId } from '@/lib/tamamApi';
import { SkeletonCard, ErrorState } from '@/components/tamam/customer/States';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const TABS = [{ id: 'active', label: 'شغالة' }, { id: 'joined', label: 'اشتركت فيها' }, { id: 'ended', label: 'انتهت' }];

export default function CustomerDeals() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('active');
  const [deals, setDeals] = useState([]);
  const [myParts, setMyParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await getDeals();
        setDeals(list || []);
        const phone = localStorage.getItem('user_phone');
        const parts = phone
          ? await base44.entities.DealParticipation.filter({ phone }).catch(() => [])
          : await base44.entities.DealParticipation.filter({ session_id: getSessionId() }).catch(() => []);
        setMyParts(parts || []);
      } catch (e) { console.error(e); setError(true); }
      finally { setLoading(false); }
    })();
  }, []);

  const joinedDealIds = new Set((myParts || []).map(p => String(p.deal_id)));
  const activeDeals = deals.filter(d => dealStatus(d) === 'active');
  const endedDeals = deals.filter(d => dealStatus(d) === 'ended');

  const renderActive = () => {
    if (!activeDeals.length) return <EmptyTab icon="🎉" title="لا توجد عروض شغالة هسا" cta="استكشف العروض الحالية" onCta={() => navigate('/deals')} />;
    return activeDeals.map(d => (
      <ActiveDealRow key={d.id} deal={d} joined={joinedDealIds.has(String(d.id))} onOpen={() => navigate(`/deals/${d.id}`)} />
    ));
  };

  const renderJoined = () => {
    const joined = (myParts || []).map(p => deals.find(d => String(d.id) === String(p.deal_id))).filter(Boolean);
    if (!joined.length) return <EmptyTab icon="group" title="لا توجد عروض منضمة" subtitle="اشترك في عروض المجموعات ووفر لحد 50% من قيمة طلبك!" cta="استكشف العروض الحالية" onCta={() => navigate('/deals')} />;
    return joined.map(d => <JoinedDealRow key={d.id} deal={d} onOpen={() => navigate(`/deals/${d.id}`)} />);
  };

  const renderEnded = () => {
    const ended = endedDeals.filter(d => joinedDealIds.has(String(d.id)));
    if (!ended.length) return <EmptyTab icon="history" title="ما في عروض منتهية لك هسا" cta="استكشف العروض الحالية" onCta={() => navigate('/deals')} />;
    return ended.map(d => <EndedDealRow key={d.id} deal={d} onOpen={() => navigate(`/deals/${d.id}`)} />);
  };

  const more = [...activeDeals, ...deals.filter(d => dealStatus(d) === 'upcoming')].filter(d => !joinedDealIds.has(String(d.id))).slice(0, 4);

  if (error) return <ErrorState title="ما قدرنا نحمّل عروضك." onRetry={() => window.location.reload()} />;

  return (
    <div className="pb-10">
      <div className="px-4 pt-4 mb-4">
        <h1 className="text-headline-lg font-bold">عروضي</h1>
        <p className="text-body-md text-on-surface-variant">تابع عروضك الجماعية وحالتها.</p>
      </div>

      <div className="sticky top-14 z-30 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30">
        <div className="flex">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-3 text-sm font-bold border-b-2 ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {tab === 'active' && renderActive()}
            {tab === 'joined' && renderJoined()}
            {tab === 'ended' && renderEnded()}
          </>
        )}
      </div>

      {!loading && more.length > 0 && (
        <section className="px-4 mt-6">
          <h2 className="text-base font-bold mb-4">عروض قد تهمك</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {more.map(d => <MiniDealCard key={d.id} deal={d} onOpen={() => navigate(`/deals/${d.id}`)} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ActiveDealRow({ deal, joined, onOpen }) {
  const cd = countdown(deal.end_time || deal.valid_until);
  const tiers = buildTiers(deal);
  const participants = deal.participants_count ?? deal.participants ?? 0;
  const cur = currentTier(tiers, participants);
  return (
    <button onClick={onOpen} className="block w-full text-right bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden active:scale-[0.99]">
      <div className="flex">
        <div className="w-28 h-28 flex-shrink-0 bg-surface-container-high">{deal.image_url ? <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🎉</div>}</div>
        <div className="flex-1 p-3 min-w-0">
          {joined && <span className="inline-block bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">تم تسجيل اشتراكك</span>}
          <h3 className="font-bold text-sm truncate">{deal.title || deal.name}</h3>
          {deal.restaurant_name && <p className="text-[11px] text-on-surface-variant truncate">{deal.restaurant_name}</p>}
          <div className="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1"><Icon name="group" className="text-[14px]" /> {participants}</span>
            {cd && !cd.expired && <span className="flex items-center gap-1 tabular-nums"><Icon name="schedule" className="text-[14px]" /> {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}</span>}
            {cur && <span className="text-primary font-bold">₪{Math.round(cur.price)}</span>}
          </div>
        </div>
      </div>
      <div className="px-3 pb-3 flex justify-end"><span className="text-primary text-xs font-bold">{joined ? 'تابع العرض' : 'اشترك بالعرض'}</span></div>
    </button>
  );
}

function JoinedDealRow({ deal, onOpen }) {
  const status = dealStatus(deal);
  const tiers = buildTiers(deal);
  const participants = deal.participants_count ?? deal.participants ?? 0;
  const cur = currentTier(tiers, participants);
  const next = nextTier(tiers, participants);
  return (
    <button onClick={onOpen} className="block w-full text-right bg-surface-container border border-primary/30 rounded-2xl overflow-hidden active:scale-[0.99]">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center"><Icon name="check" className="text-primary text-[16px]" /></span>
          <span className="text-primary text-xs font-bold">{status === 'active' ? 'تم تسجيل اشتراكك' : 'انتهى العرض'}</span>
        </div>
        <h3 className="font-bold">{deal.title || deal.name}</h3>
        {deal.restaurant_name && <p className="text-xs text-on-surface-variant">{deal.restaurant_name}</p>}
        <div className="mt-3 space-y-1.5">
          {next && <div className="flex justify-between text-xs"><span className="text-on-surface-variant">الهدف: {next.at} مشترك</span><span className="text-primary font-bold">{participants}/{next.at}</span></div>}
          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${tierProgress(tiers, participants)}%` }} /></div>
        </div>
        <div className="flex justify-between items-center mt-3 text-xs">
          <span className="text-on-surface-variant">السعر الحالي: {cur ? `₪${Math.round(cur.price)}` : '—'}</span>
          <span className="text-primary font-bold">{status === 'active' ? 'تابع العرض' : 'شوف التفاصيل'}</span>
        </div>
      </div>
    </button>
  );
}

function EndedDealRow({ deal, onOpen }) {
  const tiers = buildTiers(deal);
  const participants = deal.participants_count ?? deal.participants ?? 0;
  const cur = currentTier(tiers, participants);
  const target = tiers.length ? tiers[tiers.length - 1].at : 1;
  const success = participants >= target;
  return (
    <div className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden">
      <div className="flex">
        <div className="w-24 h-24 flex-shrink-0 bg-surface-container-high">{deal.image_url ? <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🎉</div>}</div>
        <div className="flex-1 p-3">
          <div className="flex items-center gap-1 mb-1">
            <Icon name={success ? 'check_circle' : 'cancel'} className={success ? 'text-primary' : 'text-error'} />
            <span className={`text-xs font-bold ${success ? 'text-primary' : 'text-error'}`}>{success ? `تم تثبيت العرض بسعر ₪${cur ? Math.round(cur.price) : '—'}` : 'ما وصلنا للهدف المطلوب'}</span>
          </div>
          <h3 className="font-bold text-sm">{deal.title || deal.name}</h3>
          {deal.restaurant_name && <p className="text-[11px] text-on-surface-variant">{deal.restaurant_name}</p>}
          <p className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1"><Icon name="history" className="text-[14px]" /> {success ? 'تم تثبيت السعر لكل المشتركين' : 'لم يتم خصم أي مبلغ — مشاركتك مجانية'}</p>
        </div>
      </div>
      <div className="px-3 pb-3 flex justify-end">
        <button onClick={onOpen} className="text-primary text-xs font-bold">{success ? 'شوف الطلب' : 'شوف العرض'}</button>
      </div>
    </div>
  );
}

function MiniDealCard({ deal, onOpen }) {
  const tiers = buildTiers(deal);
  const participants = deal.participants_count ?? deal.participants ?? 0;
  const cur = currentTier(tiers, participants);
  const orig = deal.original_price;
  const disc = orig && cur ? Math.round((1 - cur.price / orig) * 100) : null;
  return (
    <button onClick={onOpen} className="flex-none w-44 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden text-right active:scale-95">
      <div className="h-24 bg-surface-container-high relative">{deal.image_url ? <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🎉</div>}
        {disc != null && <span className="absolute top-2 right-2 bg-tertiary text-on-tertiary text-[10px] font-bold px-1.5 py-0.5 rounded">خصم {disc}%</span>}
      </div>
      <div className="p-2.5">
        <h3 className="font-bold text-xs truncate">{deal.title || deal.name}</h3>
        <div className="flex items-baseline gap-1 mt-1">{cur && <span className="text-primary font-bold text-sm">₪{Math.round(cur.price)}</span>}{orig != null && <span className="text-on-surface-variant line-through text-[10px]">₪{orig}</span>}</div>
      </div>
    </button>
  );
}

function EmptyTab({ icon, title, subtitle, cta, onCta }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="text-4xl mb-3 opacity-80">{icon}</div>
      <p className="font-bold mb-1">{title}</p>
      {subtitle && <p className="text-sm text-on-surface-variant mb-4">{subtitle}</p>}
      {cta && <button onClick={onCta} className="bg-primary text-on-primary px-5 py-2.5 rounded-full text-sm font-bold">{cta}</button>}
    </div>
  );
}