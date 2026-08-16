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
        <h2 className="text-headline-sm font-bold text-tamam-text">{title}</h2>
        <button onClick={handleViewAll} className="text-tamam-green-bright text-xs font-bold min-h-[36px] inline-flex items-center gap-0.5">عرض الكل <span className="material-symbols-outlined text-[14px]">arrow_back</span></button>
      </div>
      {loading ? (
        <div className="flex gap-3 overflow-hidden px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[300px]"><SkeletonCard /></div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
          {restaurants.map((r) => {
            const img = resolvePublicMedia(r.image_url || r.cover_url, null);
            const name = r.name_ar || r.name;
            const fast = r.delivery_time_min != null && r.delivery_time_min <= 25;
            const rating = r.rating != null && r.rating > 0 ? Number(r.rating).toFixed(1) : null;
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/restaurants/${r.id}`)}
                className="flex-shrink-0 w-[300px] text-right bg-tamam-surface-lowest border border-tamam-outline/25 rounded-2xl overflow-hidden active:scale-95 transition-transform"
              >
                <div className="relative h-40 bg-tamam-surface-high">
                  {img ? <PublicImage src={img} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {fast && (
                      <span className="inline-flex items-center gap-0.5 bg-tamam-green/90 text-tamam-ink text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[11px]">bolt</span>سريع اليوم
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-[15px] text-tamam-text truncate">{name}</h3>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <p className="text-[11px] text-tamam-text-muted truncate flex-1">{r.category || r.cuisine || ''}</p>
                    {rating && (
                      <span className="inline-flex items-center gap-0.5 text-tamam-gold text-[10px] font-bold shrink-0">
                        <span className="material-symbols-outlined text-[12px]">star</span>{rating}
                      </span>
                    )}
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1 text-tamam-green-bright text-[11px] font-bold">
                    شوف المنيو
                    <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}