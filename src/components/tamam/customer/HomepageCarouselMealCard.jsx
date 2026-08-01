import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';
import { useCart } from '@/lib/CartContext';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Reusable meal card for homepage carousels.
 * variant: 'large' (~76% screen width, big photo + description + prep time)
 *          'compact' (170px, dense)
 */
export default function HomepageCarouselMealCard({ meal, badge, variant = 'large' }) {
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const [added, setAdded] = useState(false);
  if (!meal) return null;

  const img = resolvePublicMedia(meal.image_url, null);
  const unavailable = meal.is_available === false;
  const requiresCustomization = meal.has_required_extras === true;
  const mealRoute = `/restaurants/${meal.restaurant_id}?meal=${meal.id}`;
  const card = variant === 'compact' ? 'compact' : 'large';

  const openDetails = () => {
    track('homepage_meal_opened', { meal_id: meal.id, restaurant_id: meal.restaurant_id, card });
    navigate(mealRoute);
  };
  const handleAdd = (e) => {
    e.stopPropagation();
    if (unavailable || requiresCustomization) { openDetails(); return; }
    addItem(
      { id: meal.id, name: meal.name, price: meal.price, image_url: meal.image_url, quantity: 1, extras: [], note: '', restaurant_id: meal.restaurant_id },
      { id: meal.restaurant_id, name: meal.restaurant_name }
    );
    track('homepage_meal_added_to_cart', { meal_id: meal.id, restaurant_id: meal.restaurant_id, card });
    setAdded(true);
    setTimeout(() => setAdded(false), 3500);
  };

  if (variant === 'compact') {
    return (
      <div className="flex-none w-44 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden flex flex-col">
        <button onClick={openDetails} className="relative h-28 bg-surface-container-high text-right">
          {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
          {badge && <span className="absolute top-1.5 right-1.5 bg-tertiary/90 text-on-tertiary text-[9px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
          {unavailable && <span className="absolute inset-0 bg-background/60 flex items-center justify-center text-[10px] font-bold text-on-surface-variant">غير متاح</span>}
        </button>
        <div className="p-2.5 flex-1 flex flex-col">
          <button onClick={openDetails} className="text-right">
            <h3 className="font-bold text-sm truncate text-on-surface leading-tight">{meal.name}</h3>
            <p className="text-[11px] text-on-surface-variant truncate">{meal.restaurant_name}</p>
          </button>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-primary font-bold text-sm">₪{Math.round(meal.price)}</span>
            {meal.prep_time && <span className="text-[9px] text-on-surface-variant flex items-center gap-0.5"><Icon name="schedule" className="text-[12px]" />{meal.prep_time}د</span>}
          </div>
          <div className="mt-2">
            {added ? (
              <button onClick={() => navigate('/cart')} className="w-full h-8 bg-surface-high text-on-surface rounded-lg text-[11px] font-bold flex items-center justify-center gap-1"><Icon name="check" className="text-[14px] text-primary" /> السلة ({totalItems})</button>
            ) : (
              <button onClick={requiresCustomization ? openDetails : handleAdd} disabled={unavailable}
                className={`w-full h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 ${unavailable ? 'bg-surface-high text-on-surface-variant' : requiresCustomization ? 'bg-surface-high text-on-surface' : 'bg-primary text-on-primary'}`}>
                {unavailable ? 'غير متاح' : requiresCustomization ? <><Icon name="tune" className="text-[14px]" /> اختار التفاصيل</> : <><Icon name="add_shopping_cart" className="text-[14px]" /> أضف للسلة</>}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // large
  return (
    <div className="flex-none w-72 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden flex flex-col">
      <button onClick={openDetails} className="relative h-44 bg-surface-container-high text-right">
        {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>}
        {badge && <span className="absolute top-2 right-2 bg-tertiary text-on-tertiary text-[10px] font-bold px-2 py-1 rounded-full">{badge}</span>}
        {unavailable && <span className="absolute inset-0 bg-background/60 flex items-center justify-center text-xs font-bold text-on-surface-variant">غير متاح</span>}
      </button>
      <div className="p-3 flex-1 flex flex-col">
        <button onClick={openDetails} className="text-right">
          <h3 className="font-bold text-base leading-tight text-on-surface">{meal.name}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">{meal.restaurant_name}</p>
        </button>
        {meal.description && <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-2 mt-1">{meal.description}</p>}
        <div className="flex items-center justify-between mt-2">
          <span className="text-primary font-bold text-lg">₪{Math.round(meal.price)}</span>
          {meal.prep_time && <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5"><Icon name="schedule" className="text-[14px]" />{meal.prep_time}د</span>}
        </div>
        <div className="mt-3">
          {added ? (
            <button onClick={() => navigate('/cart')} className="w-full h-10 bg-surface-high text-on-surface rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Icon name="check" className="text-[16px] text-primary" /> متابعة للسلة ({totalItems})</button>
          ) : (
            <button onClick={requiresCustomization ? openDetails : handleAdd} disabled={unavailable}
              className={`w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${unavailable ? 'bg-surface-high text-on-surface-variant' : requiresCustomization ? 'bg-surface-high text-on-surface' : 'bg-primary text-on-primary'}`}>
              {unavailable ? 'غير متاح' : requiresCustomization ? <><Icon name="tune" className="text-[16px]" /> اختار التفاصيل</> : <><Icon name="add_shopping_cart" className="text-[16px]" /> أضف للسلة</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}