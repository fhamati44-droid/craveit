import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';

/**
 * HomeIntentHero — the clear first block on the customer Home.
 * One question ("شو نفسك تاكل اليوم؟") + three fast entries + a row of
 * quick intent chips that route into EXISTING flows (no new backend).
 * Designed to get the user to mood / suggestions / search / purchase
 * within the first 10 seconds, with minimal cognitive load.
 */
function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'صباح الخير — شو عبالك اليوم؟';
  if (h >= 11 && h < 16) return 'وقت الغدا… شو بدك تاكل؟';
  if (h >= 16 && h < 22) return 'سهرة حلوة — شو نفسك؟';
  return 'جوعان بالليل؟ خلّينا نرتبلك.';
}

const ENTRIES = [
  { key: 'surprise', to: '/tamam-game', icon: 'auto_awesome', label: 'فاجئني', sub: 'خلّي TAMAM تختار', tone: 'primary' },
  { key: 'suggestions', to: '/tamam-suggestions', icon: 'restaurant_menu', label: 'اقتراحات TAMAM', sub: 'حسب مودك والوقت', tone: 'surface' },
  { key: 'search', to: '/search', icon: 'search', label: 'فتّش', sub: 'وجبة أو مطعم', tone: 'surface' },
];

const CHIPS = [
  { key: 'home', label: 'للبيت', icon: 'home' },
  { key: 'friends', label: 'مع الصحاب', icon: 'groups' },
  { key: 'full', label: 'مشبعة', icon: 'lunch_dining' },
  { key: 'light', label: 'خفيفة', icon: 'eco' },
  { key: 'sweet', label: 'حلو', icon: 'cake' },
  { key: 'fast', label: 'سريعة', icon: 'bolt' },
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
    <section className="px-4 pt-4 pb-2" dir="rtl">
      <div className="relative rounded-2xl overflow-hidden bg-tamam-surface border border-tamam-outline/30"
        style={{ backgroundImage: 'radial-gradient(120% 80% at 90% 0%, rgba(137,219,120,0.10) 0%, transparent 55%), radial-gradient(100% 70% at 0% 100%, rgba(234,196,92,0.06) 0%, transparent 55%)' }}>
        <div className="px-4 pt-4 pb-3">
          <h1 className="font-bold text-[20px] leading-tight text-tamam-text">{hello}</h1>
          <p className="text-tamam-text-muted text-[12px] mt-0.5 leading-snug">اختَر وحدة، وإحنا منكمّلك الباقي.</p>
        </div>

        {/* Three fast entries */}
        <div className="px-3 pb-3 grid grid-cols-3 gap-2">
          {ENTRIES.map((e) => {
            const primary = e.tone === 'primary';
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => go(e.to, e.key)}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 text-center active:scale-95 transition-transform ${
                  primary
                    ? 'bg-tamam-green text-tamam-ink'
                    : 'bg-tamam-surface-high text-tamam-text'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">{e.icon}</span>
                <span className="text-[12px] font-bold leading-tight">{e.label}</span>
                <span className={`text-[10px] leading-tight ${primary ? 'text-tamam-ink/70' : 'text-tamam-text-muted'}`}>{e.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick intent chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pt-3 pb-1 -mx-1 px-1">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => goChip(c.key)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-tamam-surface border border-tamam-outline/30 text-tamam-text text-[12px] font-bold active:scale-95 active:border-tamam-green-bright transition"
          >
            <span className="material-symbols-outlined text-[16px] text-tamam-green-bright">{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}