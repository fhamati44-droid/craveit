import { useState, useEffect, useMemo } from 'react';
import { getRestaurants } from '@/lib/api';
import SearchBar from '@/components/home/SearchBar';
import RestaurantCard from '@/components/home/RestaurantCard';
import { RestaurantSkeleton } from '@/components/shared/SkeletonCard';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'free', label: '🚚 Free Delivery' },
  { id: 'fast', label: '⚡ Fast (< 30min)' },
  { id: 'top', label: '⭐ Top Rated' },
];

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getRestaurants().then(r => setRestaurants(r || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return restaurants.filter(r => {
      const matchQuery = !query || r.name?.toLowerCase().includes(query.toLowerCase()) || r.description?.toLowerCase().includes(query.toLowerCase());
      if (!matchQuery) return false;
      if (filter === 'free') return r.delivery_fee === 0;
      if (filter === 'fast') return (r.delivery_time_max || 60) < 30;
      if (filter === 'top') return (r.rating || 0) >= 4.5;
      return true;
    });
  }, [restaurants, query, filter]);

  return (
    <div className="min-h-screen bg-[#0C0C0F]">
      <div className="px-4 pt-14 pb-4">
        <h1 className="text-white font-bold text-2xl mb-4">Search</h1>
        <SearchBar value={query} onChange={setQuery} placeholder="Search restaurants, dishes..." />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 mb-5">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === f.id ? 'bg-orange text-white' : 'glass text-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4">
        {loading
          ? [1, 2, 3].map(i => <RestaurantSkeleton key={i} />)
          : filtered.length > 0
            ? filtered.map(r => <RestaurantCard key={r.id} restaurant={r} />)
            : (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-white font-bold text-lg">No results found</p>
                <p className="text-white/40 text-sm mt-1">Try a different search</p>
              </div>
            )
        }
      </div>
    </div>
  );
}