import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';
import { getRestaurants } from '@/lib/api';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import FeaturedRestaurants from '@/components/tamam/customer/FeaturedRestaurants';
import LazySection from '@/components/tamam/customer/LazySection';

/**
 * FeaturedRestaurantsSlot — the existing FeaturedRestaurants component with
 * the same data resolution for draft & published: manual restaurant ids from
 * the config section items, or the automatic public restaurant list.
 */
export default function FeaturedRestaurantsSlot({ slot }) {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const manualIds = slot.items
    .filter((it) => it.item_type === 'restaurant')
    .map((it) => it.restaurant_id)
    .filter(Boolean);
  const idKey = manualIds.join(',');
  const [restaurants, setRestaurants] = useState(null);

  useEffect(() => {
    let alive = true;
    getRestaurants()
      .then((list) => {
        if (!alive) return;
        const all = list || [];
        const filtered = idKey
          ? all.filter((r) => idKey.split(',').includes(String(r.id)))
          : all;
        setRestaurants(filtered.slice(0, slot.section?.max_items || 6));
      })
      .catch(() => { if (alive) setRestaurants([]); });
    return () => { alive = false; };
  }, [idKey, slot.section?.id]);

  return (
    <LazySection>
      <FeaturedRestaurants
        restaurants={restaurants}
        loading={restaurants === null}
        title={slot.section?.title || 'مطاعم ممكن يعجبوك'}
        onViewAll={() => { track('home_restaurants_opened', { locale }); navigate('/restaurants'); }}
      />
    </LazySection>
  );
}