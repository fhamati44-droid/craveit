import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRestaurantById, getRestaurantBySlug, getMenuItemsByRestaurant } from '@/lib/api';
import { useCart } from '@/lib/CartContext';
import { track } from '@/lib/analytics';
import { isFavorite, toggleFavorite } from '@/lib/favorites';
import ItemModal from '@/components/restaurant/ItemModal';
import StickyCartBar from '@/components/tamam/customer/StickyCartBar';
import RestaurantInfoSheet from '@/components/tamam/customer/RestaurantInfoSheet';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function Restaurant() {
  const { restaurantId, slug } = useParams();
  const navigate = useNavigate();
  const { addItem, restaurant: cartRest, totalItems } = useCart();
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [menuQ, setMenuQ] = useState('');
  const [isFav, setIsFav] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const sectionRefs = useRef({});
  const menuSearched = useRef(false);

  const load = () => {
    setLoading(true); setError(false);
    const fetcher = restaurantId ? getRestaurantById(restaurantId) : getRestaurantBySlug(slug);
    fetcher
      .then(async rest => {
        setRestaurant(rest || null);
        if (rest) {
          setIsFav(isFavorite(rest.id));
          track('restaurant_page_viewed', { restaurant_id: rest.id });
          const cats = await getMenuItemsByRestaurant(rest.id);
          setCategories(cats || []);
          if (cats?.length) setActiveCat(cats[0].id);
        }
      })
      .catch(e => { console.error(e); setError(true); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [restaurantId, slug]);

  useEffect(() => {
    if (menuQ && !menuSearched.current) { menuSearched.current = true; track('menu_search_used', {}); }
    if (!menuQ) menuSearched.current = false;
  }, [menuQ]);

  const scrollToCat = (id) => {
    setActiveCat(id);
    track('menu_category_selected', { category_id: id });
    const el = sectionRefs.current[id];
    if (el) { const top = el.getBoundingClientRect().top + window.scrollY - 150; window.scrollTo({ top, behavior: 'smooth' }); }
  };

  const handleAdd = (itemData) => {
    if (cartRest && restaurant && cartRest.id !== restaurant.id) { setPendingItem(itemData); setConflict(true); return; }
    addItem(itemData, restaurant);
  };
  const confirmNewCart = () => { if (pendingItem) addItem(pendingItem, restaurant); setPendingItem(null); setConflict(false); };

  if (loading) return <RestaurantSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
      <p className="text-4xl mb-3">⚠️</p>
      <p className="font-bold mb-4">ما قدرنا نحمّل تفاصيل المطعم.</p>
      <div className="flex gap-3">
        <button onClick={load} className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold">حاول مرة ثانية</button>
        <button onClick={() => navigate('/restaurants')} className="border border-outline-variant px-5 py-2.5 rounded-full font-bold">ارجع للمطاعم</button>
      </div>
    </div>
  );
  if (!restaurant) return (
    <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
      <p className="text-4xl mb-3">🍽️</p>
      <p className="font-bold mb-4">المطعم مش موجود</p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/restaurants')} className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold">ارجع لكل المطاعم</button>
        <button onClick={() => navigate('/')} className="border border-outline-variant px-5 py-2.5 rounded-full font-bold">العودة للرئيسية</button>
      </div>
    </div>
  );

  const cover = restaurant.cover_url || restaurant.image_url;
  const logo = restaurant.logo_url || restaurant.image_url;
  const isOpen = restaurant.is_open ?? restaurant.active ?? true;
  const name = restaurant.name_ar || restaurant.name || 'مطعم';
  const descLine = [restaurant.category, restaurant.cuisine_type].filter(Boolean).join(' · ');
  const bestSellers = (categories[0]?.items || []).filter(i => i.is_available !== false).slice(0, 8);

  return (
    <div className="pb-36">
      <div className="relative w-full h-64 bg-surface-container-high">
        {cover ? <img src={cover} alt={name} className="w-full h-full object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-black/40" />
        <div className="absolute top-4 inset-x-4 flex justify-between items-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <button onClick={() => navigate(-1)} aria-label="رجوع" className="w-10 h-10 rounded-full bg-surface/60 backdrop-blur flex items-center justify-center"><Icon name="arrow_forward" /></button>
          <button
            onClick={() => { const a = toggleFavorite(restaurant.id); setIsFav(a); track('restaurant_favorited', { restaurant_id: restaurant.id, added: a }); }}
            aria-label="مفضلة"
            className="w-10 h-10 rounded-full bg-surface/60 backdrop-blur flex items-center justify-center"
          >
            <Icon name="favorite" className={isFav ? 'text-error' : 'text-on-surface'} />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-10 relative z-10">
        <div className="bg-surface-container rounded-2xl p-4 shadow-xl border border-outline-variant/30">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-surface-container-highest flex-shrink-0 overflow-hidden border border-outline-variant/40 flex items-center justify-center">
              {logo ? <img src={logo} alt={name} className="w-full h-full object-cover" /> : <Icon name="restaurant" className="text-primary text-3xl" />}
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold text-on-surface">{name}</h1>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${isOpen ? 'bg-primary/15 text-primary' : 'bg-error/15 text-error'}`}>{isOpen ? 'مفتوح' : 'مغلق'}</span>
              </div>
              {descLine && <p className="text-xs text-on-surface-variant mt-1">{descLine}</p>}
            </div>
          </div>
          {restaurant.description && <p className="text-sm text-on-surface-variant mt-3">{restaurant.description}</p>}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-outline-variant/30">
            {restaurant.rating != null && <Stat icon="star" value={restaurant.rating} label="تقييم" />}
            {restaurant.delivery_time != null && <Stat icon="schedule" value={`${restaurant.delivery_time} د`} label="توصيل" />}
            {restaurant.delivery_fee != null && <Stat icon="delivery_dining" value={restaurant.delivery_fee === 0 ? 'مجاني' : `₪${restaurant.delivery_fee}`} label="رسوم" />}
            {restaurant.min_order != null && <Stat icon="payments" value={`₪${restaurant.min_order}+`} label="أدنى طلب" />}
          </div>
          <button onClick={() => setShowInfo(true)} className="w-full mt-3 h-11 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-outline-variant/30"><Icon name="info" /> معلومات المطعم</button>
        </div>
      </div>

      <div className="sticky top-14 z-30 bg-surface/95 backdrop-blur-md mt-4 pb-3 pt-2">
        <div className="px-4">
          <div className="flex items-center gap-2 bg-surface-container-high rounded-full px-4 h-12 border border-outline-variant/30">
            <Icon name="search" className="text-on-surface-variant" />
            <input value={menuQ} onChange={e => setMenuQ(e.target.value)} placeholder="ابحث في قائمة الطعام..." aria-label="بحث المنيو" className="bg-transparent outline-none w-full text-sm text-on-surface placeholder:text-on-surface-variant" />
          </div>
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mt-2">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => scrollToCat(cat.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold ${activeCat === cat.id ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface border border-outline-variant/30'}`}>{cat.name_ar || cat.name}</button>
            ))}
          </div>
        )}
      </div>

      {bestSellers.length > 0 && !menuQ && (
        <div className="mt-4">
          <h2 className="px-4 text-base font-bold mb-3">الأكثر طلبًا</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
            {bestSellers.map(it => (
              <button key={it.id} onClick={() => setSelected(it)} disabled={it.is_available === false} className="flex-none w-64 bg-surface-container rounded-2xl overflow-hidden text-right disabled:opacity-50 border border-outline-variant/30 active:scale-[0.99]">
                <div className="h-36 bg-surface-container-high relative">
                  {it.image_url ? <img src={it.image_url} alt={it.name_ar || it.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                  {it.price != null && <div className="absolute bottom-2 right-2 bg-primary text-on-primary px-2 py-1 rounded-lg text-xs font-bold">₪{it.price}</div>}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm text-on-surface">{it.name_ar || it.name}</h3>
                  {it.description && <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{it.description}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 px-4 space-y-6">
        {categories.map(cat => {
          const items = (cat.items || []).filter(it => {
            if (!menuQ) return true;
            const t = (it.name_ar || it.name || '') + ' ' + (it.description || '');
            return t.includes(menuQ);
          });
          if (!items.length) return null;
          return (
            <div key={cat.id} ref={el => { sectionRefs.current[cat.id] = el; }}>
              <h2 className="text-base font-bold mb-3">{cat.name_ar || cat.name}</h2>
              <div className="space-y-3">
                {items.map(it => (
                  <button key={it.id} onClick={() => setSelected(it)} disabled={it.is_available === false} className="w-full bg-surface-container rounded-2xl p-3 flex gap-3 items-center text-right disabled:opacity-50 border border-outline-variant/30 active:scale-[0.99]">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-on-surface">{it.name_ar || it.name}</h3>
                      {it.description && <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{it.description}</p>}
                      {it.is_available === false && <p className="text-[11px] text-error mt-1">هذا الصنف مش متوفر حاليًا.</p>}
                      <div className="text-primary font-bold mt-1">₪{it.price}</div>
                    </div>
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-high">
                      {it.image_url ? <img src={it.image_url} alt={it.name_ar || it.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ItemModal item={selected} restaurant={restaurant} onClose={() => setSelected(null)} onAdd={handleAdd} />
      {totalItems > 0 && <StickyCartBar />}
      <RestaurantInfoSheet restaurant={restaurant} open={showInfo} onClose={() => setShowInfo(false)} />

      {conflict && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6" onClick={() => setConflict(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface-container-high rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">السلة فيها طلب من مطعم ثاني</h3>
            <p className="text-sm text-on-surface-variant mb-5">إذا كملت، لازم تبدأ سلة جديدة لهذا المطعم.</p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmNewCart} className="h-12 bg-primary text-on-primary rounded-xl font-bold">ابدأ سلة جديدة</button>
              <button onClick={() => { setConflict(false); setPendingItem(null); }} className="h-12 bg-surface-container-high text-on-surface rounded-xl font-bold border border-outline-variant/30">خلي السلة الحالية</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon name={icon} className="text-on-surface-variant text-[18px]" />
      <span className="text-sm font-bold text-on-surface">{value}</span>
      <span className="text-[10px] text-on-surface-variant">{label}</span>
    </div>
  );
}

function RestaurantSkeleton() {
  return (
    <div>
      <div className="h-64 skeleton-t" />
      <div className="px-4 -mt-8 space-y-3">
        <div className="h-28 skeleton-t rounded-2xl" />
        <div className="h-12 skeleton-t rounded-xl" />
        <div className="h-8 w-1/2 skeleton-t rounded" />
        {[1, 2, 3].map(i => <div key={i} className="h-24 skeleton-t rounded-2xl" />)}
      </div>
    </div>
  );
}