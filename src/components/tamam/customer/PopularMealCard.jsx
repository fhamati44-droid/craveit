export default function PopularMealCard({ meal, onOpen }) {
  return (
    <button onClick={onOpen} className="flex-none w-44 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden text-right active:scale-95 transition-transform">
      <div className="h-24 bg-surface-container-high flex items-center justify-center text-3xl">🍽️</div>
      <div className="p-3 space-y-1">
        <span className="inline-block bg-tertiary/15 text-tertiary text-[9px] font-bold px-1.5 py-0.5 rounded">طلب {meal.count} مرة</span>
        <h3 className="font-bold text-sm truncate text-on-surface">{meal.name}</h3>
        {meal.restaurantName && <p className="text-[11px] text-on-surface-variant truncate">{meal.restaurantName}</p>}
        {meal.price != null && <div className="text-primary font-bold text-sm">₪{meal.price}</div>}
      </div>
    </button>
  );
}