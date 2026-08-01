import { Link } from 'react-router-dom';
import { Search, ShoppingBag, User, MapPin, ChevronDown } from 'lucide-react';

/**
 * Customer header — TAMAM logo, location, search, cart, profile.
 * Links use existing routes; cartCount wired in Phase 2.
 */
export default function TamamHeader({ cartCount = 0, location }) {
  const resolvedLocation = (typeof window !== 'undefined' && localStorage.getItem('tamam_location')) || location || 'موقعك الحالي';
  return (
    <header
      className="sticky top-0 z-30 bg-tamam-ink/95 backdrop-blur border-b border-tamam-outline/40 pt-safe"
      style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
    >
      <div className="px-4 py-2.5 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-tamam-green-bright font-extrabold text-lg tracking-tight">TAMAM</span>
          <span className="text-tamam-green text-sm">▲</span>
        </Link>

        <button className="flex items-center gap-1 text-tamam-text-muted text-xs max-w-[42%] truncate">
          <MapPin size={13} className="text-tamam-green flex-shrink-0" />
          <span className="truncate">{resolvedLocation}</span>
          <ChevronDown size={13} className="flex-shrink-0" />
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link to="/search" aria-label="بحث" className="w-10 h-10 rounded-full bg-tamam-surface flex items-center justify-center text-tamam-text-muted">
            <Search size={18} />
          </Link>
          <Link to="/cart" aria-label="السلة" className="relative w-10 h-10 rounded-full bg-tamam-surface flex items-center justify-center text-tamam-text-muted">
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-tamam-green text-tamam-ink text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link to="/profile" aria-label="حسابي" className="w-10 h-10 rounded-full bg-tamam-surface flex items-center justify-center text-tamam-text-muted">
            <User size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}