import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRestaurants } from '@/lib/api';
import { restaurantToCard } from '@/lib/tamamAdapters';
import { SkeletonCard, EmptyState, ErrorState } from '@/components/tamam/customer/States';

const MaterialIcon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function Restaurants() {
  const navigate = useNavigate();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('الكل');
  const [visible, setVisible] = useState(12);

  const load = () => {
    setLoading(true); setError(false);
    getRestaurants().then(r => setAll(r || [])).catch(e => { console.error(e); setError(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const set = new Set();
    all.forEach(r => { if (r.category) set.add(r.category); if (r.cuisine_type) set.add(r.cuisine_type); });
    return ['الكل', ...Array.from(set)];
  }, [all]);

  const filtered = useMemo(() => {
    return all.filter(r => {
      const matchCat = category === 'الكل' || r.category === category || r.cuisine_type === category;
      const matchQuery = !query || (r.name || '').toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [all, category, query]);

  const list = filtered.slice(0, visible);

  if (error) return <ErrorState onRetry={load} />;

  return (
    <div className="pt-4 pb-8">
      {/* Header */}
      <div className="px-4 mb-4">
        <h1 className="text-headline-lg font-bold text-on-surface">المطاعم</h1>
        <p className="text-body-md text-on-surface-variant">اختار المطعم وشوف كل وجباته.</p>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <MaterialIcon name="search" className="text-outline" />
          </div>
          <input value={query} onChange={e => { setQuery(e.target.value); setVisible(12); }}
            className="w-full h-14 bg-surface-container border border-outline-variant rounded-xl pr-12 pl-4 text-on-surface focus:border-primary focus:outline-none transition-all"
            placeholder="دوّر على مطعم أو نوع أكل..." type="text" />
        </div>
      </div>

      {/* Category filters */}
      <div className="mb-6">
        <div className="flex overflow-x-auto gap-2 px-4 no-scrollbar py-2">
          {categories.map(c => (
            <button key={c} onClick={() => { setCategory(c); setVisible(12); }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-label-bold ${category === c ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant list */}
      <div className="flex flex-col gap-5 px-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : list.length ? (
          list.map(r => <RestaurantListCard key={r.id} r={r} onOpen={() => navigate(`/restaurant/${r.slug || r.id}`)} />)
        ) : (
          <EmptyState icon="🍽️" title="ما لقينا مطاعم" subtitle="جرّب تغيّر التصنيف أو البحث" />
        )}

        {!loading && filtered.length > visible && (
          <div className="flex flex-col items-center justify-center py-6">
            <button onClick={() => setVisible(v => v + 12)} className="text-primary font-label-bold underline">عرض المزيد</button>
          </div>
        )}
      </div>
    </div>
  );
}

function RestaurantListCard({ r, onOpen }) {
  const c = restaurantToCard(r);
  return (
    <button onClick={onOpen} className="flex flex-col text-right bg-surface-container border border-outline-variant rounded-xl overflow-hidden active:scale-[0.98] transition-transform">
      <div className="relative h-44 w-full">
        {c.coverUrl ? <img className="w-full h-full object-cover" src={c.coverUrl} alt={c.name} /> : <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-4xl">🏪</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent z-10" />
        {c.rating != null && (
          <div className="absolute top-3 left-3 z-20 bg-primary text-on-primary px-2 py-1 rounded-lg font-label-bold flex items-center gap-1">
            <MaterialIcon name="star" className="text-[14px]" /> <span>{c.rating}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-headline-sm font-bold text-on-surface">{c.name}</h2>
          <span className={`font-label-bold text-[10px] px-1.5 py-0.5 rounded border ${c.isOpen ? 'bg-primary/10 text-primary border-primary/20' : 'bg-tertiary/10 text-tertiary border-tertiary/20'}`}>{c.isOpen ? 'مفتوح هسا' : 'مغلق'}</span>
        </div>
        {c.categories?.length > 0 && <p className="text-body-sm text-on-surface-variant mb-3">{c.categories.join(' · ')}</p>}
        <div className="flex items-center gap-3 text-on-surface-variant mb-4">
          {c.deliveryMin != null && (
            <div className="flex items-center gap-1"><MaterialIcon name="schedule" className="text-[18px]" /><span className="text-body-sm">{c.deliveryMin} دقيقة</span></div>
          )}
          {c.deliveryMin != null && c.deliveryFee != null && <div className="w-1 h-1 rounded-full bg-outline-variant" />}
          {c.deliveryFee != null && (
            <div className="flex items-center gap-1"><MaterialIcon name="delivery_dining" className="text-[18px]" /><span className="text-body-sm">{c.deliveryFee === 0 ? 'توصيل مجاني' : `توصيل ₪${c.deliveryFee}`}</span></div>
          )}
        </div>
        <div className="flex justify-end items-center gap-1 text-primary font-label-bold">
          <span>شوف المنيو</span>
          <MaterialIcon name="arrow_back" />
        </div>
      </div>
    </button>
  );
}