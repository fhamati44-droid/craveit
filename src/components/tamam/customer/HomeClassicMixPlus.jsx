import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';

/**
 * HomeClassicMixPlus — a lightweight DECISION SIMPLIFIER teaser.
 * Shows the three TAMAM meal tiers (Classic / Mix / Plus) as compact cards
 * with local microcopy, routing into the EXISTING suggestion flow.
 * Renders only when time-aware suggestions exist (no fake data, no new backend).
 * Does NOT change Classic/Mix/Plus logic or pricing — presentation only.
 */
const VARIANTS = [
  { key: 'classic', label: 'Classic', micro: 'بسيط ومضمون', icon: 'lunch_dining', tint: 'text-tamam-text' },
  { key: 'mix', label: 'Mix', micro: 'تنويع أكثر', icon: 'restaurant', tint: 'text-tamam-green-bright' },
  { key: 'plus', label: 'Plus', micro: 'لما بدك تدلعها', icon: 'auto_awesome', tint: 'text-tamam-gold' },
];

export default function HomeClassicMixPlus({ timeData }) {
  const navigate = useNavigate();
  const suggestions = timeData?.top_suggestions;
  if (!suggestions || suggestions.length === 0) return null;

  const go = (key) => {
    track('home_cmp_select', { variant: key });
    navigate('/tamam-suggestions');
  };

  return (
    <section className="px-4 py-4">
      <h2 className="text-headline-sm font-bold text-tamam-text mb-0.5">كيف بدك الوجبة؟</h2>
      <p className="text-body-sm text-tamam-text-muted mb-3">اختار حجمها وإحنا منكملها</p>
      <div className="grid grid-cols-3 gap-2">
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => go(v.key)}
            className="bg-tamam-surface-low border border-tamam-outline/25 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 text-center active:scale-95 transition-transform min-h-[112px]"
          >
            <span className={`material-symbols-outlined text-[24px] ${v.tint}`}>{v.icon}</span>
            <span className="text-[14px] font-bold text-tamam-text">{v.label}</span>
            <span className="text-[10px] text-tamam-text-muted leading-tight">{v.micro}</span>
          </button>
        ))}
      </div>
    </section>
  );
}