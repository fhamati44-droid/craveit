import { Link, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, Sparkles, ReceiptText, User } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/restaurants', label: 'المطاعم', icon: UtensilsCrossed },
  { to: '/tamam-game', label: 'اقتراح TAMAM', icon: Sparkles, highlight: true },
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
      <div className="flex items-stretch justify-around px-1 pt-1.5">
        {ITEMS.map(({ to, label, icon: Icon, highlight }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] ${
                active ? 'text-tamam-green-bright' : 'text-tamam-text-muted'
              }`}
            >
              {highlight ? (
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center -mt-1 ${
                    active ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface text-tamam-green'
                  }`}
                >
                  <Icon size={18} />
                </span>
              ) : (
                <Icon size={20} />
              )}
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}