import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';

/** Reusable real-image meal card for the homepage (most-ordered + popular categories). */
export default function HomeMealCard({ meal, onOpen }) {
  if (!meal) return null;
  const img = resolvePublicMedia(meal.image_url, null);
  return (
    <button onClick={onOpen} className="flex-none w-40 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden text-right active:scale-95 transition-transform">
      <div className="h-24 bg-surface-container-high">
        {img ? <PublicImage src={img} alt={meal.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
      </div>
      <div className="p-2.5 space-y-0.5">
        <h3 className="font-bold text-sm truncate text-on-surface">{meal.name}</h3>
        {meal.restaurant_name && <p className="text-[11px] text-on-surface-variant truncate">{meal.restaurant_name}</p>}
        <div className="flex items-center justify-between">
          {meal.price != null && <span className="text-primary font-bold text-sm">₪{Math.round(meal.price)}</span>}
          {meal.count != null && <span className="text-[10px] text-on-surface-variant">{meal.count}×</span>}
        </div>
      </div>
    </button>
  );
}