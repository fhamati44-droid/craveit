import { Link } from 'react-router-dom';
import HomepageCarouselMealCard from './HomepageCarouselMealCard';
import HomepageCarouselSuggestionCard from './HomepageCarouselSuggestionCard';
import { SkeletonCard } from './States';

function SafeBrowseAll() {
  return (
    <Link to="/restaurants" className="flex-none w-[200px] h-32 snap-start bg-surface-container border border-dashed border-outline-variant/40 rounded-2xl flex flex-col items-center justify-center gap-2 text-center px-4">
      <span className="material-symbols-outlined text-3xl text-primary">restaurant</span>
      <span className="text-xs font-bold text-on-surface">تصفّح كل المطاعم</span>
      <span className="text-[10px] text-on-surface-variant">في وجبات جديدة تنتظرك</span>
    </Link>
  );
}

/** Always-rendered carousel shell. Shows skeletons while loading, real cards when ready, safe action if empty. */
export default function DiscoveryCarousel({ carousel, loading = false, background = '' }) {
  const meals = carousel?.meals || [];
  const cards = carousel?.cards || [];
  const variant = carousel?.card_variant || 'feature';
  return (
    <section className={`py-6 ${background}`}>
      <div className="flex justify-between items-end px-4 mb-4">
        <div>
          <h2 className="text-lg font-bold">{carousel?.title || ''}</h2>
          {carousel?.subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{carousel.subtitle}</p>}
        </div>
        {carousel?.view_all_route && (
          <Link to={carousel.view_all_route} className="text-primary text-xs font-medium flex items-center gap-0.5 whitespace-nowrap">
            {carousel.view_all_label || 'عرض الكل'} <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          </Link>
        )}
      </div>
      <div className="flex overflow-x-auto gap-4 px-4 no-scrollbar snap-x snap-mandatory" dir="rtl">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
        ) : cards.length ? (
          cards.map((c) => <HomepageCarouselSuggestionCard key={c.id} card={c} />)
        ) : meals.length ? (
          meals.map((m) => <HomepageCarouselMealCard key={m.id} meal={m} badge={carousel.badge} variant={variant} />)
        ) : (
          <SafeBrowseAll />
        )}
      </div>
    </section>
  );
}