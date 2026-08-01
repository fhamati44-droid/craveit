import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/** Compact card for TAMAM suggestions and group-deal bundles inside the Mix/Plus carousel. */
export default function HomepageCarouselSuggestionCard({ card }) {
  const navigate = useNavigate();
  if (!card) return null;

  const img = resolvePublicMedia(card.image_url, null);
  const open = () => {
    track('homepage_suggestion_opened', { id: card.id, type: card.type, route: card.route });
    if (card.route) navigate(card.route);
  };

  return (
    <div className="flex-none w-44 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden flex flex-col">
      <button onClick={open} className="relative h-28 bg-surface-container-high text-right">
        {img ? <PublicImage src={img} alt={card.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍱</div>}
        {card.badge && <span className="absolute top-1.5 right-1.5 bg-primary text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">{card.badge}</span>}
      </button>
      <div className="p-2.5 flex-1 flex flex-col">
        <button onClick={open} className="text-right">
          <h3 className="font-bold text-sm leading-tight text-on-surface line-clamp-2">{card.title}</h3>
          {card.package_label && <p className="text-[10px] text-tertiary font-bold mt-0.5">{card.package_label}</p>}
        </button>
        {card.included_count > 0 && (
          <p className="text-[10px] text-on-surface-variant flex items-center gap-0.5 mt-1"><Icon name="restaurant_menu" className="text-[12px]" /> {card.included_count} أصناف</p>
        )}
        <div className="flex items-center justify-between mt-1">
          {card.display_price != null && <span className="text-primary font-bold text-sm">₪{Math.round(card.display_price)}</span>}
          <button onClick={open} className="h-7 px-2.5 bg-surface-high text-on-surface rounded-lg text-[10px] font-bold flex items-center gap-0.5">
            <Icon name="arrow_back" className="text-[12px]" /> {card.type === 'deal' ? 'شوف العرض' : 'شوف الاقتراح'}
          </button>
        </div>
      </div>
    </div>
  );
}