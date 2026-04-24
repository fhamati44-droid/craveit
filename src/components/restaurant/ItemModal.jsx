import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Share2 } from 'lucide-react';
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
    getExtraGroups(item.id)
      .then(groups => setExtraGroups(groups || []))
      .catch(() => setExtraGroups([]))
      .finally(() => setLoading(false));
  }, [item?.id]);

  const toggleExtra = (groupId, option, isMulti) => {
    setSelectedExtras(prev => {
      const current = prev[groupId] || [];
      if (isMulti) {
        const exists = current.some(e => e.id === option.id);
        return { ...prev, [groupId]: exists ? current.filter(e => e.id !== option.id) : [...current, option] };
      }
      return { ...prev, [groupId]: [option] };
    });
  };

  const extrasTotal = Object.values(selectedExtras).flat().reduce((s, e) => s + (e.price || 0), 0);
  const totalPrice = (item?.price + extrasTotal) * quantity;
  const tags = Array.isArray(item?.tags) ? item.tags : [];

  const handleAdd = () => {
    const extras = Object.values(selectedExtras).flat();
    onAdd({ ...item, quantity, extras, price: item.price + extrasTotal });
    onClose();
  };

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto max-w-lg mx-auto"
          >
            {/* Full image - like competitor */}
            <div className="relative">
              <div className={`${item.image_url ? 'h-60' : 'h-0'} overflow-hidden`}>
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                )}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 left-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-card"
              >
                <X size={18} className="text-gray-700" />
              </button>

              {/* Share */}
              <button className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-card">
                <Share2 size={16} className="text-gray-700" />
              </button>
            </div>

            {/* Content - RTL */}
            <div className="px-5 pt-5 pb-4 rtl-text">
              {tags.length > 0 && (
                <div className="flex gap-1.5 mb-2 justify-end">
                  {tags.map(t => <TagBadge key={t} tag={t} />)}
                </div>
              )}

              <h2 className="text-2xl font-bold text-gray-900 mb-1">{item.name}</h2>
              {item.description && (
                <p className="text-gray-500 text-sm leading-relaxed mb-3">{item.description}</p>
              )}
              <p className="text-blue font-bold text-xl mb-5">₪{item.price}</p>

              {/* Extra groups */}
              {!loading && extraGroups.map(group => (
                <div key={group.id} className="mb-5">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      {group.required && (
                        <span className="text-xs text-gray-400">חייבים לבחור לפחות אופציה אחת</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">{group.group_name}</h3>
                  </div>
                  <div className="space-y-0 border border-gray-100 rounded-2xl overflow-hidden">
                    {(group.menu_extra_options || []).map(opt => {
                      const isMulti = group.max_select > 1;
                      const selected = (selectedExtras[group.id] || []).some(e => e.id === opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleExtra(group.id, opt, isMulti)}
                          className={`w-full flex items-center justify-between px-4 py-3.5 text-right border-b border-gray-100 last:border-0 transition-colors ${
                            selected ? 'bg-blue/5' : 'bg-white'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selected ? 'border-blue bg-blue' : 'border-gray-300'
                          }`}>
                            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 flex justify-between items-center mx-3">
                            <span className="text-gray-600 text-sm">
                              {opt.price > 0 ? `+₪${opt.price}` : ''}
                            </span>
                            <span className="text-gray-900 text-sm font-medium">{opt.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom - Quantity + Add - like competitor */}
            <div className="px-4 pb-6 pt-2 bg-white border-t border-gray-100 safe-bottom">
              <div className="flex items-center gap-3">
                {/* Add to Cart button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdd}
                  className="flex-1 btn-blue py-4 flex items-center justify-between px-5 rounded-2xl"
                >
                  <span className="text-base">₪{totalPrice.toFixed(0)}</span>
                  <span className="text-base">הוספה להזמנה</span>
                </motion.button>

                {/* Quantity controls */}
                <div className="flex items-center gap-3 border border-gray-200 rounded-2xl px-3 py-3">
                  <motion.button whileTap={{ scale: 0.8 }} onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                    <Minus size={18} className="text-gray-700" />
                  </motion.button>
                  <span className="text-gray-900 font-bold text-lg w-5 text-center">{quantity}</span>
                  <motion.button whileTap={{ scale: 0.8 }} onClick={() => setQuantity(q => q + 1)}>
                    <Plus size={18} className="text-gray-700" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}