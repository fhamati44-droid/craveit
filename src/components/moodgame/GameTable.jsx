import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, X, RotateCcw } from 'lucide-react';
import { PACKAGE_LABEL } from '@/lib/packageUtils';

const ZONES = [
  { key: 'main', label: 'الوجبة الأساسية', icon: '🍽️' },
  { key: 'additions', label: 'الإضافات', icon: '🥗' },
  { key: 'desserts', label: 'الحلو والمشروبات', icon: '🍰' },
];

export default function GameTable({ meals = [], onRemove, onUpdateQty, onMoveZone, qualitySettings, onReset }) {
  const { use3D, tablePerspective } = qualitySettings;
  const total = meals.reduce((sum, m) => sum + (m.price || 0) * (m.quantity || 1), 0);

  // Determine package suggestion
  const mainCount = meals.filter((m) => m.zone === 'main').length;
  const addCount = meals.filter((m) => m.zone === 'additions').length;
  const dessertCount = meals.filter((m) => m.zone === 'desserts').length;
  const totalMeals = meals.length;
  let suggestedPkg = 'classic';
  if (totalMeals >= 4 || (mainCount >= 1 && (addCount + dessertCount) >= 2)) suggestedPkg = 'plus';
  else if (mainCount >= 1 && (addCount >= 1 || dessertCount >= 1)) suggestedPkg = 'mix';

  return (
    <div dir="rtl" className="space-y-3">
      {/* Table */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={use3D ? { perspective: '900px' } : {}}
      >
        <div
          className="bg-gradient-to-br from-tamam-surface-high to-tamam-surface-low border border-tamam-outline/30 rounded-2xl p-3 min-h-[200px]"
          style={use3D ? { transform: tablePerspective, transformStyle: 'preserve-3d' } : {}}
        >
          <div className="grid grid-cols-3 gap-2">
            {ZONES.map((zone) => {
              const zoneMeals = meals.filter((m) => m.zone === zone.key);
              return (
                <div
                  key={zone.key}
                  className="bg-tamam-surface-lowest/50 rounded-xl p-2 min-h-[140px] border border-tamam-outline/10"
                >
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-xs">{zone.icon}</span>
                    <span className="text-tamam-text-muted text-[9px] font-semibold">{zone.label}</span>
                  </div>
                  <div className="space-y-1.5">
                    <AnimatePresence>
                      {zoneMeals.map((meal) => (
                        <motion.div
                          key={meal.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          className="bg-tamam-surface rounded-lg p-1.5 relative group"
                        >
                          {meal.image_url && (
                            <img src={meal.image_url} alt="" className="w-full h-12 rounded object-cover mb-1" loading="lazy" />
                          )}
                          <p className="text-tamam-text text-[9px] font-bold leading-tight line-clamp-1">{meal.name}</p>
                          <p className="text-tamam-green-bright text-[9px] font-bold">₪{Math.round(meal.price)}</p>
                          {/* Qty controls */}
                          <div className="flex items-center justify-between mt-1">
                            <button
                              onClick={() => onUpdateQty(meal.id, (meal.quantity || 1) - 1)}
                              className="w-4 h-4 rounded bg-tamam-surface-high text-tamam-text text-[8px] flex items-center justify-center"
                            >
                              <Minus size={8} />
                            </button>
                            <span className="text-tamam-text-muted text-[9px]">{meal.quantity || 1}</span>
                            <button
                              onClick={() => onUpdateQty(meal.id, (meal.quantity || 1) + 1)}
                              className="w-4 h-4 rounded bg-tamam-surface-high text-tamam-text text-[8px] flex items-center justify-center"
                            >
                              <Plus size={8} />
                            </button>
                            <button
                              onClick={() => onMoveZone(meal.id)}
                              className="text-tamam-text-muted text-[8px] px-1"
                              aria-label="نقل لمنطقة أخرى"
                            >
                              ↔
                            </button>
                            <button
                              onClick={() => onRemove(meal.id)}
                              className="text-tamam-error"
                              aria-label="إزالة من الطاولة"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {zoneMeals.length === 0 && (
                      <div className="text-center text-tamam-text-muted text-[9px] py-4 opacity-50">
                        {zone.icon}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between bg-tamam-surface rounded-xl px-3 py-2">
        <div>
          <span className="text-tamam-text-muted text-[10px]">الإجمالي</span>
          <p className="text-tamam-text font-bold text-sm">₪{Math.round(total)}</p>
        </div>
        <div className="text-center">
          <span className="text-tamam-text-muted text-[10px]">اقتراح الباقة</span>
          <p className="text-tamam-green-bright font-bold text-sm">{PACKAGE_LABEL?.[suggestedPkg] || suggestedPkg}</p>
        </div>
        {meals.length > 0 && (
          <button onClick={onReset} className="text-tamam-text-muted text-[10px] flex items-center gap-1">
            <RotateCcw size={12} /> تفريغ
          </button>
        )}
      </div>
    </div>
  );
}