import { useNavigate } from 'react-router-dom';
import HomeMealCard from '@/components/tamam/customer/HomeMealCard';
import { SkeletonCard, EmptyState } from '@/components/tamam/customer/States';

/** Most-ordered real meals (horizontal scroll). */
export default function MostOrderedMeals({ meals, loading, title = 'الأكثر طلبًا' }) {
  const navigate = useNavigate();
  return (
    <section className="py-6">
      <h2 className="text-headline-md font-bold mb-4 px-4">{title}</h2>
      {loading ? (
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
      ) : meals && meals.length ? (
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
          {meals.map((m) => (
            <HomeMealCard key={m.meal_id || m.id} meal={m} onOpen={() => navigate(`/restaurants/${m.restaurant_id}?meal=${m.meal_id || m.id || ''}`)} />
          ))}
        </div>
      ) : (
        <div className="px-4"><EmptyState icon="🍽️" title="ما في طلبات كفاية لعرض الأكثر طلبًا" /></div>
      )}
    </section>
  );
}