import { useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function StickyCartBar() {
  const { totalItems, subtotal, restaurant } = useCart();
  const navigate = useNavigate();
  if (!totalItems) return null;
  const name = restaurant?.name_ar || restaurant?.name;
  return (
    <div
      className="fixed inset-x-0 z-40 px-4 max-w-[480px] mx-auto"
      style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
    >
      <button
        onClick={() => { track('cart_opened', { source: 'restaurant_sticky' }); navigate('/cart'); }}
        className="w-full bg-primary text-on-primary rounded-2xl px-4 h-14 flex items-center justify-between shadow-xl shadow-primary/20 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-2">
          <Icon name="shopping_basket" />
          <div className="text-right leading-tight">
            <div className="text-xs font-bold">{totalItems} {totalItems === 1 ? 'صنف' : 'أصناف'}</div>
            {name && <div className="text-[10px] opacity-80">من {name}</div>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold">₪{Math.round(subtotal)}</span>
          <Icon name="chevron_left" />
        </div>
      </button>
    </div>
  );
}