import { motion } from 'framer-motion';
import { resolvePublicImage } from '@/lib/imageUtils';

export default function MoodGameMealTray({ meals, restaurant, loading, dragMealId, onMealPointerDown }) {
  return (
    <div
      dir="rtl"
      className="relative bg-tamam-surface-lowest/85 backdrop-blur-md rounded-t-3xl border-t border-tamam-green/15 pb-safe"
      style={{ boxShadow: '0 -8px 30px rgba(0,0,0,0.4)' }}
    >
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-tamam-green-bright text-[14px]">restaurant</span>
        <p className="text-tamam-text-muted text-[11px] font-bold">
          {restaurant ? (restaurant.name_ar || restaurant.name) : 'اختار مطعم أول'}
        </p>
      </div>
      {loading ? (
        <div className="flex gap-2.5 px-3 pb-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-28 h-24 skeleton-t rounded-2xl" />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <div className="text-center text-tamam-text-muted text-[12px] py-6 font-semibold">
          ما في وجبات متوفرة لهالمطعم
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-3 pb-3">
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
      <div className="text-center pb-1.5 flex items-center justify-center gap-1">
        <span className="material-symbols-outlined text-tamam-text-muted text-[12px]">drag_indicator</span>
        <span className="text-tamam-text-muted text-[9px] font-semibold">اسحب للطاولة أو اضغط للتفاصيل</span>
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
      animate={{ opacity: isDragging ? 0.35 : 1, scale: isDragging ? 0.92 : 1 }}
      className={`flex-shrink-0 w-28 rounded-2xl overflow-hidden border-2 cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? 'border-tamam-green-bright'
          : available
          ? 'border-tamam-outline/25 bg-tamam-surface'
          : 'border-tamam-outline/10 opacity-50'
      }`}
      style={{
        touchAction: 'none',
        boxShadow: isDragging ? '0 0 22px rgba(137,219,120,0.45)' : '0 2px 10px rgba(0,0,0,0.3)',
      }}
      aria-label={`${meal.name_ar || meal.name || 'وجبة'} — ${available ? 'متاح' : 'نفد'}`}
    >
      <div className="relative h-16 bg-tamam-surface-low">
        {img ? (
          <img
            src={img}
            alt={meal.name_ar || meal.name || 'وجبة'}
            className="w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
        )}
        {!available && (
          <div className="absolute inset-0 bg-tamam-ink/70 flex items-center justify-center">
            <span className="text-tamam-error text-[9px] font-bold bg-tamam-ink/60 px-2 py-0.5 rounded-full">نفد</span>
          </div>
        )}
      </div>
      <div className="p-1.5 bg-tamam-surface">
        <p className="text-tamam-text text-[10px] font-bold leading-tight line-clamp-1">{meal.name_ar || meal.name}</p>
        <p className="text-tamam-gold text-[11px] font-bold mt-0.5 flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[11px]">star</span>
          ₪{Math.round(meal.price || 0)}
        </p>
      </div>
    </motion.div>
  );
}