import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HomepageMealCard from '@/components/tamam/customer/HomepageMealCard';
import { SkeletonCard } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';

/** Generic curated-meals carousel: title + subtitle + "شوف الكل" + horizontal meal cards. */
export default function CuratedMealsSection({ section, loading }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const meals = section?.meals || [];
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!ref.current || trackedRef.current || !meals.length) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        track('homepage_section_viewed', { section: section.key, meal_count: meals.length });
        trackedRef.current = true;
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [meals.length]);

  if (!loading && meals.length < 2) return null;

  return (
    <section ref={ref} className="py-6">
      <div className="flex justify-between items-center px-4 mb-3">
        <div>
          <h2 className="text-headline-md font-bold">{section?.title}</h2>
          {section?.subtitle && <p className="text-xs text-on-surface-variant">{section.subtitle}</p>}
        </div>
        {section?.view_all_route && (
          <button onClick={() => { track('category_opened', { route: section.view_all_route }); navigate(section.view_all_route); }} className="text-primary text-xs font-bold">{section.view_all_label || 'شوف الكل'}</button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
        ) : (
          meals.map((m) => <HomepageMealCard key={m.id} meal={m} badge={section.badge} />)
        )}
      </div>
    </section>
  );
}