import { Link } from 'react-router-dom';
import HomepageHeroVideo from '@/components/tamam/customer/HomepageHeroVideo';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';

const FALLBACK_HERO = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80';

/** One consolidated hero: published CMS media (image/video) + single game CTA. */
export default function HomeHero({ hero }) {
  const h = hero || {};
  const isVideo = (h.media_kind || '').includes('video');
  const fileUrl = resolvePublicMedia(h.file_url, null);
  const posterUrl = resolvePublicMedia(h.poster_url, null);
  const headline = h.headline || 'محتار شو تاكل اليوم؟';
  const supporting = h.supporting_text || 'خلّي TAMAM يساعدك تختار الوجبة اللي بتناسب مودك.';
  const ctaLabel = h.cta_label || 'ساعدني أختار';
  const ctaRoute = h.cta_route || '/tamam-game';

  return (
    <section className="px-4 pt-4 space-y-4">
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-outline-variant/20">
        {isVideo && fileUrl ? (
          <HomepageHeroVideo videoUrl={fileUrl} posterUrl={posterUrl || FALLBACK_HERO} className="w-full h-full object-cover" />
        ) : fileUrl ? (
          <PublicImage src={fileUrl} alt={headline} className="w-full h-full object-cover" fallback={FALLBACK_HERO} />
        ) : (
          <PublicImage src={FALLBACK_HERO} alt={headline} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-4 right-4 left-4 space-y-1.5">
          <h1 className="text-headline-lg font-bold leading-tight text-on-surface">{headline}</h1>
          <p className="text-body-md text-on-surface-variant leading-relaxed">{supporting}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Link to={ctaRoute} className="h-12 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-transform flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          {ctaLabel}
        </Link>
        <Link to="/restaurants" className="h-12 bg-surface border border-outline-variant/30 font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[20px]">restaurant</span>
          تصفح المطاعم
        </Link>
      </div>
    </section>
  );
}