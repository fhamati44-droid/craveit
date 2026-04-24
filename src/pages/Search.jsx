import { useState, useEffect, useMemo } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { getRestaurants } from '@/lib/api';
import RestaurantCard from '@/components/home/RestaurantCard';
import { RestaurantSkeleton } from '@/components/shared/SkeletonCard';

const FILTERS = [
  { id: 'all', label: 'הכל' },
  { id: 'free', label: '🚚 משלוח חינם' },
  { id: 'fast', label: '⚡ מהיר (< 30 דק)' },
  { id: 'top', label: '⭐ מדורגים גבוה' },
];

export default function Search() {
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
    <div className="min-h-screen bg-[#F5F5F5]" dir="rtl">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 sticky top-0 z-20 shadow-sm">
        <div className="relative">
          <SearchIcon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חיפוש מסעדות, מנות..."
            autoFocus
            className="w-full bg-gray-100 border border-transparent rounded-2xl pr-11 pl-10 py-3.5 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-blue/30 text-right"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2">
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 pb-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filter === f.id ? 'bg-blue text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-3 pt-4 pb-4">
        {query || filter !== 'all' ? (
          <p className="text-gray-500 text-sm mb-3 text-right">
            {filtered.length} תוצאות{query ? ` עבור "${query}"` : ''}
          </p>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <RestaurantSkeleton key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-900 font-bold text-lg">לא נמצאו תוצאות</p>
            <p className="text-gray-400 text-sm mt-1">נסה חיפוש אחר</p>
          </div>
        )}
      </div>
    </div>
  );
}