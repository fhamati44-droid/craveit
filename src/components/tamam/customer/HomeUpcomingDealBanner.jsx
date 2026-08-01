import { resolvePublicImage, handleImageError } from '@/lib/imageUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function HomeUpcomingDealBanner({ deal, onOpen }) {
  const start = deal.start_at ? new Date(deal.start_at) : null;
  const dateStr = start ? start.toLocaleDateString('ar', { day: 'numeric', month: 'long' }) : '';
  const timeStr = start ? start.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <button onClick={onOpen} className="block w-full text-right bg-surface-container border border-tertiary/30 rounded-2xl p-4 active:scale-[0.99] transition-transform">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0 flex items-center justify-center">
          {deal.hero_image ? <img src={resolvePublicImage(deal.hero_image)} alt={deal.title} className="w-full h-full object-cover" onError={handleImageError} /> : <Icon name="schedule" className="text-tertiary text-2xl" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="inline-block bg-tertiary/15 text-tertiary text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">عرض قريب</span>
          <h3 className="font-bold text-sm truncate">{deal.title}</h3>
          <p className="text-[11px] text-on-surface-variant truncate">{deal.restaurant_name_snapshot || ''}{dateStr ? ` · ببلّش ${dateStr} الساعة ${timeStr}` : ''}</p>
        </div>
        <span className="text-primary text-xs font-bold flex-shrink-0">شوف التفاصيل</span>
      </div>
    </button>
  );
}