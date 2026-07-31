import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRestaurantBySlug, getMenuItemsByRestaurant } from '@/lib/api';
import ItemModal from '@/components/restaurant/ItemModal';
import FloatingCartButton from '@/components/cart/FloatingCartButton';
import { useCart } from '@/lib/CartContext';

const MaterialIcon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function Restaurant() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuQuery, setMenuQuery] = useState('');
  const sectionRefs = useRef({});
  const { addItem } = useCart();

  useEffect(() => {
    setLoading(true);
    getRestaurantBySlug(slug)
      .then(async (rest) => {
        setRestaurant(rest);
        if (rest) {
          const cats = await getMenuItemsByRestaurant(rest.id);
          setCategories(cats || []);
          if (cats?.length) setActiveCategory(cats[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const scrollToCategory = (catId) => {
    setActiveCategory(catId);
    const el = sectionRefs.current[catId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 150;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="bg-surface min-h-screen">
        <div className="h-72 skeleton-t" />
        <div className="px-4 py-4 space-y-3">
          <div className="h-8 w-1/2 skeleton-t rounded-xl" />
          <div className="h-4 w-3/4 skeleton-t rounded-xl" />
          <div className="h-24 skeleton-t rounded-xl" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-center px-6">
        <div>
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-on-surface font-bold mb-4">المطعم غير موجود</p>
          <button onClick={() => navigate('/restaurants')} className="text-primary font-bold underline">العودة للمطاعم</button>
        </div>
      </div>
    );
  }

  const cover = restaurant.image_url || restaurant.cover_image_url;
  const logo = restaurant.logo_url || restaurant.image_url;
  const rating = restaurant.rating;
  const deliveryMin = restaurant.delivery_time || restaurant.estimated_delivery_time;
  const deliveryFee = restaurant.delivery_fee;
  const minOrder = restaurant.minimum_order;
  const isOpen = restaurant.is_open ?? restaurant.active ?? true;
  const bestSellers = categories[0]?.items || [];

  return (
    <div className="bg-surface min-h-screen pb-32">
      {/* Hero */}
      <div className="relative w-full h-72">
        {cover ? <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${cover}')` }} /> : <div className="w-full h-full bg-surface-container-high" />}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/40" />
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface/40 backdrop-blur-md text-on-surface">
            <MaterialIcon name="arrow_forward" />
          </button>
        </div>
      </div>

      {/* Identity card */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="bg-surface-container rounded-xl p-4 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center border-4 border-surface overflow-hidden">
              {logo ? <img className="w-full h-full object-cover" src={logo} alt={restaurant.name} /> : <MaterialIcon name="restaurant" className="text-primary text-3xl" />}
            </div>
            <div className="flex-1 pt-2">
              <div className="flex justify-between items-start">
                <h1 className="text-headline-md font-bold text-on-surface">{restaurant.name || 'مطعم'}</h1>
                <span className={`px-2 py-1 rounded-lg font-label-sm text-label-sm ${isOpen ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>{isOpen ? 'مفتوح' : 'مغلق'}</span>
              </div>
              <p className="text-label-lg text-on-surface-variant mt-1">{[restaurant.category, restaurant.cuisine_type].filter(Boolean).join(' · ') || 'مطاعم'}</p>
            </div>
          </div>
          {restaurant.description && <p className="text-body-md text-on-surface-variant mt-4">{restaurant.description}</p>}
          <div className="grid grid-cols-4 gap-1 mt-4 pt-4 border-t border-outline-variant">
            {rating != null && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-tertiary"><MaterialIcon name="star" className="text-[18px]" /><span className="font-bold text-label-lg">{rating}</span></div>
                <span className="text-label-sm text-on-surface-variant text-center">تقييم</span>
              </div>
            )}
            {deliveryMin != null && (
              <div className="flex flex-col items-center">
                <MaterialIcon name="schedule" className="text-on-surface-variant" />
                <span className="text-label-lg text-on-surface mt-1">{deliveryMin} د</span>
              </div>
            )}
            {deliveryFee != null && (
              <div className="flex flex-col items-center">
                <MaterialIcon name="delivery_dining" className="text-on-surface-variant" />
                <span className="text-label-lg text-on-surface mt-1">{deliveryFee === 0 ? 'مجاني' : `₪${deliveryFee}`}</span>
              </div>
            )}
            {minOrder != null && (
              <div className="flex flex-col items-center">
                <MaterialIcon name="payments" className="text-on-surface-variant" />
                <span className="text-label-lg text-on-surface mt-1">₪{minOrder}+</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky search + categories */}
      <div className="sticky top-14 z-40 bg-surface/90 backdrop-blur-xl mt-4 pb-3">
        <div className="px-4 py-1">
          <div className="flex items-center gap-2 bg-surface-container-high rounded-full px-4 h-12">
            <MaterialIcon name="search" className="text-on-surface-variant" />
            <input value={menuQuery} onChange={e => setMenuQuery(e.target.value)} className="bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant w-full text-body-md" placeholder="ابحث في قائمة الطعام..." type="text" />
          </div>
        </div>
        {categories.length > 0 && (
          <div className="flex overflow-x-auto gap-2 px-4 no-scrollbar mt-2">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => scrollToCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full font-label-lg text-label-lg ${activeCategory === cat.id ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Best sellers horizontal */}
      {bestSellers.length > 0 && (
        <div className="mt-6">
          <div className="px-4 mb-3"><h2 className="text-headline-md font-bold text-on-surface">الأكثر طلبًا</h2></div>
          <div className="flex overflow-x-auto gap-3 px-4 no-scrollbar">
            {bestSellers.filter(it => !menuQuery || (it.name || '').includes(menuQuery)).slice(0, 8).map(it => (
              <button key={it.id} onClick={() => setSelectedItem(it)} disabled={it.is_available === false}
                className="min-w-[260px] bg-surface-container rounded-xl overflow-hidden flex flex-col text-right disabled:opacity-50">
                <div className="h-40 relative">
                  {it.image_url ? <img className="w-full h-full object-cover" src={it.image_url} alt={it.name} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-3xl">🍽️</div>}
                  {it.price != null && <div className="absolute bottom-2 right-2 bg-primary text-on-primary px-2 py-1 rounded-lg font-bold">₪{it.price}</div>}
                </div>
                <div className="p-3">
                  <h3 className="font-label-lg text-label-lg text-on-surface">{it.name}</h3>
                  {it.description && <p className="font-label-sm text-label-sm text-on-surface-variant line-clamp-1">{it.description}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category sections */}
      <div className="mt-6 px-4 space-y-6">
        {categories.map(cat => {
          const items = (cat.items || []).filter(it => !menuQuery || (it.name || '').includes(menuQuery));
          if (!items.length) return null;
          return (
            <div key={cat.id} ref={el => sectionRefs.current[cat.id] = el}>
              <h2 className="text-headline-md font-bold text-on-surface mb-3">{cat.name}</h2>
              <div className="flex flex-col gap-3">
                {items.map(it => (
                  <button key={it.id} onClick={() => setSelectedItem(it)} disabled={it.is_available === false}
                    className="bg-surface-container rounded-xl p-3 flex gap-3 items-center text-right disabled:opacity-50 active:scale-[0.98] transition-transform">
                    <div className="flex-1">
                      <h3 className="font-label-lg text-label-lg text-on-surface">{it.name}</h3>
                      {it.description && <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 line-clamp-2">{it.description}</p>}
                      {it.is_available === false && <p className="text-[11px] text-error mt-1">هذه الوجبة غير متاحة حاليًا</p>}
                      <div className="mt-2 text-primary font-bold">₪{it.price}</div>
                    </div>
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      {it.image_url ? <img className="w-full h-full object-cover" src={it.image_url} alt={it.name} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-2xl">🍽️</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ItemModal item={selectedItem} restaurant={restaurant} onClose={() => setSelectedItem(null)} onAdd={(itemData) => addItem(itemData, restaurant)} />
      <FloatingCartButton />
    </div>
  );
}