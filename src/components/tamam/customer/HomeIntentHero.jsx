import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

/**
 * HomeIntentHero — FOOD-FIRST first block on the customer Home.
 * A real food image reaches the eye in the first second, with the human
 * headline overlaid. Then a dominant "فاجئني" action, a secondary row
 * (اقتراحات TAMAM + فتّش), and a row of compact intent chips.
 * Hierarchy: فاجئني (primary) → اقتراحات TAMAM (secondary) → فتّش (utility).
 * No new backend — uses the existing top time-aware suggestion image only.
 */
function eyebrow() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'صباح الخير';
  if (h >= 11 && h < 16) return 'وقت الغدا';
  if (h >= 16 && h < 22) return 'سهرة حلوة';
  return 'جوعان بالليل؟';
}

const CHIPS = [
  { key: 'home', label: 'للبيت', icon: 'home' },
  { key: 'friends', label: 'مع الصحاب', icon: 'groups' },
  { key: 'full', label: 'مشبعة', icon: 'lunch_dining' },
  { key: 'light', label: 'خفيفة', icon: 'eco' },
  { key: 'morning', label: 'أول النهار', icon: 'wb_sunny' },
  { key: 'late', label: 'آخر الليل', icon: 'nightlight' },
];

export default function HomeIntentHero({ topSuggestion }) {
  const navigate = useNavigate();
  const hello = useMemo(eyebrow, []);
  const heroImg = topSuggestion?.image_url;

  const go = (to, key) => {
    track('home_intent_entry', { entry: key });
    navigate(to);
  };
  const goChip = (key) => {
    track('home_intent_chip', { chip: key });
    navigate('/tamam-suggestions');
  };
  const openDish = () => {
    track('home_hero_dish_opened', { content_id: topSuggestion?.id || '' });
    navigate(topSuggestion?.route || '/tamam-suggestions');
  };

  return (
    <section className="px-4 pt-3 pb-1" dir="rtl">
      {/* Food-first hero card — real food image reaches the eye first */}
      <div className="relative rounded-2xl overflow-hidden h-52 mb-3 bg-tamam-surface-high">
        {heroImg ? (
          <PublicImage
            source={heroImg}
            fallback={PLACEHOLDER_IMAGE}
            alt={topSuggestion?.title || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-tamam-green/25 via-tamam-surface to-tamam-surface-lowest flex items-center justify-center">
            <span className="text-5xl opacity-80">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-tamam-surface-lowest via-tamam-surface-lowest/40 to-transparent" />
        <div className="absolute inset-0 p-4 flex flex-col justify-end">
          <span className="text-tamam-green-bright text-[11px] font-bold mb-1">{hello}</span>
          <h1 className="font-bold text-[22px] leading-tight text-tamam-text">شو عبالك تاكل اليوم؟</h1>
          <p className="text-tamam-text-muted text-[12px] mt-0.5 leading-snug">إذا محتار، TAMAM بتسهّلها عليك.</p>
        </div>
        {topSuggestion && (
          <button
            type="button"
            onClick={openDish}
            className="absolute top-3 left-3 inline-flex items-center gap-1 bg-tamam-green text-tamam-ink text-[11px] font-bold px-2.5 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            شوف الوجبة
            <span className="material-symbols-outlined text-[14px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>
          </button>
        )}
      </div>

      {/* Primary: فاجئني — dominant green action */}
      <button
        type="button"
        onClick={() => go('/tamam-game', 'surprise')}
        className="w-full rounded-2xl bg-tamam-green text-tamam-ink p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform mb-2"
        style={{ boxShadow: '0 6px 20px rgba(110,191,95,0.25)' }}
      >
        <span className="w-11 h-11 rounded-xl bg-tamam-ink/12 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[26px]">auto_awesome</span>
        </span>
        <span className="flex flex-col items-start text-right leading-tight flex-1 min-w-0">
          <span className="text-[16px] font-bold">فاجئني</span>
          <span className="text-[11px] text-tamam-ink/70">خلّي TAMAM تختارلك وجبة</span>
        </span>
        <span className="material-symbols-outlined text-[22px] text-tamam-ink/60" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>
      </button>

      {/* Secondary row: اقتراحات TAMAM (prominent) + فتّش (lighter utility) */}
      <div className="flex gap-2 mb-2.5">
        <button
          type="button"
          onClick={() => go('/tamam-suggestions', 'suggestions')}
          className="flex-[3] rounded-2xl bg-tamam-surface-high text-tamam-text p-3 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
        >
          <span className="w-9 h-9 rounded-lg bg-tamam-green/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-tamam-green-bright">restaurant_menu</span>
          </span>
          <span className="flex flex-col items-start text-right text-tamam-text leading-tight min-w-0">
            <span className="text-[13px] font-bold">اقتراحات TAMAM</span>
            <span className="text-[10px] text-tamam-text-muted">حسب مودك والوقت</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => go('/search', 'search')}
          className="flex-[2] rounded-2xl bg-transparent text-tamam-text border border-tamam-outline/40 p-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <span className="material-symbols-outlined text-[20px] text-tamam-text-muted">search</span>
          <span className="text-[13px] font-bold text-tamam-text-muted">فتّش</span>
        </button>
      </div>

      {/* Quick intent chips — compact, scrollable, no truncation */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => goChip(c.key)}
            className="flex-shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full bg-tamam-surface border border-tamam-outline/25 text-tamam-text text-[12px] font-bold whitespace-nowrap active:scale-95 active:border-tamam-green-bright transition"
          >
            <span className="material-symbols-outlined text-[15px] text-tamam-green-bright">{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}