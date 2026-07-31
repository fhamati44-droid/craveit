import { Sparkles } from 'lucide-react';

const TIER = {
  classic: { label: 'كلاسيك', color: 'text-tamam-green-bright' },
  mix: { label: 'ميكس', color: 'text-tamam-gold' },
  plus: { label: 'بلس', color: 'text-tamam-error' },
};

/** Suggestion card fed by suggestionToCard() adapter. */
export default function SuggestionCardTamam({ suggestion, onOpen }) {
  const t = TIER[suggestion?.tier] || TIER.classic;
  const price = suggestion?.price ?? null;
  return (
    <div className="rounded-2xl bg-tamam-surface overflow-hidden border border-tamam-outline/30 flex flex-col">
      <div className="relative h-40 bg-tamam-surface-low">
        {suggestion?.imageUrl ? (
          <img src={suggestion.imageUrl} alt={suggestion?.name || ''} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
        )}
        <span className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full bg-tamam-ink/80 ${t.color}`}>
          {t.label}
        </span>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-tamam-text text-sm leading-tight">{suggestion?.name || 'اقتراح TAMAM'}</h3>
        {suggestion?.summary && <p className="text-tamam-text-muted text-xs mt-1 line-clamp-2">{suggestion.summary}</p>}
        <div className="flex items-center justify-between mt-2">
          <div className="text-[11px] text-tamam-text-muted">
            {suggestion?.peopleCount ? `لـ ${suggestion.peopleCount} أشخاص` : ''}
          </div>
          {price != null && <span className="font-extrabold text-tamam-green-bright">₪{Math.round(price)}</span>}
        </div>
        <button
          onClick={onOpen}
          className="mt-3 w-full bg-tamam-green text-tamam-ink font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1"
        >
          <Sparkles size={14} /> التفاصيل
        </button>
      </div>
    </div>
  );
}