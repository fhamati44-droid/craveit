import { Star, Clock } from 'lucide-react';

/** Restaurant card fed by restaurantToCard() adapter. */
export default function RestaurantCardTamam({ restaurant, onOpen }) {
  const open = restaurant?.isOpen !== false;
  return (
    <button
      onClick={onOpen}
      className="w-full text-right rounded-2xl bg-tamam-surface overflow-hidden border border-tamam-outline/30"
    >
      <div className="relative h-28 bg-tamam-surface-low">
        {restaurant?.coverUrl ? (
          <img src={restaurant.coverUrl} alt={restaurant?.name || ''} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>
        )}
        <span
          className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            open ? 'bg-tamam-green/20 text-tamam-green-bright' : 'bg-tamam-error/20 text-tamam-error'
          }`}
        >
          {open ? 'مفتوح' : 'مغلق'}
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-tamam-text text-sm truncate">{restaurant?.name || 'مطعم'}</h3>
          {restaurant?.rating != null && (
            <span className="flex items-center gap-0.5 text-xs text-tamam-gold flex-shrink-0">
              <Star size={12} className="fill-tamam-gold" /> {restaurant.rating}
            </span>
          )}
        </div>
        {restaurant?.categories?.length > 0 && (
          <p className="text-tamam-text-muted text-[11px] mt-0.5 truncate">{restaurant.categories.join(' • ')}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-tamam-text-muted">
          {restaurant?.deliveryMin != null && (
            <span className="flex items-center gap-0.5"><Clock size={11} /> {restaurant.deliveryMin} د</span>
          )}
          {restaurant?.deliveryFee != null && (
            <span>{restaurant.deliveryFee === 0 ? 'توصيل مجاني' : `₪${restaurant.deliveryFee}`}</span>
          )}
        </div>
      </div>
    </button>
  );
}