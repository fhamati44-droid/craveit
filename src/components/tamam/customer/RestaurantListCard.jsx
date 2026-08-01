import { restaurantToCard } from '@/lib/tamamAdapters';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function RestaurantListCard({ r, hasOffer, isFav, onToggleFav, onOpen }) {
  const c = restaurantToCard(r);
  if (!c) return null;
  const open = c.isOpen;
  return (
    <div className="relative bg-surface-container border border-outline-variant/40 rounded-2xl overflow-hidden">
      <div className="relative h-40 bg-surface-container-high">
        <button onClick={onOpen} className="w-full h-full block" aria-label={`افتح ${c.name}`}>
          {c.coverUrl
            ? <img src={c.coverUrl} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-4xl">🏪</div>}
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container/90 via-transparent to-transparent pointer-events-none" />
        {c.rating != null && (
          <div className="absolute top-3 left-3 bg-primary text-on-primary px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
            <Icon name="star" className="text-[14px]" /> {c.rating}
            {c.reviewCount != null && <span className="opacity-80 font-medium">({c.reviewCount})</span>}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
          aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface/70 backdrop-blur flex items-center justify-center"
        >
          <Icon name="favorite" className={isFav ? 'text-error' : 'text-on-surface-variant'} />
        </button>
        {hasOffer && <div className="absolute bottom-3 left-3 bg-tertiary text-on-tertiary px-2 py-1 rounded-lg text-[10px] font-bold">عليها عرض</div>}
        <div className={`absolute bottom-3 right-3 text-[11px] font-bold px-2 py-1 rounded-lg ${open ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface/80 text-on-surface-variant border border-outline-variant/40'}`}>
          {open ? 'مفتوح هسا' : 'مغلق حاليًا'}
        </div>
      </div>
      <button onClick={onOpen} className="w-full text-right p-4">
        <h3 className="font-bold text-on-surface truncate">{c.name}</h3>
        <p className="text-xs text-on-surface-variant mt-0.5 truncate">
          {c.categories?.length ? c.categories.join(' · ') : (c.description || 'مطاعم')}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-on-surface-variant">
          {c.deliveryMin != null && <span className="flex items-center gap-1"><Icon name="schedule" className="text-[16px]" /> {c.deliveryMin} د</span>}
          {c.deliveryFee != null && <span className="flex items-center gap-1"><Icon name="delivery_dining" className="text-[16px]" /> {c.deliveryFee === 0 ? 'توصيل مجاني' : `₪${c.deliveryFee}`}</span>}
          {c.minOrder != null && <span className="flex items-center gap-1"><Icon name="payments" className="text-[16px]" /> ₪{c.minOrder}+</span>}
        </div>
        <div className="flex items-center justify-end gap-1 text-primary font-bold text-sm mt-3">
          <span>{open ? 'عرض المنيو والوجبات' : 'تصفح المنيو فقط'}</span>
          <Icon name="arrow_back" className="text-[18px]" />
        </div>
      </button>
    </div>
  );
}