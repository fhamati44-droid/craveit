import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

const FALLBACK_HERO_IMG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80';
const DEFAULT_HEADLINE = 'محتار شو تاكل؟';
const DEFAULT_SUBTITLE = 'احكيلنا عن مودك ووضعك اليوم، وإحنا بنرتّبلك اختيارات على مزاجك.';
const DEFAULT_SUBTITLE_HE = 'נביא לך משהו שמתאים למצב הרוח שלך';
const SUBTEXT = '3 أسئلة سريعة ونجيبلك اختيارات على مزاجك';

/**
 * TAMAM decision Hero — "محتار شو تاكل؟".
 * Primary CTA opens the TAMAM Mood Game (/mood-game).
 * Secondary CTA browses the existing food catalog (/tamam-suggestions).
 * Time-aware CMS may still override headline + image; defaults match the spec.
 */
export default function TimeAwareHero({ timeData }) {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const hero = timeData?.hero;
  const periodName = locale === 'he' ? timeData?.current_period?.name_he : timeData?.current_period?.name_ar;
  const [busy, setBusy] = useState(false);

  const headline = hero?.headline || hero?.title || DEFAULT_HEADLINE;
  const subtitle = locale === 'he' ? (hero?.subtitle || DEFAULT_SUBTITLE_HE) : (hero?.subtitle || DEFAULT_SUBTITLE);
  const image = hero?.image_url || FALLBACK_HERO_IMG;

  const onPrimary = () => {
    // Prevent double-click from opening the game twice
    if (busy) return;
    setBusy(true);
    track('help_me_choose_clicked', { locale });
    track('home_primary_cta_clicked', { target: 'mood-game', period_id: timeData?.current_period?.id || '', locale });
    navigate('/mood-game');
  };
  const onSecondary = () => {
    track('home_secondary_cta_clicked', { target: 'tamam-suggestions', locale });
    navigate('/tamam-suggestions');
  };

  return (
    <section className="px-4 pt-3 pb-2">
      <div className="relative w-full h-[236px] rounded-2xl overflow-hidden bg-tamam-surface">
        <PublicImage source={image} fallback={PLACEHOLDER_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-tamam-ink/90 via-tamam-ink/45 to-transparent" />
        {periodName && (
          <div className="absolute top-3 right-3 bg-tamam-ink/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-bold text-tamam-green-bright">
            {periodName}
          </div>
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <h1 className="text-white font-bold text-xl leading-tight mb-1">{headline}</h1>
          <p className="text-tamam-text-muted text-xs leading-snug mb-3 line-clamp-2">{subtitle}</p>
          <button
            onClick={onPrimary}
            disabled={busy}
            aria-busy={busy}
            className="w-full min-h-[54px] bg-tamam-green text-tamam-ink font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform motion-reduce:transition-none mb-1 disabled:opacity-80 disabled:active:scale-100"
          >
            {busy ? (
              <span className="material-symbols-outlined text-[20px] animate-spin motion-reduce:animate-none">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            )}
            ساعدني أختار
          </button>
          <p className="text-center text-tamam-text-muted/80 text-[10px] mb-2">{SUBTEXT}</p>
          <button
            onClick={onSecondary}
            className="w-full min-h-[44px] text-tamam-text font-semibold text-sm flex items-center justify-center gap-1 active:scale-[0.98] transition-transform motion-reduce:transition-none"
          >
            <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
            تصفّح الأكل
          </button>
        </div>
      </div>
    </section>
  );
}