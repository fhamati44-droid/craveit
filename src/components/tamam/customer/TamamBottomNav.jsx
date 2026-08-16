import { Link, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, Sparkles, ReceiptText, User } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/restaurants', label: 'استكشف', icon: UtensilsCrossed },
  { to: '/tamam-game', label: 'TAMAM', icon: Sparkles, highlight: true },
  { to: '/orders', label: 'طلباتي', icon: ReceiptText },
  { to: '/profile', label: 'حسابي', icon: User },
];

export default function TamamBottomNav() {
  const { pathname } = useLocation();
  const isActive = (to) => {
    if (to === '/tamam-game') return pathname.startsWith('/tamam-game') || pathname.startsWith('/tamam-suggestions');
    return to === '/' ? pathname === '/' : pathname.startsWith(to);
  };

  return (
    <nav
      className="sticky bottom-0 z-30 bg-tamam-ink/95 backdrop-blur border-t border-tamam-outline/40 pb-safe"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-stretch justify-around px-1.5 pt-2">
        {ITEMS.map(({ to, label, icon: Icon, highlight }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center gap-1 px-2 min-w-[56px] min-h-[50px] ${
                active ? 'text-tamam-green-bright' : 'text-tamam-text-muted'
              }`}
            >
              {active && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-tamam-green-bright" />
              )}
              {highlight ? (
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    active ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface text-tamam-green'
                  }`}
                >
                  <Icon size={17} />
                </span>
              ) : (
                <Icon size={21} className={active ? 'fill-current' : ''} />
              )}
              <span className="text-[10px] font-bold leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}