import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';

const TEAL = '#0a2624';

/** Three banner layouts matching code(9).html: split (teal+image), icon, dashed. Always renders when banner provided. */
export default function DiscoveryBanner({ banner }) {
  const navigate = useNavigate();
  if (!banner) return null;
  const open = () => { track('discovery_banner_opened', { key: banner.key, destination: banner.destination }); if (banner.destination) navigate(banner.destination); };
  const img = resolvePublicMedia(banner.file_url, null);

  if (banner.layout === 'dashed') {
    return (
      <section className="px-4 py-4">
        <button onClick={open} className="relative w-full h-40 rounded-2xl overflow-hidden bg-primary/10 flex flex-col justify-center p-6 border-2 border-dashed border-primary/30 text-center active:scale-[0.98] transition-transform">
          <h3 className="text-lg font-bold leading-tight">{banner.headline}</h3>
          <p className="text-[11px] text-on-surface-variant mb-4 mt-1">{banner.subtitle}</p>
          <span className="self-center px-6 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-lg">{banner.cta_label}</span>
        </button>
      </section>
    );
  }
  if (banner.layout === 'icon') {
    return (
      <section className="px-4 py-4">
        <button onClick={open} className="relative w-full h-40 rounded-2xl overflow-hidden bg-surface flex items-center p-6 border border-outline-variant/20 text-right active:scale-[0.98] transition-transform">
          <div className="relative z-10 w-2/3 space-y-2">
            <h3 className="text-xl font-bold leading-tight">{banner.headline}</h3>
            <p className="text-xs text-on-surface-variant">{banner.subtitle}</p>
            <span className="mt-2 inline-block px-4 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-full">{banner.cta_label}</span>
          </div>
          <div className="absolute left-0 top-0 h-full w-1/2 flex items-center justify-center">
            <span className="material-symbols-outlined text-7xl text-primary opacity-20">{banner.icon || 'nights_stay'}</span>
          </div>
        </button>
      </section>
    );
  }
  // split (teal + masked image)
  return (
    <section className="px-4 py-4">
      <button onClick={open} className="relative w-full h-40 rounded-2xl overflow-hidden flex items-center p-6 text-right active:scale-[0.98] transition-transform" style={{ backgroundColor: TEAL }}>
        <div className="relative z-10 w-2/3 space-y-2">
          <h3 className="text-xl font-bold leading-tight">{banner.headline}</h3>
          <p className="text-xs text-on-surface-variant">{banner.subtitle}</p>
          <span className="mt-2 inline-block px-4 py-1.5 bg-tertiary text-on-tertiary text-xs font-bold rounded-full">{banner.cta_label}</span>
        </div>
        {img && <PublicImage src={img} alt={banner.headline} className="absolute left-0 top-0 h-full w-1/2 object-cover opacity-60" style={{ maskImage: 'linear-gradient(to right, black, transparent)', WebkitMaskImage: 'linear-gradient(to right, black, transparent)' }} />}
      </button>
    </section>
  );
}