import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';
import HomepageMealCard from '@/components/tamam/customer/HomepageMealCard';

/**
 * Time-aware meal carousel — renders a horizontal scrolling list of
 * period-appropriate meals. Returns null when no content exists.
 */
export default function TimeAwareCarousel({ timeData, slotKey }) {
  const { locale } = useLanguage();
  const carousel = timeData?.carousels?.find((c) => c?.key === slotKey);

  if (!carousel || !carousel.meals || carousel.meals.length === 0) return null;

  const handleCardClick = (meal) => {
    track('homepage_time_carousel_clicked', {
      period_id: timeData?.current_period?.id || '',
      slot_key: slotKey,
      content_id: meal.id,
      content_type: 'meal',
      locale,
    });
  };

  return (
    <section className="py-3">
      <div className="px-4 flex items-center justify-between mb-2">
        <div>
          <h2 className="text-headline-sm font-bold">{carousel.title}</h2>
          {carousel.subtitle && <p className="text-body-sm text-on-surface-variant">{carousel.subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-1">
        {carousel.meals.map((meal) => (
          <div key={meal.id} className="flex-shrink-0 w-[150px]" onClick={() => handleCardClick(meal)}>
            <HomepageMealCard meal={meal} />
          </div>
        ))}
      </div>
    </section>
  );
}