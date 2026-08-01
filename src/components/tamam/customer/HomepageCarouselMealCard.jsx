import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';
import { useCart } from '@/lib/CartContext';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Variant-driven meal card for homepage carousels, matching the uploaded HTML reference.
 * variants: 'feature'(260px) | 'wide'(280px) | 'tall'(160px overlay) | 'medium'(140px 4:3)
 *           'new'(220px badge) | 'compact'(140px square+add) | 'circular'(130px gold) | 'mini'(100px)
 * Respects cart restaurant-compatibility: incompatible add routes to details instead of silently clearing.
 */
export default function HomepageCarouselMealCard({ meal, badge, variant = 'feature' }) {
  const navigate = useNavigate();
  const { addItem, totalItems, restaurant: cartRest } = useCart();
  const [added, setAdded] = useState(false);
  if (!meal) return null;

  const img = resolvePublicMedia(meal.image_url, null);
  const unavailable = meal.is_available === false;
  const requiresCustomization = meal.has_required_extras === true;
  const mealRoute = `/restaurants/${meal.restaurant_id}?meal=${meal.id}`;
  const incompatibleCart = cartRest && cartRest.id && meal.restaurant_id && String(cartRest.id) !== String(meal.restaurant_id);

  const openDetails = () => { track('homepage_meal_opened', { meal_id: meal.id, variant }); navigate(mealRoute); };
  const handleAdd = (e) => {
    e.stopPropagation();
    if (unavailable || requiresCustomization || incompatibleCart) { openDetails(); return; }
    addItem({ id: meal.id, name: meal.name, price: meal.price, image_url: meal.image_url, quantity: 1, extras: [], note: '', restaurant_id: meal.restaurant_id }, { id: meal.restaurant_id, name: meal.restaurant_name });
    track('homepage_meal_added_to_cart', { meal_id: meal.id, variant });
    setAdded(true);
    setTimeout(() => setAdded(false), 3500);
  };
  const addDisabled = unavailable;
  const addBtn = (extraClass = '', label = 'أضف للسلة', icon = 'add_shopping_cart') => {
    if (added) return <button onClick={() => navigate('/cart')} className={`w-full rounded-lg text-xs font-bold flex items-center justify-center gap-1 bg-surface-high text-on-surface h-9 ${extraClass}`}><Icon name="check" className="text-[14px] text-primary" /> السلة ({totalItems})</button>;
    if (unavailable) return <button disabled className={`w-full h-9 rounded-lg text-xs font-bold bg-surface-high text-on-surface-variant ${extraClass}`}>غير متاح</button>;
    if (requiresCustomization) return <button onClick={openDetails} className={`w-full h-9 rounded-lg text-xs font-bold bg-surface-high text-on-surface flex items-center justify-center gap-1 ${extraClass}`}><Icon name="tune" className="text-[14px]" /> اختار التفاصيل</button>;
    return <button onClick={handleAdd} className={`w-full h-9 rounded-lg text-xs font-bold bg-primary text-on-primary flex items-center justify-center gap-1 ${extraClass}`}><Icon name={icon} className="text-[14px]" /> {label}</button>;
  };

  // ---- feature (260px, h-36, badge, button) ----
  if (variant === 'feature') return (
    <div className="flex-none w-[260px] snap-start bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
      <button onClick={openDetails} className="relative h-36 w-full block bg-surface-container-high text-right">
        {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
        {badge && <span className="absolute top-2 left-2 bg-primary/90 text-on-primary text-[9px] font-bold px-2 py-0.5 rounded">{badge}</span>}
        {unavailable && <span className="absolute inset-0 bg-background/60 flex items-center justify-center text-[10px] font-bold text-on-surface-variant">غير متاح</span>}
      </button>
      <div className="p-3 space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold truncate flex-1 text-left">{meal.name}</h3>
          <span className="text-primary font-bold text-sm">₪{Math.round(meal.price)}</span>
        </div>
        <p className="text-[10px] text-on-surface-variant truncate">{meal.restaurant_name}</p>
        {addBtn()}
      </div>
    </div>
  );

  // ---- wide (280px, h-40, description, button) ----
  if (variant === 'wide') return (
    <div className="flex-none w-[280px] snap-start bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
      <button onClick={openDetails} className="h-40 w-full block bg-surface-container-high text-right">
        {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>}
      </button>
      <div className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-bold flex-1 text-left">{meal.name}</h3>
          <span className="text-primary font-bold">₪{Math.round(meal.price)}</span>
        </div>
        <p className="text-[10px] text-on-surface-variant line-clamp-1">{meal.description || meal.restaurant_name}</p>
        {addBtn('mt-1', 'أضف للسلة')}
      </div>
    </div>
  );

  // ---- tall (160px, overlay name on image, price + cart icon) ----
  if (variant === 'tall') return (
    <div className="flex-none w-[160px] snap-start space-y-2">
      <button onClick={openDetails} className="h-40 w-full block rounded-2xl overflow-hidden relative bg-surface-container-high text-right">
        {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 right-2 text-white text-[11px] font-bold drop-shadow">{meal.name}</div>
        {unavailable && <span className="absolute inset-0 bg-background/60 flex items-center justify-center text-[10px] font-bold text-on-surface-variant">غير متاح</span>}
      </button>
      <div className="flex justify-between items-center px-1">
        <span className="text-primary text-xs font-bold">₪{Math.round(meal.price)}</span>
        <button onClick={requiresCustomization ? openDetails : handleAdd} disabled={addDisabled} className="bg-primary/20 text-primary p-1.5 rounded-full"><Icon name="shopping_cart" className="text-[16px]" /></button>
      </div>
    </div>
  );

  // ---- medium (140px, 4:3 image, name + price) ----
  if (variant === 'medium') return (
    <div className="flex-none w-[140px] snap-start space-y-2">
      <button onClick={openDetails} className="block w-full text-right">
        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-high">
          {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
        </div>
        <div className="text-xs font-bold truncate">{meal.name}</div>
        <div className="flex items-center justify-between">
          <span className="text-primary text-[10px] font-bold">₪{Math.round(meal.price)}</span>
          <span onClick={(e) => { e.stopPropagation(); if (!addDisabled && !requiresCustomization) handleAdd(e); else openDetails(); }} className="material-symbols-outlined text-[16px] bg-primary/10 text-primary rounded p-0.5">{unavailable ? 'block' : 'add'}</span>
        </div>
      </button>
    </div>
  );

  // ---- new (220px, surface-container, h-32, tertiary badge, button) ----
  if (variant === 'new') return (
    <div className="flex-none w-[220px] snap-start bg-surface-container rounded-2xl p-3 border border-primary/20">
      <button onClick={openDetails} className="relative mb-3 block w-full text-right">
        <div className="w-full h-32 rounded-xl overflow-hidden bg-surface-container-high">
          {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
        </div>
        <span className="absolute top-2 right-2 bg-tertiary text-on-tertiary text-[8px] font-bold px-2 py-0.5 rounded-full">{badge || 'جديد'}</span>
      </button>
      <h3 className="text-xs font-bold mb-1 truncate">{meal.name}</h3>
      <p className="text-[10px] text-on-surface-variant truncate mb-2">{meal.restaurant_name}</p>
      <div className="flex justify-between items-center gap-2">
        <span className="text-primary text-xs font-bold">₪{Math.round(meal.price)}</span>
        {addBtn('flex-1 h-7', 'جرب الآن')}
      </div>
    </div>
  );

  // ---- compact (140px square + add overlay) ----
  if (variant === 'compact') return (
    <div className="flex-none w-[140px] snap-start space-y-2">
      <button onClick={openDetails} className="relative aspect-square rounded-2xl overflow-hidden block w-full bg-surface-container text-right">
        {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
        {!unavailable && !requiresCustomization && <span onClick={(e) => { e.stopPropagation(); handleAdd(e); }} className="absolute bottom-2 right-2 bg-background/60 backdrop-blur-sm p-1 rounded-full"><Icon name="add" className="text-xs text-primary" /></span>}
        {(unavailable || requiresCustomization) && <span className="absolute bottom-2 right-2 bg-background/60 backdrop-blur-sm p-1 rounded-full"><Icon name={unavailable ? 'block' : 'tune'} className="text-xs text-primary" /></span>}
      </button>
      <div className="text-xs font-bold truncate">{meal.name}</div>
      <div className="text-[10px] text-primary font-bold">₪{Math.round(meal.price)}</div>
    </div>
  );

  // ---- circular (130px, gold border, dessert) ----
  if (variant === 'circular') return (
    <div className="flex-none w-[130px] snap-start flex flex-col items-center">
      <button onClick={openDetails} className="w-full aspect-square rounded-full overflow-hidden border-2 border-tertiary p-1 mb-2 block bg-surface-container">
        {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full rounded-full flex items-center justify-center text-3xl">🍰</div>}
      </button>
      <span className="text-[10px] font-bold truncate w-full text-center">{meal.name}</span>
      <span className="text-primary text-[10px] font-bold">₪{Math.round(meal.price)}</span>
      <button onClick={requiresCustomization ? openDetails : handleAdd} disabled={addDisabled} className="mt-1 w-full py-0.5 bg-primary/10 text-primary text-[10px] rounded font-bold">+</button>
    </div>
  );

  // ---- mini (100px, tiny) ----
  if (variant === 'mini') return (
    <div className="flex-none w-[100px] snap-start bg-surface p-2 rounded-xl border border-outline-variant/10 text-center">
      <button onClick={openDetails} className="block w-full">
        <div className="w-12 h-12 mx-auto mb-1 rounded overflow-hidden bg-surface-container-high">
          {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🥤</div>}
        </div>
        <div className="text-[9px] font-medium truncate">{meal.name}</div>
        <div className="text-primary text-[10px] font-bold">₪{Math.round(meal.price)}</div>
      </button>
      <button onClick={requiresCustomization ? openDetails : handleAdd} disabled={addDisabled} className="mt-1 w-full py-0.5 bg-primary/10 text-primary text-[10px] rounded font-bold">+</button>
    </div>
  );

  return null;
}