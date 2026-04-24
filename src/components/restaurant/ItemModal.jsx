import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import { getExtraGroups } from '@/lib/api';
import TagBadge from '@/components/shared/TagBadge';

export default function ItemModal({ item, restaurant, onClose, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const [extraGroups, setExtraGroups] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setQuantity(1);
    setSelectedExtras({});
    setLoading(true);
    getExtraGroups(item.id).then(groups => {
      setExtraGroups(groups || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [item?.id]);

  const toggleExtra = (groupId, option, isMulti) => {
    setSelectedExtras(prev => {
      const current = prev[groupId] || [];
      if (isMulti) {
        const exists = current.some(e => e.id === option.id);
        return { ...prev, [groupId]: exists ? current.filter(e => e.id !== option.id) : [...current, option] };
      } else {
        return { ...prev, [groupId]: [option] };
      }
    });
  };

  const extrasTotal = Object.values(selectedExtras).flat().reduce((s, e) => s + (e.price || 0), 0);
  const totalPrice = (item?.price + extrasTotal) * quantity;

  const handleAdd = () => {
    const extras = Object.values(selectedExtras).flat();
    onAdd({
      ...item,
      quantity,
      extras,
      price: item.price + extrasTotal,
    });
    onClose();
  };

  const tags = Array.isArray(item?.tags) ? item.tags : [];

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
          >
            {/* Image */}
            {item.image_url && (
              <div className="h-56 relative overflow-hidden">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/10" />
              </div>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 bg-black/30 backdrop-blur rounded-full flex items-center justify-center"
            >
              <X size={18} className="text-white" />
            </button>

            <div className="p-5">
              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex gap-1.5 mb-2">
                  {tags.map(t => <TagBadge key={t} tag={t} />)}
                </div>
              )}

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h2>
              {item.description && (
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{item.description}</p>
              )}
              <p className="text-orange font-bold text-xl mb-5">₪{item.price}</p>

              {/* Extras */}
              {!loading && extraGroups.map(group => (
                <div key={group.id} className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{group.group_name}</h3>
                    {group.required && (
                      <span className="text-[10px] bg-orange/10 text-orange px-2 py-0.5 rounded-full font-semibold">Required</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(group.menu_extra_options || []).map(opt => {
                      const isMulti = group.max_select > 1;
                      const selected = (selectedExtras[group.id] || []).some(e => e.id === opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleExtra(group.id, opt, isMulti)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                            selected
                              ? 'border-orange bg-orange/5'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selected ? 'border-orange bg-orange' : 'border-gray-300'
                            }`}>
                              {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-gray-800 text-sm font-medium">{opt.name}</span>
                          </div>
                          {opt.price > 0 && (
                            <span className="text-gray-600 text-sm">+₪{opt.price}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className="flex items-center gap-4 mb-5">
                <span className="text-gray-700 font-semibold">Quantity</span>
                <div className="flex items-center gap-3 ml-auto">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <Minus size={16} className="text-gray-700" />
                  </motion.button>
                  <span className="text-gray-900 font-bold text-lg w-6 text-center">{quantity}</span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-9 h-9 rounded-full bg-orange flex items-center justify-center"
                  >
                    <Plus size={16} className="text-white" />
                  </motion.button>
                </div>
              </div>

              {/* Add to Cart */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAdd}
                className="w-full bg-orange text-white rounded-2xl py-4 font-bold text-base flex items-center justify-between px-5 shadow-orange-lg"
              >
                <span>Add to order</span>
                <span>₪{totalPrice.toFixed(0)}</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}