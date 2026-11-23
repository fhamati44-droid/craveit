import { Outlet, Link } from 'react-router-dom';
import { useCart } from '@/lib/CartContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import TamamHeader from './TamamHeader';
import TamamBottomNav from './TamamBottomNav';

/**
 * Shared customer mobile shell — dark TAMAM identity.
 * Usable as a Route layout (renders <Outlet/>) or wrapped around children.
 * Cart count comes from the existing CartContext (single source of truth).
 */
export default function CustomerMobileLayout({ children, location = 'موقعك الحالي' }) {
  const { totalItems } = useCart();
  const { locale } = useLanguage();
  const cartCount = totalItems;
  return (
    <div
      dir="rtl"
      lang={locale}
      className="font-tamam min-h-[100dvh] bg-tamam-bg text-tamam-text flex flex-col max-w-[480px] mx-auto overflow-x-hidden"
    >
      <TamamHeader cartCount={cartCount} location={location} />
      <main className="flex-1 min-h-0">{children ?? <Outlet />}</main>
      <footer className="px-4 py-5 text-center text-[11px] text-tamam-text-muted border-t border-tamam-outline/30 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <Link to="/legal/terms">תקנון</Link>
        <Link to="/legal/privacy">פרטיות</Link>
        <Link to="/legal/delivery">משלוחים</Link>
        <Link to="/legal/cancellations">ביטולים</Link>
        <Link to="/legal/about">אודות</Link>
        <Link to="/legal/contact">צור קשר</Link>
      </footer>
      <div className="pb-16" />
      <TamamBottomNav />
    </div>
  );
}