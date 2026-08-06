import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { getMenuItemsByRestaurant } from '@/lib/api';
import { resolvePublicMedia, handleImageError } from '@/lib/imageUtils';
import ChangeRestaurantSheet from '@/components/cart/ChangeRestaurantSheet';
import ConsolidationCard from '@/components/cart/ConsolidationCard';
import { findConsolidation } from '@/lib/restaurantOfferApi';
import { useToast } from '@/components/ui/use-toast';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function Cart() {
  const navigate = useNavigate();
  const { items, restaurant, restaurantTotals, updateQuantity, removeItem, totalItems, addItem, setItemRestaurant } = useCart();
  const [upsell, setUpsell] = useState([]);
  const [changing, setChanging] = useState(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [consolidation, setConsolidation] = useState(null);
  const [consolidationLoading, setConsolidationLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!restaurant?.id) { setUpsell([]); return; }
    getMenuItemsByRestaurant(restaurant.id).then(cats => {
      const all = (cats || []).flatMap(c => c.items || []).filter(i => i.is_available !== false);
      setUpsell(all.slice(0, 6));
    }).catch(() => setUpsell([]));
  }, [restaurant?.id]);

  const groups = restaurantTotals.groupDetails || [];
  const realGroups = groups.filter((g) => !g.is_legacy);
  const restaurantCount = realGroups.length || 1;
  const hasPendingRestaurant = groups.some((g) => g.is_legacy && !g.restaurant_name);
  const singleFulfillment = realGroups.length <= 1;

  // Smart consolidation — only relevant when items are spread across 2+ restaurants
  useEffect(() => {
    if (realGroups.length < 2) { setConsolidation(null); return; }
    let active = true;
    setConsolidationLoading(true);
    findConsolidation(items)
      .then((opp) => { if (active) setConsolidation(opp); })
      .catch(() => { if (active) setConsolidation(null); })
      .finally(() => { if (active) setConsolidationLoading(false); });
    return () => { active = false; };
  }, [items]);

  const applyConsolidation = () => {
    if (!consolidation) return;
    consolidation.changes.forEach((c) => setItemRestaurant(c.cartId, c.offer));
    setConsolidation(null);
    toast({ title: 'تم تجميع الطلب وتحديث الأسعار' });
  };

  if (!items.length) {
    return (
      <div className="pt-10 px-4 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-4"><Icon name="shopping_cart" className="text-on-surface-variant text-4xl" /></div>
        <h1 className="text-xl font-bold mb-1">السلة فاضية</h1>
        <p className="text-on-surface-variant mb-6">بدك تضيف إشي؟ تصفّح المطاعم والاقتراحات.</p>
        <button onClick={() => navigate('/restaurants')} className="w-full bg-primary text-on-primary h-14 rounded-full font-bold mb-3">تصفّح المطاعم</button>
        <button onClick={() => navigate('/tamam-suggestions')} className="w-full text-primary font-semibold">اقتراحات TAMAM</button>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-40">
      {/* Fulfillment summary */}
      <div className="mx-4 mb-4">
        <FulfillmentCard
          single={singleFulfillment}
          groups={realGroups}
          totalProducts={items.reduce((s, i) => s + i.quantity, 0)}
          hasPending={hasPendingRestaurant}
          primaryLogo={restaurant?.image_url || restaurant?.logo_url}
          primaryName={restaurant?.name}
        />
      </div>

      <h1 className="px-4 text-headline-md font-bold mb-3">سلة الطلبات</h1>

      {/* Items */}
      <div className="px-4 flex flex-col gap-3 mb-6">
        {items.map(it => {
          const unit = it.selected_restaurant_id ? (it.restaurant_unit_price || 0) : (it.price || 0);
          const extrasTotal = (it.extras || []).reduce((s, e) => s + (e.price || 0), 0);
          const lineTotal = (unit + extrasTotal) * it.quantity;
          return (
            <div key={it.cartId} className="bg-surface-container-low rounded-xl p-3 flex gap-3 active:scale-[0.98] transition-transform">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">{it.image_url ? <img className="w-full h-full object-cover" src={resolvePublicMedia(it.image_url)} onError={handleImageError} alt={it.name} /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}</div>
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm truncate">{it.name}</h3>
                  <span className="font-semibold text-sm">₪{Math.round(lineTotal)}</span>
                </div>
                {it.extras?.length > 0 && <p className="text-[11px] text-on-surface-variant truncate">{it.extras.map(e => e.name).join('، ')}</p>}

                {/* Restaurant row */}
                <div className="mt-1">
                  {it.selected_restaurant_id ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-surface-variant flex-shrink-0">
                          {it.restaurant_logo_snapshot ? <img src={resolvePublicMedia(it.restaurant_logo_snapshot)} onError={handleImageError} alt="" className="w-full h-full object-cover" /> : <span className="block w-full h-full flex items-center justify-center text-[10px]">🏪</span>}
                        </div>
                        <span className="text-[11px] text-on-surface-variant truncate">{it.restaurant_name_snapshot}</span>
                        {it.restaurant_preparation_time_snapshot ? <span className="text-[11px] text-on-surface-variant">· {it.restaurant_preparation_time_snapshot} د</span> : null}
                      </div>
                      <button onClick={() => setChanging(it)} className="text-[11px] text-primary font-bold flex items-center gap-0.5 flex-shrink-0"><Icon name="swap_horiz" className="text-[14px]" /> تغيير المطعم</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-tertiary">بانتظار تحديد مطعم منفّذ</span>
                      <button onClick={() => setChanging(it)} className="text-[11px] text-primary font-bold flex items-center gap-0.5 flex-shrink-0"><Icon name="storefront" className="text-[14px]" /> اختيار مطعم</button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center bg-surface-container-highest rounded-full px-1 py-1 gap-3">
                    <button onClick={() => updateQuantity(it.cartId, it.quantity - 1)} className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon name="remove" className="text-[18px]" /></button>
                    <span className="font-semibold min-w-[20px] text-center text-sm">{it.quantity}</span>
                    <button onClick={() => updateQuantity(it.cartId, it.quantity + 1)} className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center"><Icon name="add" className="text-[18px]" /></button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/restaurant/${restaurant?.slug || restaurant?.id || ''}`)} className="text-on-surface-variant"><Icon name="edit_note" className="text-[20px]" /></button>
                    <button onClick={() => removeItem(it.cartId)} className="text-error/70"><Icon name="delete_outline" className="text-[20px]" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Smart consolidation offer */}
      <ConsolidationCard opportunity={consolidation} loading={consolidationLoading} onAccept={applyConsolidation} />

      {/* Upsell */}
      {upsell.length > 0 && (
        <div className="mt-2 mb-6">
          <h3 className="px-4 font-bold mb-3 flex items-center gap-2"><Icon name="auto_awesome" className="text-tertiary" />إضافات مقترحة لك</h3>
          <div className="flex overflow-x-auto gap-3 px-4 no-scrollbar pb-2">
            {upsell.map(u => (
              <div key={u.id} className="flex-shrink-0 w-32 bg-surface-container rounded-xl p-2 flex flex-col gap-2">
                <div className="w-full h-24 rounded-lg overflow-hidden bg-surface-variant relative">
                  {u.image_url ? <img className="w-full h-full object-cover" src={resolvePublicMedia(u.image_url)} onError={handleImageError} alt={u.name} /> : null}
                  <button onClick={() => addItem({ id: u.id, name: u.name, price: u.price, image_url: u.image_url, quantity: 1, extras: [] }, restaurant)} className="absolute bottom-1 left-1 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg"><Icon name="add" className="text-[20px]" /></button>
                </div>
                <div><p className="text-label-sm truncate">{u.name}</p><p className="text-primary font-semibold text-sm">₪{u.price}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order breakdown by restaurant (accordion) */}
      {realGroups.length > 0 && (
        <div className="px-4 mb-4">
          <button onClick={() => setBreakdownOpen((v) => !v)} className="w-full bg-surface-container rounded-2xl p-3 flex items-center justify-between">
            <span className="font-bold text-sm flex items-center gap-2"><Icon name="receipt_long" className="text-primary" /> تفصيل الطلب حسب المطعم</span>
            <Icon name={breakdownOpen ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
          </button>
          {breakdownOpen && (
            <div className="mt-2 space-y-2">
              {realGroups.map((g) => (
                <div key={g.restaurant_id} className="bg-surface-container-low rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">
                      {g.restaurant_logo ? <img src={resolvePublicMedia(g.restaurant_logo)} onError={handleImageError} alt="" className="w-full h-full object-cover" /> : <span className="block w-full h-full flex items-center justify-center text-xs">🏪</span>}
                    </div>
                    <span className="font-bold text-sm">{g.restaurant_name}</span>
                    <span className="text-[11px] text-on-surface-variant mr-auto">{g.items.length} منتج</span>
                  </div>
                  <Row label="قيمة المنتجات" value={`₪${Math.round(g.products_subtotal)}`} />
                  <Row label="رسوم التوصيل" value={g.delivery_fee === 0 ? 'مجاني' : `₪${Math.round(g.delivery_fee)}`} />
                  <div className="flex justify-between pt-1 mt-1 border-t border-outline-variant/20"><span className="font-bold text-sm">إجمالي المطعم</span><span className="font-bold text-primary text-sm">₪{Math.round(g.total)}</span></div>
                  {g.prep ? <p className="text-[10px] text-on-surface-variant mt-1">الوصول المتوقع: {g.prep} دقيقة</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="px-4">
        <div className="bg-surface-container rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-on-surface-variant">المجموع الفرعي للمنتجات</span><span className="font-semibold">₪{Math.round(restaurantTotals.products_subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-on-surface-variant">رسوم التوصيل من المطاعم</span><span className="font-semibold">{restaurantTotals.delivery_total === 0 ? 'مجاني' : `₪${Math.round(restaurantTotals.delivery_total)}`}</span></div>
          <div className="border-t border-outline-variant/30 pt-2 mt-1 flex justify-between"><span className="font-bold">الإجمالي</span><span className="font-bold text-primary text-lg">₪{Math.round(restaurantTotals.total)}</span></div>
          <p className="text-[11px] text-on-surface-variant text-center pt-1">
            {singleFulfillment && !hasPendingRestaurant ? 'تم التنفيذ من مطعم واحد' : `تم التنفيذ من ${restaurantCount} مطاعم`}
          </p>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 inset-x-0 px-4 z-40">
        <button onClick={() => navigate('/checkout')} className="w-full bg-primary text-on-primary h-14 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform">
          متابعة للدفع · ₪{Math.round(restaurantTotals.total)}
          <span className="text-xs opacity-90">· {singleFulfillment && !hasPendingRestaurant ? 'توصيل واحد' : `${restaurantCount} مطاعم`}</span>
        </button>
      </div>

      <ChangeRestaurantSheet
        open={!!changing}
        item={changing}
        allItems={items}
        onSelect={(offer) => changing && setItemRestaurant(changing.cartId, offer)}
        onClose={() => setChanging(null)}
      />
    </div>
  );
}

function FulfillmentCard({ single, groups, totalProducts, hasPending, primaryLogo, primaryName }) {
  if (single && groups.length <= 1) {
    // single restaurant or legacy-only
    const g = groups[0];
    return (
      <div className="rounded-xl bg-surface-container p-3 flex items-center gap-3 border border-primary/30">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">
          {g?.restaurant_logo || primaryLogo ? <img src={resolvePublicMedia(g?.restaurant_logo || primaryLogo)} onError={handleImageError} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Icon name="shopping_bag" className="text-primary text-[18px]" />
            <h2 className="font-bold text-sm">{hasPending ? 'تنفيذ طلبك' : 'كل طلبك من مطعم واحد'}</h2>
          </div>
          <p className="text-label-sm text-on-surface-variant">{hasPending ? 'بانتظار تحديد مطعم منفّذ لبعض الوجبات' : `${g?.restaurant_name || primaryName || ''} · ${totalProducts} منتج`}</p>
          {!hasPending && <p className="text-label-sm text-primary">توصيلة وحدة ورسوم أقل</p>}
        </div>
      </div>
    );
  }
  // multiple restaurants
  return (
    <div className="rounded-xl bg-surface-container p-3 border border-primary/30">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2 flex-shrink-0">
          {groups.slice(0, 3).map((g, i) => (
            <div key={i} className="w-10 h-10 rounded-full overflow-hidden bg-surface-variant border-2 border-surface-container">
              {g.restaurant_logo ? <img src={resolvePublicMedia(g.restaurant_logo)} onError={handleImageError} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">🏪</div>}
            </div>
          ))}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Icon name="shopping_bag" className="text-primary text-[18px]" />
            <h2 className="font-bold text-sm">تنفيذ طلبك</h2>
          </div>
          <p className="text-label-sm text-on-surface-variant">طلبك رح يوصلك من {groups.length} مطاعم</p>
          <p className="text-label-sm text-on-surface-variant">توصيل خلال {Math.min(...groups.map((g) => g.prep || 35))}–{Math.max(...groups.map((g) => g.prep || 45))} دقيقة (مجمع)</p>
        </div>
        <Icon name="info" className="text-on-surface-variant" />
      </div>
      <p className="text-[11px] text-on-surface-variant mt-2 leading-snug">كل مطعم بجهّز الجزء التابع إله، وممكن توصل الطلبيات بأوقات مختلفة.</p>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex justify-between text-[11px] text-on-surface-variant"><span>{label}</span><span className="font-semibold text-on-surface">{value}</span></div>;
}