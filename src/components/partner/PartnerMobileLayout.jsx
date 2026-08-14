import { useNavigate, useLocation } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';

const NAV = [
  { to: '/partner/home', label: 'الرئيسية', icon: 'dashboard' },
  { to: '/partner/menu', label: 'المنيو', icon: 'restaurant_menu' },
  { to: '/partner/offers', label: 'العروض', icon: 'local_offer' },
  { to: '/partner/orders', label: 'الطلبات', icon: 'receipt_long' },
  { to: '/partner/more', label: 'المزيد', icon: 'more_horiz' },
];

const STATUS_META = {
  open: { label: 'مفتوح', dot: 'bg-tamam-green-bright' },
  closed: { label: 'مغلق', dot: 'bg-tamam-text-muted' },
  busy: { label: 'ضغط', dot: 'bg-tamam-gold' },
  temporarily_unavailable: { label: 'متوقف مؤقت', dot: 'bg-tamam-error' },
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
      <header className="sticky top-0 z-30 bg-tamam-surface-low/95 backdrop-blur-xl border-b border-tamam-outline/30 pt-safe">
        <div className="px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-tamam-surface flex items-center justify-center shrink-0 overflow-hidden">
              <span className="material-symbols-outlined text-tamam-green-bright text-[20px]">restaurant</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-tamam-green-bright font-bold text-sm leading-tight">TAMAM للشركاء</span>
              <span className="text-tamam-text-muted text-[11px] truncate">{r ? (r.name_ar || r.name) : '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-tamam-surface rounded-full px-2 py-1">
              <span className={`w-2 h-2 rounded-full ml-1.5 ${status.dot} animate-pulse`} />
              <span className="text-tamam-text text-[11px] font-medium">{status.label}</span>
            </div>
            <button onClick={() => navigate('/partner/more')} className="relative w-9 h-9 flex items-center justify-center">
              <span className="material-symbols-outlined text-tamam-text text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tamam-error rounded-full" />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1">{children}</main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 z-30 bg-tamam-surface-low/95 backdrop-blur-xl border-t border-tamam-outline/30" style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-between items-center h-16 px-1">
          {NAV.map(({ to, label, icon }) => {
            const active = isActive(to);
            return (
              <button key={to} onClick={() => navigate(to)} className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
                <span className={`material-symbols-outlined text-[22px] ${active ? 'text-tamam-green-bright' : 'text-tamam-text-muted'}`} style={active ? { fontVariationSettings: "'FILL' 1, 'wght' 600" } : undefined}>{icon}</span>
                <span className={`text-[10px] ${active ? 'text-tamam-green-bright font-bold' : 'text-tamam-text-muted'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}