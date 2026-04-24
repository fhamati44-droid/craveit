import { useState, useEffect, useMemo } from 'react';
import { MapPin, ChevronDown, Search, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRestaurants, getDeals } from '@/lib/api';
import HeroDeals from '@/components/home/HeroDeals';
import CategoryBar from '@/components/home/CategoryBar';
import RestaurantCard from '@/components/home/RestaurantCard';
import { RestaurantSkeleton } from '@/components/shared/SkeletonCard';
import { Link } from 'react-router-dom';

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    Promise.all([getRestaurants(), getDeals()])
      .then(([rests, dealsList]) => {
        setRestaurants(rests || []);
        setDeals(dealsList || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return restaurants.filter(r => {
      return selectedCategory === 'all' ||
        r.category?.toLowerCase() === selectedCategory ||
        r.cuisine_type?.toLowerCase() === selectedCategory;
    });
  }, [restaurants, selectedCategory]);

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      {/* Header - Wolt style */}
      <div className="bg-white px-4 pt-12 pb-3 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Location */}
          <button className="flex items-center gap-1.5">
            <MapPin size={16} className="text-blue" />
            <span className="font-bold text-gray-900 text-base">המיקום שלי</span>
            <ChevronDown size={16} className="text-gray-500" />
          </button>
          {/* Profile */}
          <Link to="/profile">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <User size={18} className="text-gray-500" />
            </div>
          </Link>
        </div>
      </div>

      {/* Categories */}
      <CategoryBar selected={selectedCategory} onSelect={setSelectedCategory} />

      {/* Hero Deals Banner */}
      <HeroDeals deals={deals} loading={loading} />

      {/* "Nearby" section - Sala/HAAT style with 2-col grid */}
      <div className="px-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 text-lg">ארוחות צהריים בסביבה</h2>
          <button className="text-blue text-sm font-semibold">עוד</button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <RestaurantSkeleton key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-gray-400 text-sm">לא נמצאו מסעדות</p>
          </div>
        )}
      </div>

      {/* Search FAB - Wolt style bottom */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <Link to="/search">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-gray-900 text-white rounded-full px-5 py-3 shadow-card-lg text-sm font-semibold"
          >
            <Search size={16} />
            <span>חיפוש</span>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}