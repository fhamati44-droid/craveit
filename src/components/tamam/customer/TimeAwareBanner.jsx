import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';

/**
 * Time-aware banner — renders a promotional banner with image, text, and CTA.
 * Returns null when no time-aware content exists (banners are optional).
 */
export default function TimeAwareBanner({ timeData, slotKey }) {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const banner = timeData?.banners?.find((b) => b?.key === slotKey);

  if (!banner) return null;

  const handleClick = () => {
    track('homepage_time_banner_clicked', {
      period_id: timeData?.current_period?.id || '',
      slot_key: slotKey,
      locale,
    });
  };

  return (
    <section className="px-4 py-2">
      <button
        onClick={() => { handleClick(); navigate(banner.destination || '/restaurants'); }}
        className="relative w-full h-[120px] rounded-2xl overflow-hidden bg-tamam-surface active:scale-[0.98] transition-transform block w-full text-right"
      >
        {banner.image_url ? (
          <PublicImage
            source={banner.image_url}
            alt={banner.headline || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-l from-tamam-green-dark to-tamam-teal" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
          {banner.headline && <h3 className="text-base font-bold leading-tight mb-0.5">{banner.headline}</h3>}
          {banner.subtitle && <p className="text-xs text-white/80 leading-snug mb-1.5 line-clamp-1">{banner.subtitle}</p>}
          {banner.cta_label && (
            <span className="inline-flex items-center gap-1 self-start bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-bold">
              {banner.cta_label}
              <span className="material-symbols-outlined text-[12px]">arrow_back</span>
            </span>
          )}
        </div>
      </button>
    </section>
  );
}