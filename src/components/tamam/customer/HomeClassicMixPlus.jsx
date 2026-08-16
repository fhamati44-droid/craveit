import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

/**
 * HomeClassicMixPlus — a food-led DECISION SIMPLIFIER.
 * Shows the three TAMAM meal tiers (Classic / Mix / Plus) as horizontal food
 * cards using the top suggestion's real dish image, with local microcopy.
 * Routes into the EXISTING suggestion flow. Renders only when time-aware
 * suggestions exist (no fake data, no new backend, no invented variants).
 * Does NOT change Classic/Mix/Plus logic or pricing — presentation only.
 */
const VARIANTS = [
  { key: 'classic', label: 'Classic', micro: 'بسيط ومضمون', icon: 'lunch_dining', border: 'border-tamam-outline/30', accent: 'text-tamam-text' },
  { key: 'mix', label: 'Mix', micro: 'تنويع أكثر', icon: 'restaurant', border: 'border-tamam-green/40', accent: 'text-tamam-green-bright' },
  { key: 'plus', label: 'Plus', micro: 'لما بدك تدلعها', icon: 'auto_awesome', border: 'border-tamam-gold/50', accent: 'text-tamam-gold' },
];

export default function HomeClassicMixPlus({ timeData }) {
  const navigate = useNavigate();
  const suggestions = timeData?.top_suggestions;
  if (!suggestions || suggestions.length === 0) return null;
  const dish = suggestions[0];
  const img = dish.image_url;

  const go = (key) => {
    track('home_cmp_select', { variant: key });
    navigate(dish.route || '/tamam-suggestions');
  };

  return (
    <section className="py-4">
      <div className="px-4 mb-3">
        <h2 className="text-headline-sm font-bold text-tamam-text mb-0.5">كيف بدك الوجبة؟</h2>
        <p className="text-body-sm text-tamam-text-muted">اختار حجمها وإحنا منكملها</p>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => go(v.key)}
            className={`flex-shrink-0 w-[210px] bg-tamam-surface-lowest border ${v.border} rounded-2xl overflow-hidden text-right active:scale-95 transition-transform`}
          >
            <div className="relative h-28 bg-tamam-surface-high">
              {img ? (
                <PublicImage source={img} fallback={PLACEHOLDER_IMAGE} alt={dish.title || ''} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-tamam-surface">
                  <span className={`material-symbols-outlined text-[30px] ${v.accent}`}>{v.icon}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-tamam-surface-lowest/90 via-transparent to-transparent" />
              <span className={`absolute bottom-1.5 right-2.5 text-[14px] font-bold ${v.accent}`}>{v.label}</span>
            </div>
            <div className="p-2.5">
              <p className="text-[11px] text-tamam-text-muted leading-tight">{v.micro}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}