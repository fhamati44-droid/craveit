import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import HomepageCarouselMealCard from './HomepageCarouselMealCard';
import { SkeletonCard } from './States';
import { track } from '@/lib/analytics';

/** Budget section: price chips (filter on click) + compact meal cards. Always renders the shell. */
export default function BudgetInline({ budget, loading = false }) {
  const ranges = budget?.ranges || [];
  const initialMeals = budget?.meals || [];
  const [activeIdx, setActiveIdx] = useState(budget?.activeRangeIdx || 0);
  const [meals, setMeals] = useState(initialMeals);
  const [fetching, setFetching] = useState(false);

  useEffect(() => { setMeals(initialMeals); setActiveIdx(budget?.activeRangeIdx || 0); }, [initialMeals.length, budget?.activeRangeIdx]);

  const selectRange = (i) => {
    setActiveIdx(i);
    const r = ranges[i];
    if (!r) return;
    setFetching(true);
    base44.functions.invoke('supabaseProxy', { action: 'getMealsByPriceRange', payload: { min: r.min, max: r.max, limit: 8 } })
      .then((res) => setMeals(res?.data?.data || []))
      .catch(() => setMeals([]))
      .finally(() => setFetching(false));
    track('budget_range_selected', { range: r.label });
  };

  return (
    <section className="py-6 bg-surface-container/50">
      <div className="px-4 mb-3">
        <h2 className="text-lg font-bold">{budget?.title || 'خيارات بسعر مريح'}</h2>
        {budget?.subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{budget.subtitle}</p>}
      </div>
      {ranges.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mb-3">
          {ranges.map((r, i) => (
            <button key={i} onClick={() => selectRange(i)} className={`flex-none px-3.5 py-2 rounded-full text-[10px] font-bold border whitespace-nowrap ${i === activeIdx ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface text-on-surface border-outline-variant/30'}`}>{r.label}</button>
          ))}
        </div>
      )}
      <div className="flex overflow-x-auto gap-3 px-4 no-scrollbar snap-x snap-mandatory" dir="rtl">
        {(loading || fetching) ? [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />) : meals.length ? meals.map((m) => <HomepageCarouselMealCard key={m.id} meal={m} variant="compact" />) : <p className="text-xs text-on-surface-variant px-4 py-8">لا وجبات في هذا النطاق حاليًا.</p>}
      </div>
    </section>
  );
}