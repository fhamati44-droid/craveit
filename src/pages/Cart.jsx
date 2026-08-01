import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { getMenuItemsByRestaurant } from '@/lib/api';
import { resolvePublicMedia, handleImageError } from '@/lib/imageUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function Cart() {
  const navigate = useNavigate();
  const { items, restaurant, subtotal, deliveryFee, total, updateQuantity, removeItem, totalItems, addItem } = useCart();
  const [upsell, setUpsell] = useState([]);

  useEffect(() => {
    if (!restaurant?.id) { setUpsell([]); return; }
    getMenuItemsByRestaurant(restaurant.id).then(cats => {
      const all = (cats || []).flatMap(c => c.items || []).filter(i => i.is_available !== false);
      setUpsell(all.slice(0, 6));
    }).catch(() => setUpsell([]));
  }, [restaurant?.id]);

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
      {/* Restaurant header */}
      {restaurant && (
        <div className="mx-4 relative overflow-hidden rounded-xl bg-surface-container p-3 flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface-variant">{restaurant.image_url || restaurant.logo_url ? <img className="w-full h-full object-cover" src={resolvePublicMedia(restaurant.image_url || restaurant.logo_url)} onError={handleImageError} alt="" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>}</div>
          <div className="flex-1">
            <div className="flex items-center gap-1"><h2 className="font-bold">{restaurant.name}</h2>{restaurant.is_open !== false && <Icon name="verified" className="text-primary text-[18px]" />}</div>
            <p className="text-label-sm text-on-surface-variant">{restaurant.delivery_time ? `توصيل خلال ${restaurant.delivery_time} دقيقة` : 'توصيل سريع'}</p>
          </div>
          <button onClick={() => navigate(`/restaurant/${restaurant.slug || restaurant.id}`)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary"><Icon name="storefront" /></button>
        </div>
      )}

      <h1 className="px-4 text-headline-md font-bold mb-3">سلة الطلبات</h1>

      {/* Items */}
      <div className="px-4 flex flex-col gap-3 mb-6">
        {items.map(it => (
          <div key={it.cartId} className="bg-surface-container-low rounded-xl p-3 flex gap-3 active:scale-[0.98] transition-transform">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">{it.image_url ? <img className="w-full h-full object-cover" src={resolvePublicMedia(it.image_url)} onError={handleImageError} alt={it.name} /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}</div>
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-sm truncate">{it.name}</h3>
                <span className="font-semibold text-sm">₪{Math.round((it.price + (it.extras || []).reduce((s, e) => s + (e.price || 0), 0)) * it.quantity)}</span>
              </div>
              {it.extras?.length > 0 && <p className="text-[11px] text-on-surface-variant truncate">{it.extras.map(e => e.name).join('، ')}</p>}
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
        ))}
      </div>

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

      {/* Summary */}
      <div className="px-4">
        <div className="bg-surface-container rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-on-surface-variant">المجموع الفرعي</span><span className="font-semibold">₪{Math.round(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-on-surface-variant">رسوم التوصيل</span><span className="font-semibold">{deliveryFee === 0 ? 'مجاني' : `₪${Math.round(deliveryFee)}`}</span></div>
          <div className="border-t border-outline-variant/30 pt-2 mt-1 flex justify-between"><span className="font-bold">الإجمالي</span><span className="font-bold text-primary text-lg">₪{Math.round(total)}</span></div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 inset-x-0 px-4 z-40">
        <button onClick={() => navigate('/checkout')} className="w-full bg-primary text-on-primary h-14 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform">
          متابعة للدفع · ₪{Math.round(total)}
        </button>
      </div>
    </div>
  );
}