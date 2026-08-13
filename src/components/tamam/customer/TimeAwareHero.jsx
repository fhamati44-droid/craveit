import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

const FALLBACK_HERO_IMG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80';
const DEFAULT_SUBTITLE = 'خلّينا نجيبلك إشي على مزاجك';
const DEFAULT_SUBTITLE_HE = 'נביא לך משהו שמתאים למצב הרוח שלך';

function timeOfDayHeadline() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'شو عبالك عالصبح؟';
  if (h >= 11 && h < 16) return 'شو مود الغدا؟';
  if (h >= 16 && h < 22) return 'شو مود العشا الليلة؟';
  return 'شو مودك إسا؟';
}

/**
 * TAMAM decision Hero — "شو مودك إسا؟".
 * Time-aware content REPLACES hero messaging (never adds a section).
 * Primary CTA is always the mood decision (ساعدني أختار → /tamam-game);
 * secondary is lower-emphasis browse (تصفّح الأكل → /tamam-suggestions).
 */
export default function TimeAwareHero({ timeData }) {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const hero = timeData?.hero;
  const periodName = locale === 'he' ? timeData?.current_period?.name_he : timeData?.current_period?.name_ar;

  // Time-aware hero overrides headline + image; default copy is time-of-day based.
  const headline = hero && (hero.headline || hero.title) ? (hero.headline || hero.title) : timeOfDayHeadline();
  const subtitle = locale === 'he' ? DEFAULT_SUBTITLE_HE : DEFAULT_SUBTITLE;
  const image = hero && hero.image_url ? hero.image_url : FALLBACK_HERO_IMG;

  const onPrimary = () => {
    track('home_primary_cta_clicked', { target: 'tamam-game', period_id: timeData?.current_period?.id || '', locale });
    navigate('/tamam-game');
  };
  const onSecondary = () => {
    track('home_secondary_cta_clicked', { target: 'tamam-suggestions', locale });
    navigate('/tamam-suggestions');
  };

  return (
    <section className="px-4 pt-3 pb-2">
      <div className="relative w-full h-[220px] rounded-2xl overflow-hidden bg-tamam-surface">
        <PublicImage
          source={image}
          fallback={PLACEHOLDER_IMAGE}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-tamam-ink/85 via-tamam-ink/35 to-transparent" />
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
            className="w-full h-[54px] bg-tamam-green text-tamam-ink font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform mb-2"
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            ساعدني أختار
          </button>
          <button
            onClick={onSecondary}
            className="w-full min-h-[44px] text-tamam-text font-semibold text-sm flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
          >
            تصفّح الأكل
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          </button>
        </div>
      </div>
    </section>
  );
}