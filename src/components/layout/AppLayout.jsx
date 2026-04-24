import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import CartDrawer from '@/components/cart/CartDrawer';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#0C0C0F] font-inter">
      <main className="pb-24">
        <Outlet />
      </main>
      <BottomNav />
      <CartDrawer />
    </div>
  );
}