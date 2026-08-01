import { useNavigate } from 'react-router-dom';
import HomeMealCard from '@/components/tamam/customer/HomeMealCard';
import { SkeletonCard } from '@/components/tamam/customer/States';

/** Popular food categories, each with a horizontal row of real purchasable meals underneath. */
export default function PopularCategoryMeals({ categories, loading, title = 'أكلات شعبية' }) {
  const navigate = useNavigate();
  if (!loading && (!categories || !categories.length)) return null;
  return (
    <section className="py-6 space-y-6">
      <h2 className="text-headline-md font-bold px-4">{title}</h2>
      {loading && <div className="px-4"><SkeletonCard /></div>}
      {categories && categories.map((c, idx) => (
        <div key={idx} className="space-y-3">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-headline-sm font-bold">{c.name}</h3>
            <button onClick={() => navigate(`/restaurants?category=${encodeURIComponent(c.name)}`)} className="text-primary text-xs font-bold">شوف الكل</button>
          </div>
          {c.meals && c.meals.length ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
              {c.meals.map((m) => (
                <HomeMealCard key={m.meal_id || m.id} meal={m} onOpen={() => navigate(`/restaurants/${m.restaurant_id}?meal=${m.meal_id || m.id || ''}`)} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant px-4">ما في وجبات متاحة بهالتصنيف حاليًا</p>
          )}
        </div>
      ))}
    </section>
  );
}