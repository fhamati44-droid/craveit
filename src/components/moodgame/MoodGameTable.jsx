import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { ZONES, getTransformation, calculateScore } from '@/lib/moodGameEngine';
import { resolvePublicImage } from '@/lib/imageUtils';

// Zone offset as % of the table radius (78px of a 280px table → ~27.86%).
const ZONE_PCT = 27.86;

export default function MoodGameTable({ placedMeals, dragActive, onRemoveMeal }) {
  const transform = getTransformation(placedMeals);

  const glowStyle =
    transform.glow === 'gold'
      ? '0 0 40px rgba(234,196,92,0.30), 0 0 80px rgba(234,196,92,0.12), inset 0 0 60px rgba(0,0,0,0.65)'
      : transform.glow === 'green'
      ? '0 0 34px rgba(137,219,120,0.30), 0 0 70px rgba(137,219,120,0.12), inset 0 0 60px rgba(0,0,0,0.65)'
      : transform.glow === 'soft'
      ? '0 0 18px rgba(137,219,120,0.14), inset 0 0 50px rgba(0,0,0,0.6)'
      : 'inset 0 0 50px rgba(0,0,0,0.6)';

  const ringColor = transform.glow === 'gold' ? 'rgba(234,196,92,0.45)' : 'rgba(137,219,120,0.4)';

  return (
    <div className="flex-1 flex items-center justify-center py-2 overflow-hidden" dir="rtl">
      <div className="relative" style={{ width: 'min(300px, 66vw)', aspectRatio: '1 / 1' }}>
        <motion.div
          animate={{ scale: transform.tableScale }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {/* Table surface — warm wood */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 50% 38%, #3a2a1e 0%, #241a12 55%, #14100b 100%)',
              border: `2px solid ${ringColor}`,
              boxShadow: glowStyle,
            }}
          >
            {/* Wood grain rings */}
            <div
              className="absolute inset-0 rounded-full opacity-25"
              style={{ background: 'repeating-radial-gradient(circle, transparent 0, transparent 9px, rgba(120,86,58,0.45) 9px, rgba(120,86,58,0.45) 10px)' }}
            />
            {/* Warm spotlight sheen (CSS-only, reduced-motion safe) */}
            <div
              className="absolute inset-0 rounded-full opacity-60 mg-spotlight"
              style={{ background: 'radial-gradient(circle at 50% 28%, rgba(255,220,170,0.18) 0%, transparent 45%)' }}
            />
          </div>

          {/* Drop zones + placed meals */}
          {ZONES.map((zone, i) => {
            const xPct = Math.cos((zone.angle - 90) * Math.PI / 180) * ZONE_PCT;
            const yPct = Math.sin((zone.angle - 90) * Math.PI / 180) * ZONE_PCT;
            const zoneMeals = placedMeals.filter((m) => m.zone === zone.key);
            const isFilled = zoneMeals.length > 0;
            const visible = dragActive || transform.showZones > i || isFilled;

            return (
              <div
                key={zone.key}
                data-drop-zone={zone.key}
                className="absolute"
                style={{
                  left: `calc(50% + ${xPct}%)`,
                  top: `calc(50% + ${yPct}%)`,
                  width: '23%',
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <AnimatePresence mode="wait">
                  {isFilled ? (
                    <PlacedMeal
                      key="filled"
                      meal={zoneMeals[0]}
                      stackCount={zoneMeals.length}
                      onRemove={() => onRemoveMeal(zoneMeals[0].id)}
                      glow={transform.glow}
                    />
                  ) : (
                    <DropZone key="empty" zone={zone} visible={visible} dragActive={dragActive} />
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Center combo feedback */}
          <AnimatePresence>
            {placedMeals.length >= 2 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
              >
                <div className="bg-tamam-ink/70 text-tamam-gold text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm whitespace-nowrap border border-tamam-gold/30">
                  كومبو رائع! +{calculateScore(placedMeals)} ★
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function DropZone({ zone, visible, dragActive }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.6 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.25 }}
      className={`w-full h-full rounded-full flex items-center justify-center border-2 ${
        dragActive
          ? 'border-tamam-green-bright bg-tamam-green/10 mg-zone-active'
          : 'border-dashed border-tamam-outline/40 bg-tamam-surface-low/40'
      }`}
      style={dragActive ? { boxShadow: '0 0 18px rgba(137,219,120,0.35)' } : undefined}
    >
      {dragActive ? (
        <Plus size={18} className="text-tamam-green-bright" strokeWidth={3} />
      ) : (
        <span className="text-base opacity-60">{zone.icon}</span>
      )}
    </motion.div>
  );
}

function PlacedMeal({ meal, stackCount = 1, onRemove, glow }) {
  const img = resolvePublicImage(meal.image_url, null);
  const ring = glow === 'gold' ? '#EAC45C' : '#89DB78';
  const mealGlow = glow === 'gold' ? 'rgba(234,196,92,0.45)' : 'rgba(137,219,120,0.4)';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 16, stiffness: 240 }}
      className="relative w-full h-full group"
    >
      <div className="w-full h-full rounded-full" style={{ boxShadow: `0 0 16px ${mealGlow}` }}>
        {img ? (
          <img
            src={img}
            alt={meal.name || 'وجبة'}
            className="w-full h-full rounded-full object-cover border-2"
            style={{ borderColor: ring }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-tamam-surface-high flex items-center justify-center text-xl border-2" style={{ borderColor: ring }}>
            🍽️
          </div>
        )}
      </div>

      {/* Floating success sparkle — one-shot on placement */}
      <motion.div
        initial={{ y: 0, opacity: 0, scale: 0.6 }}
        animate={{ y: -16, opacity: [0, 1, 0], scale: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none text-sm"
        aria-hidden="true"
      >
        ✨
      </motion.div>

      {/* Stack badge */}
      {stackCount > 1 && (
        <div className="absolute -top-1.5 -left-1.5 bg-tamam-green-bright text-tamam-ink text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-tamam-ink">
          ×{stackCount}
        </div>
      )}
      {/* Score badge */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-tamam-ink/85 text-tamam-green-bright text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap border border-tamam-green/30">
        +{meal.points || 25} ★
      </div>
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-tamam-error/90 text-white flex items-center justify-center opacity-0 group-active:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-tamam-error/40"
        aria-label={`إزالة ${meal.name || 'الوجبة'}`}
      >
        <X size={10} />
      </button>
    </motion.div>
  );
}