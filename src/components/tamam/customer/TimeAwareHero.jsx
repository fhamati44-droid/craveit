import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

/**
 * Time-aware hero — renders a period-appropriate suggestion hero.
 * Falls back to the provided fallback when no time-aware content exists.
 * Same dimensions as the existing homepage hero (no layout shift).
 */
export default function TimeAwareHero({ timeData, fallback }) {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const hero = timeData?.hero;

  if (!hero || !hero.image_url) return fallback || null;

  const handleClick = () => {
    track('homepage_time_hero_clicked', {
      period_id: timeData?.current_period?.id || '',
      content_id: hero.id,
      content_type: hero.type,
      locale,
    });
  };

  return (
    <section className="px-4 pt-3 pb-2">
      <div
        onClick={() => { handleClick(); navigate(hero.route || '/restaurants'); }}
        className="relative w-full h-[200px] rounded-2xl overflow-hidden bg-tamam-surface cursor-pointer active:scale-[0.98] transition-transform"
      >
        <PublicImage
          source={hero.image_url}
          fallback={PLACEHOLDER_IMAGE}
          alt={hero.title || ''}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
          {hero.headline && (
            <span className="text-tamam-green-bright text-[11px] font-bold mb-1">{hero.headline}</span>
          )}
          <h2 className="text-lg font-bold leading-tight mb-1 line-clamp-2">{hero.title}</h2>
          {hero.display_price != null && (
            <span className="text-sm font-bold mb-2" dir="ltr">₪{hero.display_price}</span>
          )}
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleClick(); navigate(hero.route || '/restaurants'); }}
              className="inline-flex items-center gap-1 bg-tamam-green text-tamam-ink px-4 py-2 rounded-full text-xs font-bold"
            >
              {hero.cta_label || t('common.start_order')}
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            </button>
          </div>
        </div>
        <div className="absolute top-3 right-3 bg-tamam-ink/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-bold text-tamam-green-bright">
          {locale === 'he' ? timeData?.current_period?.name_he : timeData?.current_period?.name_ar}
        </div>
      </div>
    </section>
  );
}