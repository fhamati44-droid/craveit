import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User, Search } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/orders', icon: ShoppingBag, label: 'Orders' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const { totalItems, setIsOpen } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-dark border-t border-white/5 bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-3 pb-3">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const isOrders = path === '/orders';
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-1 min-w-[60px] py-1"
            >
              <div className="relative">
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={`p-2 rounded-xl transition-colors ${
                    isActive ? 'bg-orange/20' : ''
                  }`}
                >
                  <Icon
                    size={22}
                    className={isActive ? 'text-orange' : 'text-white/40'}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </motion.div>
                {isOrders && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-orange' : 'text-white/35'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}