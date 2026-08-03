import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';

const PKG_STYLE = {
  classic: { label: 'كلاسيك', labelHe: 'קלאסי', gradient: 'from-tamam-teal to-tamam-surface-high' },
  mix: { label: 'ميكس', labelHe: 'מיקס', gradient: 'from-tamam-green-dark to-tamam-surface-high' },
  plus: { label: 'بلس', labelHe: 'פלוס', gradient: 'from-tamam-gold-dark to-tamam-surface-high' },
};

/**
 * Time-aware top suggestions — renders 3 cards (Classic, Mix, Plus)
 * with period-appropriate TAMAM suggestions.
 * Falls back to the provided fallback when no time-aware content exists.
 */
export default function TimeAwareTopSuggestions({ timeData, fallback }) {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const suggestions = timeData?.top_suggestions;

  if (!suggestions || suggestions.length === 0) return fallback || null;

  const handleClick = (item) => {
    track('homepage_time_suggestion_clicked', {
      period_id: timeData?.current_period?.id || '',
      content_id: item.id,
      content_type: 'suggestion',
      package: item.package,
      locale,
    });
  };

  return (
    <section className="px-4 py-3">
      <h2 className="text-headline-sm font-bold mb-2">
        {locale === 'he' ? 'הצעות TAMAM' : 'اقتراحات TAMAM'}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {suggestions.map((item) => {
          const style = PKG_STYLE[item.package] || PKG_STYLE.classic;
          return (
            <button
              key={item.package}
              onClick={() => { handleClick(item); navigate(item.route || '/tamam-suggestions'); }}
              className="relative rounded-2xl overflow-hidden bg-tamam-surface border border-tamam-outline/20 active:scale-95 transition-transform block h-[130px] w-full"
            >
              <PublicImage
                source={item.image_url}
                alt={item.title || ''}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${style.gradient} opacity-80`} />
              <div className="absolute inset-0 flex flex-col justify-between p-2.5 text-white">
                <span className="self-start bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-[9px] font-bold">
                  {locale === 'he' ? style.labelHe : style.label}
                </span>
                <div>
                  <p className="text-[11px] font-bold leading-tight line-clamp-2 mb-0.5">{item.title}</p>
                  {item.display_price != null && (
                    <span className="text-[11px] font-bold" dir="ltr">₪{item.display_price}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}