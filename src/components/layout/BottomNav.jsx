import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, User, UtensilsCrossed } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/profile', icon: User, label: 'פרופיל' },
  { path: '/orders', icon: ShoppingCart, label: 'הזמנות' },
  { path: '/', icon: UtensilsCrossed, label: 'מסעדות', isMain: true },
  { path: '/search', icon: Search, label: 'חיפוש' },
];

export default function BottomNav() {
  const location = useLocation();
  const { totalItems, setIsOpen } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 bottom-nav-pad shadow-top">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-2 pb-2">
        {navItems.map(({ path, icon: Icon, label, isMain }) => {
          const isActive = location.pathname === path || (path === '/' && location.pathname === '/');
          const isOrders = path === '/orders';
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-1 min-w-[60px] py-1 relative"
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                className={`relative flex flex-col items-center gap-1 ${isMain ? 'pt-0' : ''}`}
              >
                {isMain ? (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                    isActive ? 'bg-blue text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                ) : (
                  <Icon
                    size={22}
                    className={isActive ? 'text-blue' : 'text-gray-400'}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                )}
                {isOrders && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </motion.div>
              <span className={`text-[10px] font-medium ${
                isActive ? (isMain ? 'text-blue' : 'text-blue') : 'text-gray-400'
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}