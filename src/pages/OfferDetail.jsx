import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUnifiedOffer, unlockUnifiedOffer, recordUnifiedOfferEvent, UNIFIED_CARD_STATE_LABEL, offerBadgesAr, effectivePrice } from '@/lib/unifiedOfferApi';
import { useCart } from '@/lib/CartContext';
import { resolvePublicImage, handleImageError } from '@/lib/imageUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Unified customer offer detail — ONE component for every offer mechanism
 * (normal campaign, GroupDeal, point-locked, limited time/quantity, value-add,
 * coupon-locked). Data contract is UnifiedOffer; UI varies only by card_state.
 * Deep link: /offer/:source/:id  (and /offer/:id aliases to CAMPAIGN).
 */
export default function OfferDetail() {
  const { source, id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const realSource = (source === 'CAMPAIGN' || source === 'GROUP_DEAL') ? source : 'CAMPAIGN';
  const realId = id || source;

  const phone = (typeof localStorage !== 'undefined' && localStorage.getItem('user_phone')) || '';
  const includeDemo = (() => { try { return new URLSearchParams(window.location.search).get('demo') === '1'; } catch { return false; } })();

  const [u, setU] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getUnifiedOffer({ source_type: realSource, id: realId, phone, include_demo: includeDemo })
      .then((data) => {
        setU(data || null);
        if (data) {
          recordUnifiedOfferEvent({ source_type: data.source_type, id: data.id, event_type: 'impression', channel: 'deep_link', phone, campaign_id: data.campaign_id, restaurant_id: data.restaurant_id }).catch(() => {});
          recordUnifiedOfferEvent({ source_type: data.source_type, id: data.id, event_type: 'offer_open', channel: 'deep_link', phone, campaign_id: data.campaign_id, restaurant_id: data.restaurant_id }).catch(() => {});
        }
      })
      .catch(() => setU(null))
      .finally(() => setLoading(false));
  }, [realSource, realId, phone, includeDemo]);
  useEffect(load, [load]);

  const unlock = async () => {
    if (!u || !phone) { navigate('/profile'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await unlockUnifiedOffer({ source_type: u.source_type, id: u.id, phone, channel: 'deep_link' });
      if (res?.unlocked || res?.already_unlocked) {
        recordUnifiedOfferEvent({ source_type: u.source_type, id: u.id, event_type: 'unlock', channel: 'deep_link', phone, campaign_id: u.campaign_id, restaurant_id: u.restaurant_id }).catch(() => {});
        load();
      } else setErr('ما قدرنا نفتح العرض.');
    } catch (e) {
      const code = e?.error || e?.message || '';
      if (code === 'insufficient_points') setErr('رصيد نقاطك ما يكفي.');
      else if (code === 'offer_expired') setErr('العرض خلص.');
      else if (code === 'sold_out') setErr('العرض خلصت كميته.');
      else setErr('ما قدرنا نفتح العرض، حاول مرة ثانية.');
    } finally { setBusy(false); }
  };

  const addToCart = () => {
    if (!u) return;
    recordUnifiedOfferEvent({ source_type: u.source_type, id: u.id, event_type: 'add_to_cart', channel: 'deep_link', phone, campaign_id: u.campaign_id, restaurant_id: u.restaurant_id }).catch(() => {});
    const price = effectivePrice(u) || 0;
    const rest = u.restaurant_fulfillment
      ? { id: u.restaurant_fulfillment.restaurant_id, name: u.restaurant_fulfillment.name, image_url: u.restaurant_fulfillment.logo_url, delivery_time: u.restaurant_fulfillment.delivery_time_max || 30, delivery_fee: 0 }
      : { id: 'tamam', name: 'TAMAM', delivery_time: 30, delivery_fee: 0 };
    addItem({
      id: `unified_${u.source_type}_${u.id}`,
      name: u.title,
      price,
      quantity: 1,
      image_url: null,
      extras: [],
      unified_offer_source: u.source_type,
      unified_offer_id: u.id,
      campaign_id: u.campaign_id || null,
    }, rest);
    navigate('/cart');
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-32"><div className="w-10 h-10 border-2 border-tamam-green border-t-transparent rounded-full animate-spin" /></div>;

  if (!u) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <p className="text-4xl mb-2">😕</p>
      <p className="font-bold text-tamam-text mb-1">العرض غير متاح</p>
      <p className="text-sm text-tamam-text-muted mb-4">يمكن انتهى أو ما عاد متاح إلك.</p>
      <button onClick={() => navigate('/')} className="h-11 px-5 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm">العودة للرئيسية</button>
    </div>
  );

  const price = effectivePrice(u);
  const hasDiscount = u.normal_price && price && price < u.normal_price;
  const locked = u.card_state === 'LOCKED_POINTS';
  const canOrder = u.eligible && !locked;
  const badges = offerBadgesAr(u);
  const f = u.restaurant_fulfillment;

  return (
    <div className="pb-32" dir="rtl">
      <div className="sticky top-0 z-20 bg-tamam-bg/95 backdrop-blur-xl border-b border-tamam-outline/20 px-3 py-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-tamam-surface"><Icon name="arrow_forward" className="text-tamam-text text-[22px]" /></button>
        <div className="flex-1"><h1 className="font-bold text-sm text-tamam-text">{u.title}</h1><p className="text-[10px] text-tamam-text-muted">{UNIFIED_CARD_STATE_LABEL[u.card_state] || ''}</p></div>
      </div>

      <div className="px-4 pt-4">
        <div className="bg-tamam-surface rounded-3xl overflow-hidden border border-tamam-outline/30">
          <div className="relative aspect-[4/3] w-full bg-tamam-surface-high flex items-center justify-center">
            <span className="material-symbols-outlined text-tamam-green-bright text-[64px] opacity-50">restaurant</span>
            {locked && <div className="absolute inset-0 flex items-center justify-center bg-tamam-bg/40 backdrop-blur-sm"><span className="material-symbols-outlined text-tamam-gold text-[56px]">lock</span></div>}
            {hasDiscount && <span className="absolute top-3 left-3 text-xs bg-tamam-gold text-tamam-ink px-3 py-1 rounded-full font-bold">وفّر ₪{Math.round(u.normal_price - price)}</span>}
          </div>
          <div className="p-5">
            <h2 className="text-xl font-bold text-tamam-text mb-1">{u.title}</h2>
            {u.subtitle && <p className="text-sm text-tamam-text-muted mb-3">{u.subtitle}</p>}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {badges.map((b) => <span key={b} className="text-[10px] bg-tamam-surface-high text-tamam-text-muted px-2 py-1 rounded-full">{b}</span>)}
              </div>
            )}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-extrabold text-tamam-green-bright">₪{Math.round(price || 0)}</span>
              {hasDiscount && <span className="text-base text-tamam-text-muted line-through">₪{Math.round(u.normal_price)}</span>}
            </div>
            {u.value_add && <div className="flex items-start gap-2 text-sm text-tamam-text mb-3"><Icon name="add_circle" className="text-tamam-green-bright text-[18px] mt-0.5" /><span>{u.value_add}</span></div>}
            {u.quota_total != null && <div className="flex items-center gap-2 text-xs text-tamam-text-muted mb-2"><Icon name="inventory_2" className="text-[16px]" /><span>باقي {u.quota_remaining} من {u.quota_total}</span></div>}
            {u.end_at && <div className="flex items-center gap-2 text-xs text-tamam-text-muted mb-2"><Icon name="schedule" className="text-[16px]" /><span>صالح لغاية {new Date(u.end_at).toLocaleString('ar', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>}
            {u.unlock_type === 'point_locked' && <div className="flex items-center gap-2 text-xs text-tamam-gold mb-2"><Icon name="lock" className="text-[16px]" /><span>يفتح بـ {u.unlock_points} نقطة · رصيدك {u.points_balance ?? '—'} نقطة</span></div>}
            {f && <div className="flex items-center gap-2 text-xs text-tamam-text-muted mb-3"><Icon name="storefront" className="text-[16px]" /><span>{f.name} · {f.current_status === 'open' ? 'مفتوح' : 'مقفل حالياً'}</span></div>}

            {err && <p className="text-tamam-error text-xs font-semibold mb-2 text-center">{err}</p>}

            {locked ? (
              <button onClick={unlock} disabled={busy} className="w-full h-14 rounded-2xl bg-tamam-gold text-tamam-ink font-bold text-lg active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="lock_open" />}
                {busy ? 'جاري الفتح…' : `افتح بـ ${u.unlock_points} نقطة`}
              </button>
            ) : canOrder ? (
              <button onClick={addToCart} className="w-full h-14 rounded-2xl bg-tamam-green text-tamam-ink font-bold text-lg active:scale-95 transition">أضف للسلة — ₪{Math.round(price || 0)}</button>
            ) : (
              <button disabled className="w-full h-14 rounded-2xl bg-tamam-surface-high text-tamam-text-muted font-bold text-lg opacity-70">{UNIFIED_CARD_STATE_LABEL[u.card_state] || 'غير متاح'}</button>
            )}
            {!phone && <p className="text-[11px] text-tamam-text-muted text-center mt-2">لفتح العروض المخبّاة سجّل رقمك من الملف الشخصي.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}