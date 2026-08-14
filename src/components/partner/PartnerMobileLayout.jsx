import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Tag, ClipboardList, Menu as MenuIcon, Bell, Store } from 'lucide-react';
import { usePartner } from '@/lib/partnerContext';

const NAV = [
  { to: '/partner/home', label: 'الرئيسية', icon: Home },
  { to: '/partner/menu', label: 'المنيو', icon: BookOpen },
  { to: '/partner/offers', label: 'العروض', icon: Tag },
  { to: '/partner/orders', label: 'الطلبات', icon: ClipboardList },
  { to: '/partner/more', label: 'المزيد', icon: MenuIcon },
];

const STATUS_META = {
  open: { label: 'مفتوح', cls: 'bg-tamam-green/20 text-tamam-green-bright' },
  closed: { label: 'مغلق', cls: 'bg-surface-container-high text-on-surface-variant' },
  busy: { label: 'ضغط', cls: 'bg-tamam-gold/20 text-tamam-gold' },
  temporarily_unavailable: { label: 'متوقف مؤقت', cls: 'bg-error/20 text-error' },
};

export default function PartnerMobileLayout({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const partner = usePartner();
  const r = partner?.activeRestaurant;
  const status = STATUS_META[r?.current_status] || STATUS_META.open;

  const isActive = (to) => (to === '/partner/home' ? pathname === '/partner/home' : pathname.startsWith(to));

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-tamam-bg text-tamam-text font-tamam flex flex-col" style={{ maxWidth: '430px', margin: '0 auto' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-tamam-surface-low/95 backdrop-blur border-b border-tamam-outline/30 pt-safe">
        <div className="px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/partner/home')} className="flex items-center gap-2 text-tamam-green-bright font-bold text-sm">
            <Store size={18} /> TAMAM للشركاء
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
            <button onClick={() => navigate('/partner/more')} className="relative w-9 h-9 rounded-lg bg-tamam-surface flex items-center justify-center text-tamam-text-muted active:scale-95">
              <Bell size={18} />
            </button>
          </div>
        </div>
        {r && (
          <div className="px-4 pb-2 -mt-1">
            <p className="text-tamam-text font-bold text-sm truncate">{r.name_ar || r.name}</p>
          </div>
        )}
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 z-30 bg-tamam-surface-low/95 backdrop-blur border-t border-tamam-outline/30" style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-stretch justify-around px-1 pt-1.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <button key={to} onClick={() => navigate(to)} className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[52px] ${active ? 'text-tamam-green-bright' : 'text-tamam-text-muted'}`}>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}