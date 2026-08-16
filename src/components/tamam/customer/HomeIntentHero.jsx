import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';

/**
 * HomeIntentHero — the clear first block on the customer Home.
 * One question + a dominant "فاجئني" action + secondary entries + a row of
 * compact intent chips that route into EXISTING flows (no new backend).
 * Hierarchy: فاجئني (primary, largest) → اقتراحات TAMAM (secondary) → فتّش (utility).
 */
function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'صباح الخير — شو عبالك اليوم؟';
  if (h >= 11 && h < 16) return 'وقت الغدا… شو بدك تاكل؟';
  if (h >= 16 && h < 22) return 'سهرة حلوة — شو نفسك؟';
  return 'جوعان بالليل؟ خلّينا نرتبلك.';
}

const CHIPS = [
  { key: 'home', label: 'للبيت', icon: 'home' },
  { key: 'friends', label: 'مع الصحاب', icon: 'groups' },
  { key: 'full', label: 'مشبعة', icon: 'lunch_dining' },
  { key: 'light', label: 'خفيفة', icon: 'eco' },
  { key: 'morning', label: 'أول النهار', icon: 'wb_sunny' },
  { key: 'late', label: 'آخر الليل', icon: 'nightlight' },
];

export default function HomeIntentHero() {
  const navigate = useNavigate();
  const hello = useMemo(greeting, []);

  const go = (to, key) => {
    track('home_intent_entry', { entry: key });
    navigate(to);
  };
  const goChip = (key) => {
    track('home_intent_chip', { chip: key });
    navigate('/tamam-suggestions');
  };

  return (
    <section className="px-4 pt-3.5 pb-1" dir="rtl">
      {/* Greeting — compact */}
      <div className="mb-2.5">
        <h1 className="font-bold text-[20px] leading-tight text-tamam-text">{hello}</h1>
        <p className="text-tamam-text-muted text-[12px] mt-0.5 leading-snug">اختَر وحدة، وإحنا منكمّلك الباقي.</p>
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

      {/* Secondary row: اقتراحات TAMAM + فتّش */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <button
          type="button"
          onClick={() => go('/tamam-suggestions', 'suggestions')}
          className="rounded-2xl bg-tamam-surface-high text-tamam-text p-3 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
        >
          <span className="w-9 h-9 rounded-lg bg-tamam-surface flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-tamam-green-bright">restaurant_menu</span>
          </span>
          <span className="flex flex-col items-start text-right leading-tight min-w-0">
            <span className="text-[13px] font-bold">اقتراحات TAMAM</span>
            <span className="text-[10px] text-tamam-text-muted">حسب مودك والوقت</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => go('/search', 'search')}
          className="rounded-2xl bg-tamam-surface text-tamam-text border border-tamam-outline/30 p-3 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
        >
          <span className="w-9 h-9 rounded-lg bg-tamam-surface-low flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-tamam-text-muted">search</span>
          </span>
          <span className="flex flex-col items-start text-right leading-tight min-w-0">
            <span className="text-[13px] font-bold">فتّش</span>
            <span className="text-[10px] text-tamam-text-muted">وجبة أو مطعم</span>
          </span>
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