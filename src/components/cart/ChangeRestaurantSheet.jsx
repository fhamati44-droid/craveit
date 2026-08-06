import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Star, Clock, Truck, BadgePercent } from 'lucide-react';
import { getOffersForMeal, offerImpact, computeCartTotals } from '@/lib/restaurantOfferApi';
import { resolvePublicMedia, handleImageError } from '@/lib/imageUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function ChangeRestaurantSheet({ open, item, allItems, onSelect, onClose }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setLoading(true); setError(false); setOffers([]);
    getOffersForMeal(item.id)
      .then((o) => setOffers(o || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, item?.id]);

  if (!item) return null;

  const extras = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
  const totals = computeCartTotals(allItems);
  const currentImpact = item.selected_restaurant_id
    ? (item.restaurant_unit_price + extras) * (item.quantity || 1) + ((allItems.filter((i) => i.cartId !== item.cartId).some((i) => i.selected_restaurant_id === item.selected_restaurant_id)) ? 0 : (item.restaurant_delivery_fee_snapshot || 0))
    : (item.price + extras) * (item.quantity || 1);
  const baseTotal = totals.total - currentImpact;

  // Badges: mark best by impact, fastest, top-rated, same-restaurant
  const withImpact = offers.map((o) => ({ ...o, ...offerImpact(o, item, allItems) }));
  const best = withImpact.length ? [...withImpact].sort((a, b) => a.impact - b.impact)[0] : null;
  const fastest = withImpact.length ? [...withImpact].sort((a, b) => (a.restaurant_delivery_time_min ?? 99) - (b.restaurant_delivery_time_min ?? 99))[0] : null;
  const topRated = withImpact.length ? [...withImpact].sort((a, b) => (b.restaurant_rating || 0) - (a.restaurant_rating || 0))[0] : null;
  const sorted = [...withImpact].sort((a, b) => a.impact - b.impact);

  const choose = (o) => { onSelect(o); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-50 bg-surface rounded-t-3xl max-h-[85vh] flex flex-col"
            dir="rtl"
          >
            <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">
                  {item.image_url ? <img src={resolvePublicMedia(item.image_url)} onError={handleImageError} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>}
                </div>
                <div>
                  <h3 className="font-bold text-sm">اختار مين يجهّز هالوجبة</h3>
                  <p className="text-xs text-on-surface-variant truncate max-w-[220px]">{item.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {loading && <p className="text-center text-on-surface-variant text-sm py-8">عم نجهّز الخيارات...</p>}
              {error && <p className="text-center text-error text-sm py-8">ما قدرنا نحمّل المطاعم</p>}
              {!loading && !error && offers.length === 0 && (
                <p className="text-center text-on-surface-variant text-sm py-8">ما في مطاعم بتعمل هالوجبة حاليًا</p>
              )}
              {sorted.map((o) => {
                const badges = [];
                if (o.sameRestaurant) badges.push({ label: 'من نفس المطعم', tone: 'green' });
                if (best && o.offer_id === best.offer_id) badges.push({ label: 'الأوفر', tone: 'gold' });
                if (fastest && o.offer_id === fastest.offer_id) badges.push({ label: 'الأسرع', tone: 'teal' });
                if (topRated && o.offer_id === topRated.offer_id && o.restaurant_rating) badges.push({ label: 'أفضل تقييم', tone: 'teal' });
                const selected = item.selected_restaurant_offer_id === o.offer_id;
                const newTotal = baseTotal + o.impact;
                return (
                  <button key={o.offer_id} onClick={() => choose(o)}
                    className={`w-full text-right rounded-2xl p-3 border transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-outline-variant/30 bg-surface-container-low active:scale-[0.99]'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">
                        {o.restaurant_logo ? <img src={resolvePublicMedia(o.restaurant_logo)} onError={handleImageError} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🏪</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm truncate">{o.restaurant_name}</span>
                          {o.restaurant_verified && <Icon name="verified" className="text-primary text-[16px]" />}
                          {selected && <Check size={15} className="text-primary" />}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                          {o.restaurant_rating ? <span className="flex items-center gap-0.5"><Star size={11} className="fill-tertiary text-tertiary" /> {Number(o.restaurant_rating).toFixed(1)}</span> : null}
                          {(o.restaurant_delivery_time_min || o.restaurant_delivery_time_max) ? (
                            <span className="flex items-center gap-0.5"><Clock size={11} /> {o.restaurant_delivery_time_min || ''}{o.restaurant_delivery_time_max ? `–${o.restaurant_delivery_time_max}` : ''} د</span>
                          ) : null}
                          <span className="flex items-center gap-0.5"><Truck size={11} /> {o.incrementalDelivery === 0 ? 'بدون توصيل إضافي' : `+₪${Math.round(o.incrementalDelivery)}`}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-primary">₪{Math.round(o.price)}</div>
                        <div className="text-[10px] text-on-surface-variant">للوجبة</div>
                      </div>
                    </div>
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {badges.map((b, i) => (
                          <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.tone === 'gold' ? 'bg-tertiary/15 text-tertiary' : b.tone === 'green' ? 'bg-primary/15 text-primary' : 'bg-secondary-container text-on-secondary-container'}`}>{b.label}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/20 text-[11px]">
                      <span className="text-on-surface-variant">تأثيره على إجمالي السلة</span>
                      <span className={`font-bold ${o.diff < 0 ? 'text-primary' : o.diff > 0 ? 'text-error' : 'text-on-surface'}`}>
                        ₪{Math.round(o.impact)} {o.diff !== 0 && `(${o.diff > 0 ? '+' : ''}${Math.round(o.diff)})`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low">
              <p className="text-center text-sm text-on-surface-variant mb-2">اختيار المطعم — الإجمالي الجديد ₪{Math.round(baseTotal + (best ? best.impact : currentImpact))}</p>
              <button onClick={onClose} className="w-full h-12 rounded-full bg-surface-container-high text-on-surface font-bold">إلغاء</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}