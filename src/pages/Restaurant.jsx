import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getRestaurantBySlug, getMenuItemsByRestaurant } from '@/lib/api';
import MenuHeader from '@/components/restaurant/MenuHeader';
import CategoryTabs from '@/components/restaurant/CategoryTabs';
import MenuItem from '@/components/restaurant/MenuItem';
import ItemModal from '@/components/restaurant/ItemModal';
import FloatingCartButton from '@/components/cart/FloatingCartButton';
import { useCart } from '@/lib/CartContext';
import { MenuItemSkeleton } from '@/components/shared/SkeletonCard';

export default function Restaurant() {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
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
      const offset = 110;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="h-52 skeleton" />
        <div className="bg-white px-4 py-4 space-y-2">
          <div className="h-7 w-2/3 skeleton rounded-xl ml-auto" />
          <div className="h-4 w-full skeleton rounded-xl" />
          <div className="h-4 w-3/4 skeleton rounded-xl ml-auto" />
        </div>
        <div className="space-y-0">
          {[1, 2, 3, 4].map(i => <MenuItemSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-gray-500">המסעדה לא נמצאה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-32">
      <MenuHeader restaurant={restaurant} />

      {categories.length > 0 && (
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onSelect={scrollToCategory}
        />
      )}

      {/* Menu Sections */}
      <div>
        {categories.map(cat => (
          <div
            key={cat.id}
            ref={el => sectionRefs.current[cat.id] = el}
            className="mb-2"
          >
            {/* Category header */}
            <div className="bg-[#F5F5F5] px-4 py-3 rtl-text" dir="rtl">
              <h2 className="text-gray-900 font-bold text-lg">{cat.name}</h2>
            </div>
            {/* Items in white card */}
            <div className="bg-white divide-y divide-gray-100">
              {(cat.items || []).map(item => (
                <MenuItem
                  key={item.id}
                  item={item}
                  onClick={setSelectedItem}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <ItemModal
        item={selectedItem}
        restaurant={restaurant}
        onClose={() => setSelectedItem(null)}
        onAdd={(itemData) => addItem(itemData, restaurant)}
      />

      <FloatingCartButton />
    </div>
  );
}