import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { unlockOffer } from '@/lib/offerEngineApi';
import { getLoyaltyAccount } from '@/lib/loyaltyApi';
import { track } from '@/lib/analytics';

/**
 * Point-unlock confirmation sheet (spec §5–§7).
 * - Never deducts on the first teaser tap; only on explicit "افتح العرض".
 * - Server re-checks balance/time/quota/already-unlocked and deducts atomically.
 * - Unlock = visibility only; the user still orders via the existing deal flow.
 */
export default function OfferUnlockSheet({ offer, onClose, onUnlocked }) {
  const navigate = useNavigate();
  const phone = (typeof localStorage !== 'undefined' && localStorage.getItem('user_phone')) || '';
  const [balance, setBalance] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (offer && phone) {
      getLoyaltyAccount(phone).then((res) => setBalance(res?.account?.balance ?? 0)).catch(() => setBalance(null));
    }
  }, [offer, phone]);

  if (!offer) return null;
  const cost = offer.unlock_cost || 0;
  const after = (balance ?? 0) - cost;

  const confirm = async () => {
    setProcessing(true); setErr(null);
    track('locked_offer_unlock_started', { deal_id: offer.deal_id, cost });
    try {
      const res = await unlockOffer(offer.deal_id, phone);
      if (res?.unlocked || res?.already_unlocked) {
        track('locked_offer_unlocked', { deal_id: offer.deal_id, cost });
        onUnlocked?.(offer.deal_id);
        onClose?.();
        navigate(`/deals/${offer.deal_id}`);
      } else {
        const reason = mapErr(res);
        setErr(reason);
        track('locked_offer_unlock_failed', { deal_id: offer.deal_id, reason });
      }
    } catch (e) {
      const reason = mapErr(e);
      setErr(reason);
      track('locked_offer_unlock_failed', { deal_id: offer.deal_id, reason });
    } finally { setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-tamam-bg rounded-t-3xl p-5 pb-8 space-y-4 animate-slide-up safe-bottom">
        <div className="w-10 h-1 bg-tamam-outline/40 rounded-full mx-auto" />
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tamam-gold">lock</span>
          <h3 className="font-bold text-tamam-text text-base">فتح العرض</h3>
        </div>

        {!phone ? (
          <div className="space-y-3 text-center">
            <p className="text-tamam-text-muted text-sm">لفتح خبايا TAMAM لازم تسجّل رقمك عشان نحسب نقاطك.</p>
            <button onClick={() => { onClose?.(); navigate('/profile'); }} className="w-full h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm">سجّل رقمك</button>
          </div>
        ) : (
          <>
            <p className="text-tamam-text text-sm leading-snug">{offer.teaser_text || 'في عرض مخبّى على وجبة 👀'}</p>
            <div className="bg-tamam-surface rounded-2xl p-4 space-y-2">
              <Row label="رصيدك" value={`${balance ?? '—'} نقطة`} />
              <Row label="تكلفة الفتح" value={`${cost} نقطة`} highlight />
              <div className="h-px bg-tamam-outline/30" />
              <Row label="بعد الفتح" value={`${Math.max(0, after)} نقطة`} bold />
            </div>
            {err && <p className="text-tamam-error text-xs font-semibold text-center">{err}</p>}
            <button onClick={confirm} disabled={processing || (balance != null && balance < cost)}
              className="w-full h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50">
              {processing ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">lock_open</span>}
              {processing ? 'جاري الفتح…' : 'افتح العرض'}
            </button>
            <button onClick={onClose} className="w-full h-11 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">رجوع</button>
            <p className="text-[10px] text-tamam-text-muted text-center">الفتح يكشف العرض بس — ما بيحجز ولا بيطلب. بتقدر تطلب بعدها من صفحة العرض.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-tamam-text-muted text-xs">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-tamam-text' : highlight ? 'font-bold text-tamam-gold' : 'text-tamam-text'}`}>{value}</span>
    </div>
  );
}

function mapErr(e) {
  const code = e?.error || e?.message || '';
  if (code === 'insufficient_points') return 'رصيد نقاطك ما يكفي.';
  if (code === 'offer_expired') return 'العرض خلص — ما عاد يفتح.';
  if (code === 'sold_out') return 'العرض خلصت كميته.';
  if (code === 'offer_not_started') return 'العرض لسه ما بدأ.';
  if (code === 'phone_required') return 'سجّل رقمك الأول.';
  return 'ما قدرنا نفتح العرض، حاول مرة ثانية.';
}