import { useState, useEffect, useMemo } from 'react';
import { MapPin, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRestaurants, getDeals } from '@/lib/api';
import HeroDeals from '@/components/home/HeroDeals';
import CategoryBar from '@/components/home/CategoryBar';
import RestaurantCard from '@/components/home/RestaurantCard';
import SearchBar from '@/components/home/SearchBar';
import { RestaurantSkeleton } from '@/components/shared/SkeletonCard';

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

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
      const matchSearch = !search || r.name?.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' ||
        r.category?.toLowerCase() === selectedCategory ||
        r.cuisine_type?.toLowerCase() === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [restaurants, search, selectedCategory]);

  const featured = filtered.slice(0, 4);
  const nearby = filtered.slice(4);

  return (
    <div className="bg-[#0C0C0F] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin size={14} className="text-orange" />
              <span className="text-white/50 text-xs font-medium">Deliver to</span>
            </div>
            <h1 className="text-white font-bold text-xl">Tel Aviv, Israel</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="relative w-10 h-10 rounded-full glass flex items-center justify-center"
          >
            <Bell size={18} className="text-white/70" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange rounded-full" />
          </motion.button>
        </div>

        {/* Search */}
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Deals Carousel */}
      <HeroDeals deals={deals} loading={loading} />

      {/* Section Label */}
      <div className="px-4 mb-3">
        <h2 className="text-white/40 text-xs font-semibold uppercase tracking-widest">Browse</h2>
      </div>

      {/* Category Bar */}
      <CategoryBar selected={selectedCategory} onSelect={setSelectedCategory} />

      {/* Featured Restaurants */}
      {!search && (
        <div className="mb-8">
          <div className="px-4 mb-4">
            <h2 className="text-white font-bold text-xl">⭐ Featured</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-2">
            {loading
              ? [1, 2].map(i => (
                  <div key={i} className="min-w-[280px]">
                    <RestaurantSkeleton />
                  </div>
                ))
              : featured.map(r => (
                  <RestaurantCard key={r.id} restaurant={r} featured />
                ))
            }
          </div>
        </div>
      )}

      {/* All Restaurants */}
      <div className="px-4 mb-6">
        <h2 className="text-white font-bold text-xl mb-4">
          {search ? `Results for "${search}"` : '📍 Near You'}
        </h2>
        <div className="space-y-4">
          {loading
            ? [1, 2, 3].map(i => <RestaurantSkeleton key={i} />)
            : filtered.length > 0
              ? filtered.map(r => <RestaurantCard key={r.id} restaurant={r} />)
              : (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">🍽️</p>
                  <p className="text-white/50 text-sm">No restaurants found</p>
                </div>
              )
          }
        </div>
      </div>
    </div>
  );
}