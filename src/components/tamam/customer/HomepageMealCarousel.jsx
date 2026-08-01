import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HomepageCarouselMealCard from '@/components/tamam/customer/HomepageCarouselMealCard';
import HomepageCarouselSuggestionCard from '@/components/tamam/customer/HomepageCarouselSuggestionCard';
import { SkeletonCard } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';

/**
 * Reusable homepage meal carousel.
 * carousel: { key, title, subtitle, card_variant, view_all_route, view_all_label, meals?, cards? }
 * Renders real meals (meal cards) or suggestion/deal cards, horizontally scrollable, RTL, lazy-tracked.
 */
export default function HomepageMealCarousel({ carousel, loading = false, background = 'bg-transparent' }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const trackedRef = useRef(false);
  const meals = carousel?.meals || [];
  const cards = carousel?.cards || [];
  const variant = carousel?.card_variant || 'large';

  useEffect(() => {
    if (!ref.current || trackedRef.current || (!meals.length && !cards.length)) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        track('homepage_carousel_viewed', { key: carousel.key, count: meals.length || cards.length, variant });
        trackedRef.current = true;
        obs.disconnect();
      }
    }, { threshold: 0.25 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [meals.length, cards.length]);

  if (!loading && meals.length < 2 && cards.length < 2) return null;
  const isSuggestions = cards.length > 0;

  return (
    <section ref={ref} className={`py-6 ${background}`}>
      <div className="flex justify-between items-center px-4 mb-3">
        <div>
          <h2 className="text-headline-md font-bold">{carousel?.title}</h2>
          {carousel?.subtitle && <p className="text-xs text-on-surface-variant">{carousel.subtitle}</p>}
        </div>
        {carousel?.view_all_route && (
          <button onClick={() => { track('carousel_view_all', { key: carousel.key, route: carousel.view_all_route }); navigate(carousel.view_all_route); }} className="text-primary text-xs font-bold flex items-center gap-0.5">
            {carousel.view_all_label || 'شوف الكل'} <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          </button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
        ) : isSuggestions ? (
          cards.map((c) => <HomepageCarouselSuggestionCard key={c.id} card={c} />)
        ) : (
          meals.map((m) => <HomepageCarouselMealCard key={m.id} meal={m} badge={carousel.badge} variant={variant === 'feature' ? 'large' : variant} />)
        )}
      </div>
    </section>
  );
}