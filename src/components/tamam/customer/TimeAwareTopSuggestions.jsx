import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

/**
 * TAMAM Picks — food-first recommendations (NOT Classic/Mix/Plus cards).
 * Shows 2–3 large food cards from time-aware top_suggestions. Each card opens
 * the existing meal/suggestion route with "شوف الوجبة" — never an Add-to-Cart.
 * Falls back to a lightweight CTA into the existing suggestion flow when empty.
 * The "اقتراح ثاني" action routes into the existing TAMAM suggestion flow
 * (the backend has no safe regenerate endpoint, so we don't fake one).
 */
export default function TimeAwareTopSuggestions({ timeData }) {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const suggestions = timeData?.top_suggestions;

  const openItem = (item) => {
    track('home_recommendation_opened', {
      content_id: item.id,
      package: item.package,
      period_id: timeData?.current_period?.id || '',
      locale,
    });
    track('homepage_time_suggestion_clicked', {
      period_id: timeData?.current_period?.id || '',
      content_id: item.id,
      content_type: 'suggestion',
      package: item.package,
      locale,
    });
    navigate(item.route || '/tamam-suggestions');
  };

  const periodName = timeData?.current_period?.name_ar;
  const fitTag = periodName ? 'مناسب لوقتك' : 'موصى فيه';

  if (!suggestions || suggestions.length === 0) {
    return (
      <section className="px-4 py-4">
        <h2 className="text-headline-sm font-bold mb-1">اختيارات TAMAM إلك</h2>
        <p className="text-body-sm text-on-surface-variant mb-3">حسب مودك والوقت</p>
        <button
          onClick={() => navigate('/tamam-suggestions')}
          className="w-full h-14 bg-surface-container border border-outline-variant/30 rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-[0.98] transition-transform"
        >
          <span className="material-symbols-outlined text-[20px] text-primary">auto_awesome</span>
          شوف اقتراحات TAMAM
        </button>
      </section>
    );
  }

  const picks = suggestions.slice(0, 3);

  return (
    <section className="py-4">
      <div className="px-4 mb-3">
        <h2 className="text-headline-sm font-bold">اختيارات TAMAM إلك</h2>
        <p className="text-body-sm text-on-surface-variant">حسب مودك والوقت</p>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {picks.map((item) => (
          <button
            key={item.id || item.package}
            onClick={() => openItem(item)}
            className="flex-shrink-0 w-[260px] bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden text-right active:scale-95 transition-transform flex flex-col"
          >
            <div className="relative h-[160px] bg-surface-container-high">
              <PublicImage
                source={item.image_url}
                fallback={PLACEHOLDER_IMAGE}
                alt={item.title || ''}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Single reason tag only */}
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-tamam-ink/80 backdrop-blur-sm text-tamam-green-bright text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[12px]">recommend</span>{fitTag}
              </span>
            </div>
            <div className="p-3 flex flex-col flex-1">
              <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1">{item.title || ''}</h3>
              {item.short_description && (
                <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-2 mb-2">{item.short_description}</p>
              )}
              <div className="flex items-center justify-between mt-auto pt-1">
                {item.display_price != null ? (
                  <span className="text-primary font-bold text-sm" dir="ltr">₪{Math.round(item.display_price)}</span>
                ) : <span />}
                <span className="bg-primary text-on-primary text-[11px] font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                  شوف الوجبة
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="px-4 mt-3">
        <button
          onClick={() => navigate('/tamam-suggestions')}
          className="w-full h-11 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface-variant text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          شوف كل الاقتراحات <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        </button>
      </div>
    </section>
  );
}