import { useState } from 'react';
import { PACKAGE_LABEL, packageBadge } from '@/lib/packageUtils';
import PublicImage from '@/components/shared/PublicImage';
import { getSuggestionDisplayImage, suggestionFallback } from '@/lib/suggestionImage';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function SuggestionListCard({ s, onChoose, onDetails, onSimilar }) {
  const [added, setAdded] = useState(false);
  const pkg = s.package_level || 'classic';
  const badge = packageBadge(pkg, s.isRecommended);
  const meals = s.mealNames || [];
  const preview = meals.slice(0, 4);
  const extra = Math.max(0, meals.length - preview.length);
  const people = s.peopleCount ? (s.peopleCount === 1 ? 'شخص واحد' : s.peopleCount >= 7 ? '7+ أشخاص' : `${s.peopleCount} أشخاص`) : null;
  const prep = s.prepEstimate || '30–40 دقيقة';
  const fallbackImg = suggestionFallback(pkg);
  const displayImage = getSuggestionDisplayImage({ suggestion: s, meals: s.meals, restaurant: s.restaurant, fallback: fallbackImg });

  const handleChoose = () => {
    const ok = onChoose && onChoose(s);
    if (ok) { setAdded(true); setTimeout(() => setAdded(false), 1800); }
  };

  return (
    <div className="bg-surface-container rounded-2xl overflow-hidden shadow-xl border border-primary/5 active:scale-[0.98] transition-transform">
      <div className="relative h-56 w-full">
        <PublicImage source={displayImage} fallback={fallbackImg} alt={s.title_ar || 'اقتراح TAMAM'} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-highest via-transparent to-transparent" />
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <span className={`px-3 py-1 rounded-full font-label-sm shadow-lg flex items-center gap-1 ${badge.tone === 'tertiary' ? 'bg-tertiary text-on-tertiary' : badge.tone === 'primary' ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'}`}>
            {badge.star && <Icon name="star" className="text-[14px]" />} {badge.text}
          </span>
          {s.mood && <span className="px-3 py-1 bg-surface-container-high/90 backdrop-blur-md text-on-surface rounded-full font-label-sm border border-white/10">{s.mood.name_ar}</span>}
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-headline-sm">{s.title_ar || 'اقتراح TAMAM'}</h3>
          <span className="font-bold text-primary text-headline-sm">₪{Math.round(Number(s.display_price) || 0)}</span>
        </div>
        {s.description_ar && <p className="text-on-surface-variant text-sm line-clamp-2 mb-3">{s.description_ar}</p>}
        {preview.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {preview.map((n, i) => <span key={i} className="bg-surface-container-high px-2 py-1 rounded text-on-surface-variant text-[12px] border border-outline-variant/30">{n}</span>)}
            {extra > 0 && <span className="text-primary text-[12px] pt-1">+ {extra} أصناف إضافية</span>}
          </div>
        )}
        <div className="flex items-center gap-4 py-3 border-y border-outline-variant/20 mb-4">
          {people && <div className="flex items-center gap-1"><Icon name="groups" className="text-[18px] text-on-surface-variant" /><span className="text-sm text-on-surface-variant">{people}</span></div>}
          <div className="flex items-center gap-1"><Icon name="schedule" className="text-[18px] text-on-surface-variant" /><span className="text-sm text-on-surface-variant">{prep}</span></div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={handleChoose} className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform">
            {added ? <><Icon name="check" /> تمت الإضافة للسلة</> : <>اختار هذا <Icon name="add_shopping_cart" /></>}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onDetails && onDetails(s)} className="py-3 bg-surface-container-high text-on-surface rounded-xl font-semibold border border-outline-variant text-sm">شوف التفاصيل</button>
            <button onClick={() => onSimilar && onSimilar(s)} className="py-3 bg-surface-container-high text-on-surface rounded-xl font-semibold border border-outline-variant text-sm">اقتراح مشابه</button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 justify-center opacity-70">
          <Icon name="store" className="text-[14px]" />
          <span className="text-[11px]">المصدر: {s.sourceName || 'TAMAM'}{s.multiSource ? ' · متعدد المصادر' : ''}</span>
        </div>
      </div>
    </div>
  );
}