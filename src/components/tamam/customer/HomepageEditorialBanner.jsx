import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import HomepageHeroVideo from '@/components/tamam/customer/HomepageHeroVideo';
import { resolvePublicMedia, PLACEHOLDER_IMAGE } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';

const FALLBACKS = {
  home_kitchen_banner: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
  late_night_banner: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80',
  browse_restaurants_banner: 'https://images.unsplash.com/photo-1517248135467-4c7edcad3434?w=1200&q=80',
};

/** Reusable editorial banner with layout variants. Sits between food sections for visual rhythm. */
export default function HomepageEditorialBanner({ banner }) {
  const navigate = useNavigate();
  if (!banner) return null;

  const isVideo = (banner.media_kind || '').includes('video');
  const fileUrl = resolvePublicMedia(banner.file_url, null);
  const fallback = FALLBACKS[banner.key] || PLACEHOLDER_IMAGE;
  const posterUrl = resolvePublicMedia(banner.poster_url, fallback);
  const overlay = (banner.overlay_strength ?? 50) / 100;

  const open = () => {
    track('editorial_banner_opened', { key: banner.key, destination: banner.destination });
    if (banner.destination) navigate(banner.destination);
  };

  if (banner.layout === 'compact') {
    return (
      <section className="px-4 py-3">
        <button onClick={open} className="w-full flex gap-3 bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden text-right active:scale-[0.98] transition-transform">
          <div className="w-28 h-24 flex-none bg-surface-container-high">
            {isVideo && fileUrl ? <HomepageHeroVideo videoUrl={fileUrl} posterUrl={posterUrl} className="w-full h-full object-cover" /> : <PublicImage src={fileUrl || fallback} alt={banner.headline} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 py-2 pl-2 flex flex-col justify-center">
            {banner.badge && <span className="inline-block self-start bg-tertiary/90 text-on-tertiary text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1">{banner.badge}</span>}
            <h3 className="font-bold text-sm text-on-surface leading-tight">{banner.headline}</h3>
            <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-2">{banner.subtitle}</p>
            {banner.cta_label && <span className="text-primary text-xs font-bold mt-1 flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">arrow_back</span>{banner.cta_label}</span>}
          </div>
        </button>
      </section>
    );
  }

  // large / split / dark default
  return (
    <section className="px-4 py-3">
      <button onClick={open} className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden text-right active:scale-[0.98] transition-transform block">
        {isVideo && fileUrl ? <HomepageHeroVideo videoUrl={fileUrl} posterUrl={posterUrl} className="w-full h-full object-cover" /> : <PublicImage src={fileUrl || fallback} alt={banner.headline} className="w-full h-full object-cover" />}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(11,15,13,${Math.min(overlay + 0.3, 1)}), rgba(11,15,13,${overlay * 0.4}) 60%, transparent)` }} />
        <div className="absolute bottom-3 right-3 left-3 space-y-1">
          {banner.badge && <span className="inline-block bg-tertiary text-on-tertiary text-[10px] font-bold px-2 py-0.5 rounded-full">{banner.badge}</span>}
          <h3 className="text-headline-sm font-bold text-on-surface leading-tight">{banner.headline}</h3>
          {banner.subtitle && <p className="text-xs text-on-surface-variant leading-snug">{banner.subtitle}</p>}
          {banner.cta_label && <span className="inline-flex items-center gap-1 bg-primary text-on-primary text-xs font-bold px-3 py-1.5 rounded-full mt-1">{banner.cta_label}</span>}
        </div>
      </button>
    </section>
  );
}