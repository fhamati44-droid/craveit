import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { resolvePublicMedia, handleImageError } from '@/lib/imageUtils';

// Returns the restaurant-specific image snapshot when a restaurant is selected,
// otherwise the TAMAM marketing image (Part 12 / Part 15).
export default function CartItem({ item }) {
  const { updateQuantity, removeItem, switching } = useCart();
  const extrasTotal = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
  const useRestaurantVersion = !!item.selected_restaurant_id && !!item.restaurant_item_image_snapshot;
  const displayImage = useRestaurantVersion ? item.restaurant_item_image_snapshot : item.image_url;
  const displayName = useRestaurantVersion ? (item.restaurant_item_name_snapshot || item.name) : item.name;
  const displayDesc = useRestaurantVersion
    ? [item.restaurant_item_description_snapshot, item.included_items_snapshot && `يشمل: ${item.included_items_snapshot}`].filter(Boolean).join(' · ')
    : (item.extras && item.extras.length ? item.extras.map((e) => e.name).join(', ') : '');
  const unitPrice = item.selected_restaurant_id ? item.restaurant_unit_price : item.price;
  const itemPrice = (unitPrice + extrasTotal) * item.quantity;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 relative">
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-2 py-1.5">
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(item.cartId, item.quantity - 1)}>
          <Minus size={14} className="text-gray-600" />
        </motion.button>
        <span className="text-gray-900 font-bold text-sm w-4 text-center">{item.quantity}</span>
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(item.cartId, item.quantity + 1)}>
          <Plus size={14} className="text-blue" />
        </motion.button>
      </div>

      <div className="flex-1 mx-3 flex items-start gap-2 text-right">
        {displayImage && (
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
            <img src={resolvePublicMedia(displayImage)} onError={handleImageError} alt="" className="w-full h-full object-cover" />
            {useRestaurantVersion && <span className="absolute bottom-0 inset-x-0 bg-black/45 text-white text-[7px] leading-tight py-0.5 text-center">من المطعم</span>}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-semibold text-sm truncate">{displayName}</p>
          {item.restaurant_name_snapshot && <p className="text-[11px] text-gray-500 truncate">{item.restaurant_name_snapshot}</p>}
          {displayDesc && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{displayDesc}</p>}
        </div>
      </div>

      <span className="text-gray-900 font-bold text-sm">₪{itemPrice.toFixed(0)}</span>

      <AnimatePresence>
        {switching && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-[11px] text-gray-500 font-bold">عم نحدّث نسخة المطعم...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}