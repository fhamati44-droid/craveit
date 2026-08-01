import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

/**
 * Confirmation bottom sheet shown after a TAMAM suggestion is added to the unified cart.
 * Primary action continues to /cart (then /checkout). Secondary returns to browsing.
 */
export default function AddToCartSuccessSheet({ open, onClose, onContinue, onKeepBrowsing, title, quantity, subtotal, cartCount }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }}
        className="relative w-full max-w-[480px] bg-surface-container-high rounded-t-[32px] p-6 pb-8"
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-5" />
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-3">
            <ShoppingCart size={26} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-1">تمت الإضافة للسلة</h3>
          {title && <p className="text-sm text-on-surface-variant">{title}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface-container rounded-xl p-3 text-center">
            <p className="text-[11px] text-on-surface-variant">الكمية</p>
            <p className="font-bold">{quantity}</p>
          </div>
          <div className="bg-surface-container rounded-xl p-3 text-center">
            <p className="text-[11px] text-on-surface-variant">الإجمالي</p>
            <p className="font-bold text-primary">₪{Math.round(subtotal || 0)}</p>
          </div>
        </div>
        <div className="bg-primary/10 rounded-xl p-3 text-center mb-6">
          <p className="text-[11px] text-on-surface-variant">عدد عناصر السلة الآن</p>
          <p className="font-bold text-primary">{cartCount}</p>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={onContinue} className="w-full h-14 bg-primary text-on-primary rounded-2xl font-bold active:scale-95 transition-transform">
            متابعة لإتمام الطلب
          </button>
          <button onClick={onKeepBrowsing} className="w-full h-12 bg-surface-container border border-outline-variant/30 rounded-2xl font-bold active:scale-95 transition-transform">
            كمّل تصفح
          </button>
        </div>
      </motion.div>
    </div>
  );
}