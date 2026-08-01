import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';
import { useCart } from '@/lib/CartContext';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/** Reusable homepage meal card with direct add-to-cart or open-details. */
export default function HomepageMealCard({ meal, badge, onTrackView }) {
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const [added, setAdded] = useState(false);
  if (!meal) return null;

  const img = resolvePublicMedia(meal.image_url, null);
  const unavailable = meal.is_available === false;
  const requiresCustomization = meal.has_required_extras === true;
  const mealRoute = `/restaurants/${meal.restaurant_id}?meal=${meal.id}`;

  const openDetails = () => {
    track('homepage_meal_opened', { meal_id: meal.id, restaurant_id: meal.restaurant_id });
    navigate(mealRoute);
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    if (unavailable || requiresCustomization) { openDetails(); return; }
    addItem(
      { id: meal.id, name: meal.name, price: meal.price, image_url: meal.image_url, quantity: 1, extras: [], note: '', restaurant_id: meal.restaurant_id },
      { id: meal.restaurant_id, name: meal.restaurant_name }
    );
    track('homepage_meal_added_to_cart', { meal_id: meal.id, restaurant_id: meal.restaurant_id });
    setAdded(true);
    setTimeout(() => setAdded(false), 3500);
  };

  return (
    <div className="flex-none w-40 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden flex flex-col">
      <button onClick={openDetails} className="relative h-24 bg-surface-container-high text-right">
        {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
        {badge && <span className="absolute top-1.5 right-1.5 bg-tertiary/90 text-on-tertiary text-[9px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
        {unavailable && <span className="absolute inset-0 bg-background/60 flex items-center justify-center text-[10px] font-bold text-on-surface-variant">غير متاح</span>}
      </button>
      <div className="p-2.5 flex-1 flex flex-col">
        <button onClick={openDetails} className="text-right">
          <h3 className="font-bold text-sm truncate text-on-surface leading-tight">{meal.name}</h3>
          <p className="text-[11px] text-on-surface-variant truncate">{meal.restaurant_name}</p>
        </button>
        {meal.description && <p className="text-[10px] text-on-surface-variant leading-tight line-clamp-1 mt-0.5">{meal.description}</p>}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-primary font-bold text-sm">₪{Math.round(meal.price)}</span>
          {meal.prep_time && <span className="text-[9px] text-on-surface-variant flex items-center gap-0.5"><Icon name="schedule" className="text-[12px]" />{meal.prep_time}د</span>}
        </div>
        <div className="mt-2">
          {added ? (
            <button onClick={() => navigate('/cart')} className="w-full h-8 bg-surface-high text-on-surface rounded-lg text-[11px] font-bold flex items-center justify-center gap-1">
              <Icon name="check" className="text-[14px] text-primary" /> متابعة للسلة ({totalItems})
            </button>
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