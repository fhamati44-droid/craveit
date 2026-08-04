import { motion } from 'framer-motion';
import { resolvePublicImage } from '@/lib/imageUtils';

export default function MoodGameMealTray({ meals, restaurant, loading, dragMealId, onMealPointerDown }) {
  return (
    <div dir="rtl" className="relative bg-tamam-surface-lowest/80 backdrop-blur-sm rounded-t-2xl border-t border-tamam-outline/20 pb-safe">
      <div className="px-3 pt-2 pb-1">
        <p className="text-tamam-text-muted text-[10px] font-semibold">
          {restaurant ? (restaurant.name_ar || restaurant.name) : 'اختار مطعم أول'}
        </p>
      </div>
      {loading ? (
        <div className="flex gap-2 px-3 pb-2 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-24 h-20 skeleton-t rounded-xl" />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <div className="text-center text-tamam-text-muted text-[11px] py-6">
          ما في وجبات متوفرة لهالمطعم
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 pb-2">
          {meals.map((meal) => (
            <MealTile
              key={meal.id}
              meal={meal}
              isDragging={dragMealId === meal.id}
              onPointerDown={(e) => onMealPointerDown(e, meal)}
            />
          ))}
        </div>
      )}
      {/* Drag hint */}
      <div className="text-center pb-1">
        <span className="text-tamam-text-muted text-[8px]">اسحب للطاولة أو اضغط للتفاصيل</span>
      </div>
    </div>
  );
}

function MealTile({ meal, isDragging, onPointerDown }) {
  const img = resolvePublicImage(meal.image_url, null);
  const available = meal.is_available !== false;
  return (
    <motion.div
      onPointerDown={onPointerDown}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: isDragging ? 0.9 : 1 }}
      className={`flex-shrink-0 w-24 rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'border-tamam-green-bright' : available ? 'border-tamam-outline/20 bg-tamam-surface' : 'border-tamam-outline/10 opacity-50'
      }`}
      style={{ touchAction: 'none' }}
    >
      <div className="relative h-14 bg-tamam-surface-low">
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
        )}
        {!available && (
          <div className="absolute inset-0 bg-tamam-ink/60 flex items-center justify-center">
            <span className="text-tamam-error text-[8px] font-bold">نفد</span>
          </div>
        )}
      </div>
      <div className="p-1.5">
        <p className="text-tamam-text text-[9px] font-bold leading-tight line-clamp-1">{meal.name_ar || meal.name}</p>
        <p className="text-tamam-green-bright text-[10px] font-bold mt-0.5">₪{Math.round(meal.price || 0)}</p>
      </div>
    </motion.div>
  );
}