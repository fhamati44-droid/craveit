import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';

/** Compact Mix/Plus suggestion card with real thumbnail, left-border accent per the uploaded HTML. */
export default function HomepageCarouselSuggestionCard({ card }) {
  const navigate = useNavigate();
  if (!card) return null;
  const img = resolvePublicMedia(card.image_url, null);
  const open = () => { track('homepage_suggestion_opened', { id: card.id, type: card.type }); if (card.route) navigate(card.route); };
  const accent = card.package_level === 'plus' ? 'border-primary' : card.package_level === 'mix' ? 'border-tertiary' : 'border-outline-variant';
  const labelColor = card.package_level === 'plus' ? 'text-primary' : card.package_level === 'mix' ? 'text-tertiary' : 'text-on-surface-variant';

  return (
    <div className={`flex-none w-[200px] snap-start bg-background p-3 rounded-2xl border-l-4 ${accent} flex gap-2`}>
      {img && (
        <button onClick={open} className="flex-none w-14 h-14 rounded-lg overflow-hidden bg-surface-container-high">
          <PublicImage src={img} alt={card.title} className="w-full h-full object-cover" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] font-bold mb-1 ${labelColor}`}>{card.badge || (card.package_level === 'plus' ? 'اقتراح بلس' : card.package_level === 'mix' ? 'اقتراح ميكس' : 'اقتراح')}</div>
        <h4 className="text-xs font-bold mb-2 line-clamp-2 leading-tight">{card.title}</h4>
        {card.included_count > 0 && <p className="text-[9px] text-on-surface-variant mb-1">{card.included_count} أصناف</p>}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold">₪{card.display_price ? Math.round(card.display_price) : '—'}</span>
          </div>
          <button onClick={open} className="bg-primary text-on-primary px-2.5 py-1 rounded-lg text-[9px] font-bold">شوف الاقتراح</button>
        </div>
      </div>
    </div>
  );
}