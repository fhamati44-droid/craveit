import { Outlet } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import TamamHeader from './TamamHeader';
import TamamBottomNav from './TamamBottomNav';

/**
 * Shared customer mobile shell — dark TAMAM identity.
 * Usable as a Route layout (renders <Outlet/>) or wrapped around children.
 * Cart count comes from the existing CartContext (single source of truth).
 */
export default function CustomerMobileLayout({ children, location = 'موقعك الحالي' }) {
  const { totalItems } = useCart();
  const cartCount = totalItems;
  return (
    <div
      dir="rtl"
      lang="ar"
      className="font-tamam min-h-[100dvh] bg-tamam-bg text-tamam-text flex flex-col max-w-[480px] mx-auto overflow-x-hidden"
    >
      <TamamHeader cartCount={cartCount} location={location} />
      <main className="flex-1 min-h-0">{children ?? <Outlet />}</main>
      <div className="pb-16" />
      <TamamBottomNav />
    </div>
  );
}