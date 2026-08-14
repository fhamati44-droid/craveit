import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listOfferCalendar, getPartnerOffer, createSignal } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import OfferDetailSheet from '@/components/partner/OfferDetailSheet';

const STATUS = {
  draft: { label: 'جاهز', cls: 'bg-tamam-surface-high text-tamam-text-muted', dot: 'bg-tamam-text-muted' },
  scheduled: { label: 'مجدول', cls: 'bg-tamam-gold-dark/30 text-tamam-gold', dot: 'bg-tamam-gold' },
  active: { label: 'شغال', cls: 'bg-tamam-green/20 text-tamam-green-bright', dot: 'bg-tamam-green-bright' },
  paused: { label: 'موقف مؤقتًا', cls: 'bg-tamam-error/20 text-tamam-error', dot: 'bg-tamam-error' },
  ended: { label: 'انتهى', cls: 'bg-tamam-surface-high text-tamam-text-muted', dot: 'bg-tamam-text-muted' },
  completed: { label: 'انتهى', cls: 'bg-tamam-surface-high text-tamam-text-muted', dot: 'bg-tamam-text-muted' },
  failed: { label: 'انتهى', cls: 'bg-tamam-surface-high text-tamam-text-muted', dot: 'bg-tamam-text-muted' },
  cancelled: { label: 'انتهى', cls: 'bg-tamam-surface-high text-tamam-text-muted', dot: 'bg-tamam-text-muted' },
};

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function PartnerOfferCalendar() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [selected, setSelected] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);
  const [signaling, setSignaling] = useState(false);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    listOfferCalendar(rid, selected.toISOString()).then(setOffers).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid, selected]);

  const week = useMemo(() => {
    const base = new Date(selected);
    base.setDate(base.getDate() + weekOffset * 7);
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [selected, weekOffset]);

  const isSameDay = (a, b) => a.toDateString() === b.toDateString();

  const open = async (o) => { try { const d = await getPartnerOffer(rid, o.id); setDetail(d); } catch { setDetail({ offer: o }); } };
  const reportPressure = async () => {
    setSignaling(true);
    try { await createSignal(rid, { type: 'kitchen_pressure', reason: 'ضغط أثناء عرض مجدول' }); } catch {} finally { setSignaling(false); }
  };

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-xl text-tamam-text">جدول العروض</h1>
        <p className="text-tamam-text-muted text-xs">شوف العروض المجدولة لمطعمك حسب اليوم والوقت.</p>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset((w) => w - 1)} className="w-9 h-9 rounded-full bg-tamam-surface flex items-center justify-center text-tamam-text active:scale-95"><span className="material-symbols-outlined">chevron_right</span></button>
        <button onClick={() => { setSelected(new Date()); setWeekOffset(0); }} className="text-tamam-green-bright text-xs font-bold bg-tamam-green/15 px-4 py-1.5 rounded-full">اليوم</button>
        <button onClick={() => setWeekOffset((w) => w + 1)} className="w-9 h-9 rounded-full bg-tamam-surface flex items-center justify-center text-tamam-text active:scale-95"><span className="material-symbols-outlined">chevron_left</span></button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {week.map((d) => {
          const active = isSameDay(d, selected);
          return (
            <button key={d.toISOString()} onClick={() => setSelected(d)} className={`shrink-0 flex flex-col items-center justify-center w-14 py-2 rounded-2xl transition-colors ${active ? 'bg-tamam-green-bright text-tamam-ink' : 'bg-tamam-surface text-tamam-text-muted'}`}>
              <span className="text-[10px]">{DAY_NAMES[d.getDay()]}</span>
              <span className="font-bold text-sm">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 skeleton-t rounded-2xl" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title="ما قدرنا نحمّل الجدول" actionLabel="إعادة" onAction={load} />
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-tamam-text-muted opacity-50">event_busy</span>
          <p className="text-tamam-text-muted text-sm">ما في عروض مجدولة لهذا اليوم.</p>
          <button onClick={() => navigate('/partner/offers/request')} className="bg-tamam-green-bright text-tamam-ink text-xs font-bold px-4 py-2 rounded-full active:scale-95">اطلب فكرة عرض</button>
        </div>
      ) : (
        <div className="relative space-y-3 pr-3">
          <div className="absolute right-1.5 top-2 bottom-2 w-0.5 bg-tamam-outline/40" />
          {offers.map((o) => {
            const st = STATUS[o.status] || STATUS.draft;
            const time = o.start_at ? new Date(o.start_at).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div key={o.id} className="relative">
                <span className={`absolute -right-2.5 top-3 w-3 h-3 rounded-full ring-4 ring-tamam-bg ${st.dot}`} />
                <div className="bg-tamam-surface rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-tamam-text-muted text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span>{time}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  <h3 className="font-bold text-sm text-tamam-text">{o.title}</h3>
                  {o.start_at && o.end_at && <p className="text-tamam-text-muted text-[11px]">{fmtRange(o.start_at, o.end_at)}</p>}
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => open(o)} className="flex-1 bg-tamam-green-bright text-tamam-ink py-2 rounded-lg text-xs font-bold active:scale-95 flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[16px]">visibility</span>راجع العرض</button>
                    {(o.status === 'active' || o.status === 'scheduled') && (
                      <button onClick={reportPressure} disabled={signaling} className="bg-tamam-surface-high text-tamam-text py-2 px-3 rounded-lg text-xs font-bold active:scale-95 disabled:opacity-50 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">whatshot</span>ضغط</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OfferDetailSheet open={!!detail} offer={detail} restaurantId={rid} onClose={() => setDetail(null)} />
    </div>
  );
}

function fmtRange(a, b) {
  try {
    const s = new Date(a).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' });
    const e = new Date(b).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' });
    return `${s} - ${e}`;
  } catch { return ''; }
}