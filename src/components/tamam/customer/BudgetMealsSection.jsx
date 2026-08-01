import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import HomepageMealCard from '@/components/tamam/customer/HomepageMealCard';
import { SkeletonCard } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';

/** Budget-based meals: price chips + lazy-fetched real meals per selected range. */
export default function BudgetMealsSection({ budget, excludeIds = [] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const trackedRef = useRef(false);
  const ref = useRef(null);
  const ranges = budget?.ranges || [];

  useEffect(() => { setActiveIdx(0); }, [budget?.title]);

  useEffect(() => {
    if (!ranges.length) return;
    let cancelled = false;
    setLoading(true);
    const r = ranges[activeIdx] || ranges[0];
    base44.functions.invoke('supabaseProxy', { action: 'getMealsByPriceRange', payload: { min: r.min, max: r.max, limit: 8, excludeIds } })
      .then((res) => { if (!cancelled) setMeals(res?.data?.data || []); })
      .catch(() => { if (!cancelled) setMeals([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeIdx, ranges.length, excludeIds.length]);

  useEffect(() => {
    if (!ref.current || trackedRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) { track('homepage_section_viewed', { section: 'budget' }); trackedRef.current = true; obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  if (!budget || !ranges.length) return null;
  if (!loading && meals.length < 2) return null;

  return (
    <section ref={ref} className="py-6">
      <div className="px-4 mb-3">
        <h2 className="text-headline-md font-bold">{budget.title}</h2>
        <p className="text-xs text-on-surface-variant">{budget.subtitle}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mb-3">
        {ranges.map((r, i) => (
          <button key={i} onClick={() => setActiveIdx(i)} className={`flex-none px-3.5 py-2 rounded-full text-xs font-bold border ${i === activeIdx ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container text-on-surface border-outline-variant/30'}`}>{r.label}</button>
        ))}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
        {loading ? [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />) : meals.map((m) => <HomepageMealCard key={m.id} meal={m} />)}
      </div>
    </section>
  );
}