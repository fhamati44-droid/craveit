import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';
import { useCart } from '@/lib/CartContext';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/** Compact add-on card — used for حلويات وتسالي and كمّل طلبك. */
export default function CompactMealCard({ meal }) {
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const [added, setAdded] = useState(false);
  if (!meal) return null;

  const img = resolvePublicMedia(meal.image_url, null);
  const unavailable = meal.is_available === false;
  const requiresCustomization = meal.has_required_extras === true;
  const mealRoute = `/restaurants/${meal.restaurant_id}?meal=${meal.id}`;

  const openDetails = () => {
    track('homepage_meal_opened', { meal_id: meal.id, restaurant_id: meal.restaurant_id, card: 'compact' });
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
    <div className="flex-none w-28 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden flex flex-col">
      <button onClick={openDetails} className="relative aspect-square bg-surface-container-high text-right">
        {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
        {unavailable && <span className="absolute inset-0 bg-background/60 flex items-center justify-center text-[9px] font-bold text-on-surface-variant">غير متاح</span>}
      </button>
      <div className="p-1.5 flex-1 flex flex-col">
        <h3 className="font-bold text-[11px] leading-tight text-on-surface line-clamp-2">{meal.name}</h3>
        <p className="text-[9px] text-on-surface-variant truncate">{meal.restaurant_name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-primary font-bold text-xs">₪{Math.round(meal.price)}</span>
          {added ? (
            <button onClick={() => navigate('/cart')} className="w-7 h-7 bg-surface-high rounded-lg flex items-center justify-center"><Icon name="check" className="text-[14px] text-primary" /></button>
          ) : (
            <button onClick={requiresCustomization ? openDetails : handleAdd} disabled={unavailable}
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${unavailable ? 'bg-surface-high text-on-surface-variant' : 'bg-primary text-on-primary'}`}>
              {unavailable ? '—' : requiresCustomization ? <Icon name="tune" className="text-[14px]" /> : <Icon name="add" className="text-[14px]" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}