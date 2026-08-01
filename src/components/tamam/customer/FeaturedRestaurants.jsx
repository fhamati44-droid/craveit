import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';
import { SkeletonCard, EmptyState } from '@/components/tamam/customer/States';

/** Featured / nearby restaurants grid. */
export default function FeaturedRestaurants({ restaurants, loading, title = 'مطاعم قريبة منك' }) {
  const navigate = useNavigate();
  return (
    <section className="px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-headline-md font-bold">{title}</h2>
        <button onClick={() => navigate('/restaurants')} className="text-primary text-xs font-bold">عرض الكل</button>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}</div>
      ) : restaurants && restaurants.length ? (
        <div className="grid grid-cols-2 gap-3">
          {restaurants.map((r) => {
            const img = resolvePublicMedia(r.image_url || r.cover_url, null);
            const name = r.name_ar || r.name;
            return (
              <button key={r.id} onClick={() => navigate(`/restaurants/${r.id}`)} className="text-right bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden active:scale-95 transition-transform">
                <div className="h-24 bg-surface-container-high">
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
      ) : <EmptyState icon="🏪" title="ما لقينا مطاعم بهالمنطقة" />}
    </section>
  );
}