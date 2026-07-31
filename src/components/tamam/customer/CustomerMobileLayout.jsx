import { Outlet } from 'react-router-dom';
import TamamHeader from './TamamHeader';
import TamamBottomNav from './TamamBottomNav';

/**
 * Shared customer mobile shell — dark TAMAM identity.
 * Usable as a Route layout (renders <Outlet/>) or wrapped around children.
 * No data logic lives here; cartCount/location come from parent in Phase 2.
 */
export default function CustomerMobileLayout({ children, cartCount = 0, location = 'موقعك الحالي' }) {
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