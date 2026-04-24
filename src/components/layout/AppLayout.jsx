import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import CartDrawer from '@/components/cart/CartDrawer';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] font-inter max-w-lg mx-auto relative">
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
      <CartDrawer />
    </div>
  );
}