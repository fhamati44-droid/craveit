import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';
import { isFavorite, toggleFavorite } from '@/lib/favorites';
import { PACKAGE_LABEL } from '@/lib/packageUtils';

const TIER_LABEL = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };

export default function MoodLabResultCard({ pick, onAdd, added }) {
  const navigate = useNavigate();
  const [fav, setFav] = useState(isFavorite(pick.mealId));

  const toggleFav = (e) => {
    e.stopPropagation();
    setFav(toggleFavorite(pick.mealId));
  };

  return (
    <div className="bg-tamam-surface-lowest rounded-2xl overflow-hidden border border-tamam-outline/20">
      <div className="relative h-44 bg-tamam-surface">
        <PublicImage source={pick.image} fallback={PLACEHOLDER_IMAGE} alt={pick.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-tamam-ink/40 to-transparent" />
        {pick.discountPct > 0 && (
          <span className="absolute top-2 right-2 bg-tamam-gold text-tamam-ink text-[11px] font-bold px-2 py-0.5 rounded-full">خصم {pick.discountPct}%</span>
        )}
        <button onClick={toggleFav} aria-label="مفضلة" aria-pressed={fav}
          className="absolute top-2 left-2 w-9 h-9 rounded-full bg-tamam-ink/60 backdrop-blur flex items-center justify-center active:scale-90">
          <span className={`material-symbols-outlined ${fav ? 'text-tamam-error' : 'text-tamam-text'}`}>{fav ? 'favorite' : 'favorite_border'}</span>
        </button>
        {pick.tier && (
          <span className="absolute bottom-2 right-2 bg-tamam-ink/70 backdrop-blur text-tamam-green-bright text-[10px] font-bold px-2 py-0.5 rounded-full">
            {TIER_LABEL[pick.tier] || PACKAGE_LABEL[pick.tier] || pick.tier}
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-tamam-text leading-tight">{pick.title}</h3>
          <div className="text-left shrink-0">
            {pick.compareAt ? <span className="text-tamam-text-muted text-xs line-through block" dir="ltr">{Math.round(pick.compareAt)} ₪</span> : null}
            <span className="text-tamam-green-bright font-bold" dir="ltr">{pick.price != null ? `${Math.round(pick.price)} ₪` : '—'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-tamam-text-muted text-xs flex-wrap">
          {pick.restaurantName && <span className="truncate max-w-[140px]">{pick.restaurantName}</span>}
          {pick.rating != null && Number(pick.rating) > 0 && (
            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-tamam-gold text-[14px]">star</span>{Number(pick.rating).toFixed(1)}</span>
          )}
          {pick.deliveryMin != null && (
            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">schedule</span>{pick.deliveryMin}{pick.deliveryMax ? `-${pick.deliveryMax}` : ''}د</span>
          )}
        </div>
        <p className="text-tamam-text-muted text-xs leading-relaxed">{pick.reason}</p>
        <div className="flex gap-2 pt-1">
          <button onClick={() => navigate(pick.route)} aria-label={`شوف الوجبة ${pick.title}`}
            className="flex-1 h-11 bg-tamam-surface-high text-tamam-text font-bold text-sm rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-transform motion-reduce:transition-none">
            شوف الوجبة <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          </button>
          <button onClick={onAdd} aria-label={added ? 'تمت الإضافة للسلة' : 'إضافة للسلة'}
            className={`flex-1 h-11 font-bold text-sm rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-transform motion-reduce:transition-none ${added ? 'bg-tamam-green/20 text-tamam-green-bright' : 'bg-tamam-green-bright text-tamam-ink'}`}>
            {added ? <><span className="material-symbols-outlined text-[16px]">check</span>تمت الإضافة</> : <><span className="material-symbols-outlined text-[16px]">add</span>إضافة للسلة</>}
          </button>
        </div>
      </div>
    </div>
  );
}