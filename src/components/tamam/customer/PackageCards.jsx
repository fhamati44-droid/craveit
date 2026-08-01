import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { resolvePublicMedia, PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

const PKG_FALLBACK = {
  classic: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
  mix: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  plus: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80',
};
const PKG_EXPLAIN = { classic: 'وجبة مناسبة ليوم عادي', mix: 'تشكيلة أكبر لمزاجك', plus: 'خيار فخم لمناسباتك' };

const DEFAULT_PKGS = [
  { key: 'classic', label: 'كلاسيك', image_url: null, display_price: null, route: '/tamam-suggestions?package=classic' },
  { key: 'mix', label: 'ميكس', image_url: null, display_price: null, route: '/tamam-suggestions?package=mix' },
  { key: 'plus', label: 'بلس', image_url: null, display_price: null, route: '/tamam-suggestions?package=plus' },
];

/** Classic / Mix / Plus package cards with real images. */
export default function PackageCards({ packages, title = 'اقتراحات TAMAM', subtitle = 'اختار الباقة اللي بتناسبك.' }) {
  const navigate = useNavigate();
  const list = (packages && packages.length) ? packages : DEFAULT_PKGS;
  return (
    <section className="px-4 py-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-headline-md font-bold">{title}</h2>
          <p className="text-xs text-on-surface-variant">{subtitle}</p>
        </div>
        <button onClick={() => navigate('/tamam-suggestions?package=all')} className="text-primary text-xs font-bold">شوف الكل</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {list.map((p) => {
          const img = resolvePublicMedia(p.image_url, PKG_FALLBACK[p.key] || PLACEHOLDER_IMAGE);
          return (
            <button key={p.key} onClick={() => navigate(p.route)} className="bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden text-right active:scale-95 transition-transform">
              <div className="aspect-square bg-surface-container-high">
                <PublicImage src={img} alt={p.label} className="w-full h-full object-cover" />
              </div>
              <div className="p-2 space-y-0.5">
                <h3 className="font-bold text-sm">{p.label || p.key}</h3>
                <p className="text-[10px] text-on-surface-variant leading-tight line-clamp-2">{p.explanation || PKG_EXPLAIN[p.key]}</p>
                {p.display_price != null && <span className="text-primary text-xs font-bold">من ₪{Math.round(p.display_price)}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}