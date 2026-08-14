import { resolvePublicImage } from '@/lib/imageUtils';

export default function MoodGameRestaurantSwitcher({ restaurants, selectedId, onSelect, loading }) {
  return (
    <div dir="rtl" className="px-3 py-2">
      <p className="text-tamam-text-muted text-[10px] font-bold mb-1.5 flex items-center gap-1">
        <span className="material-symbols-outlined text-[12px]">storefront</span>
        اختر المطعم
      </p>
      {loading && (
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-[72px] h-14 skeleton-t rounded-xl" />
          ))}
        </div>
      )}
      {!loading && restaurants.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {restaurants.map((r) => {
            const active = r.id === selectedId;
            const img = resolvePublicImage(r.image_url, null);
            return (
              <button
                key={r.id}
                onClick={() => onSelect(r)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-[72px] h-14 rounded-xl border-2 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-tamam-green/40 ${
                  active ? 'border-tamam-green-bright bg-tamam-green/10' : 'border-tamam-outline/25 bg-tamam-surface'
                }`}
                style={active ? { boxShadow: '0 0 14px rgba(137,219,120,0.3)' } : undefined}
                aria-pressed={active}
                aria-label={r.name_ar || r.name}
              >
                {img ? (
                  <img src={img} alt={r.name_ar || r.name} className="w-6 h-6 rounded-full object-cover mb-0.5" loading="lazy" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-tamam-surface-high flex items-center justify-center text-xs mb-0.5">🍽️</div>
                )}
                <span className={`text-[8px] font-bold truncate max-w-[60px] ${active ? 'text-tamam-green-bright' : 'text-tamam-text-muted'}`}>
                  {r.name_ar || r.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {!loading && restaurants.length === 0 && (
        <div className="text-tamam-text-muted text-[10px] text-center py-3 font-semibold">ما في مطاعم متوفرة حالياً</div>
      )}
    </div>
  );
}