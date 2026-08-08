import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { ZONES, getTransformation, calculateScore } from '@/lib/moodGameEngine';
import { resolvePublicImage } from '@/lib/imageUtils';

export default function MoodGameTable({ placedMeals, dragActive, onRemoveMeal }) {
  const transform = getTransformation(placedMeals);

  const glowStyle =
    transform.glow === 'gold'
      ? '0 0 30px rgba(234,196,92,0.25), inset 0 0 50px rgba(0,0,0,0.6)'
      : transform.glow === 'green'
      ? '0 0 25px rgba(137,219,120,0.25), inset 0 0 50px rgba(0,0,0,0.6)'
      : transform.glow === 'soft'
      ? '0 0 15px rgba(137,219,120,0.12), inset 0 0 40px rgba(0,0,0,0.6)'
      : 'inset 0 0 40px rgba(0,0,0,0.6)';

  return (
    <div className="flex-1 flex items-center justify-center py-2 overflow-hidden" dir="rtl">
      <motion.div
        animate={{ scale: transform.tableScale }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
        style={{ width: 280, height: 280 }}
      >
        {/* Table surface */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 40%, #2C2218 0%, #1A1410 65%, #0D0A08 100%)',
            border: `2px solid ${transform.glow === 'gold' ? 'rgba(234,196,92,0.3)' : '#40493C'}`,
            boxShadow: glowStyle,
          }}
        >
          <div
            className="absolute inset-0 rounded-full opacity-15"
            style={{ background: 'repeating-radial-gradient(circle, transparent 0, transparent 10px, rgba(74,55,40,0.4) 10px, rgba(74,55,40,0.4) 11px)' }}
          />
        </div>

        {/* Drop zones + placed meals */}
        {ZONES.map((zone, i) => {
          const rad = 78;
          const x = Math.cos((zone.angle - 90) * Math.PI / 180) * rad;
          const y = Math.sin((zone.angle - 90) * Math.PI / 180) * rad;
          const zoneMeals = placedMeals.filter((m) => m.zone === zone.key);
          const isFilled = zoneMeals.length > 0;
          const visible = dragActive || transform.showZones > i || isFilled;

          return (
            <div
              key={zone.key}
              data-drop-zone={zone.key}
              className="absolute"
              style={{
                left: `calc(50% + ${x}px - 32px)`,
                top: `calc(50% + ${y}px - 32px)`,
                width: 64,
                height: 64,
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
              <div className="bg-tamam-gold/15 text-tamam-gold text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm whitespace-nowrap">
                كومبو رائع! +{calculateScore(placedMeals)} 🪙
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
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
      className={`w-full h-full rounded-full flex items-center justify-center border-2 border-dashed ${
        dragActive ? 'border-tamam-green-bright bg-tamam-green/5' : 'border-tamam-outline/30 bg-tamam-surface-low/30'
      }`}
    >
      {dragActive ? (
        <Plus size={20} className="text-tamam-green-bright" />
      ) : (
        <span className="text-base opacity-50">{zone.icon}</span>
      )}
    </motion.div>
  );
}

function PlacedMeal({ meal, stackCount = 1, onRemove, glow }) {
  const img = resolvePublicImage(meal.image_url, null);
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 260 }}
      className="relative w-full h-full group"
    >
      {img ? (
        <img
          src={img}
          alt=""
          className="w-full h-full rounded-full object-cover border-2"
          style={{ borderColor: glow === 'gold' ? '#EAC45C' : '#89DB78' }}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-tamam-surface-high flex items-center justify-center text-xl border-2 border-tamam-green-bright">
          🍽️
        </div>
      )}
      {/* Stack badge — shows count when multiple meals share a zone */}
      {stackCount > 1 && (
        <div className="absolute -top-1.5 -left-1.5 bg-tamam-green-bright text-tamam-ink text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-tamam-ink">
          ×{stackCount}
        </div>
      )}
      {/* Score badge */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-tamam-ink/80 text-tamam-green-bright text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
        +{meal.points || 25}
      </div>
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-tamam-error/80 text-white flex items-center justify-center opacity-0 group-active:opacity-100"
        aria-label="إزالة"
      >
        <X size={10} />
      </button>
    </motion.div>
  );
}