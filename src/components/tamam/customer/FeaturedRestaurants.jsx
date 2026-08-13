import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';
import { SkeletonCard } from '@/components/tamam/customer/States';

/** Curated restaurants — readable horizontal list, secondary to food discovery. */
export default function FeaturedRestaurants({ restaurants, loading, title = 'مطاعم اخترناها بعناية', onViewAll }) {
  const navigate = useNavigate();
  const handleViewAll = () => { if (onViewAll) onViewAll(); else navigate('/restaurants'); };

  // Hide the preview entirely rather than show fake cards when none exist.
  if (!loading && (!restaurants || restaurants.length === 0)) return null;

  return (
    <section className="py-5">
      <div className="flex justify-between items-center mb-3 px-4">
        <h2 className="text-headline-sm font-bold">{title}</h2>
        <button onClick={handleViewAll} className="text-primary text-xs font-bold min-h-[36px]">عرض الكل</button>
      </div>
      {loading ? (
        <div className="flex gap-3 overflow-hidden px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[180px]"><SkeletonCard /></div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
          {restaurants.map((r) => {
            const img = resolvePublicMedia(r.image_url || r.cover_url, null);
            const name = r.name_ar || r.name;
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/restaurants/${r.id}`)}
                className="flex-shrink-0 w-[180px] text-right bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden active:scale-95 transition-transform"
              >
                <div className="h-28 bg-surface-container-high">
                  {img ? <PublicImage src={img} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>}
                </div>
                <div className="p-2.5">
                  <h3 className="font-bold text-sm truncate">{name}</h3>
                  <p className="text-[11px] text-on-surface-variant truncate">{r.category || r.cuisine || ''}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}