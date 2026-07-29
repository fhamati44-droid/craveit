import { useState, useEffect } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { getRestaurants, getMenuCategories, getMenuItems } from '@/lib/api';

// Props: onPick(meal, restaurant)
export default function MealPicker({ onPick }) {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { getRestaurants().then(setRestaurants).catch(() => {}); }, []);

  useEffect(() => {
    if (!restaurantId) { setCategories([]); return; }
    getMenuCategories(restaurantId).then(setCategories).catch(() => {});
    setCategoryId(null);
  }, [restaurantId]);

  useEffect(() => {
    if (!categoryId) { setItems([]); return; }
    getMenuItems(categoryId).then(setItems).catch(() => {});
  }, [categoryId]);

  const filtered = (items || []).filter(i => !search || (i.name || '').toLowerCase().includes(search.toLowerCase()));
  const restaurant = restaurants.find(r => r.id === restaurantId);

  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-3">
      <div className="flex items-center gap-2">
        <Search size={14} className="text-gray-400" />
        <input
          placeholder="חפש מנה..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue"
        />
      </div>

      <select
        value={restaurantId || ''}
        onChange={e => setRestaurantId(Number(e.target.value))}
        className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-sm"
      >
        <option value="">בחר מסעדה...</option>
        {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      {restaurantId && (
        <select
          value={categoryId || ''}
          onChange={e => setCategoryId(Number(e.target.value))}
          className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="">בחר קטגוריה...</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {categoryId && (
        <div className="max-h-48 overflow-y-auto space-y-1 bg-white rounded-lg p-1 border border-gray-100">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-4">אין פריטים</p>
          ) : filtered.map(item => (
            <button
              key={item.id}
              onClick={() => onPick(item, restaurant)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 text-right"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                {item.description && <p className="text-[10px] text-gray-400 line-clamp-1">{item.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {item.image_url && <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                <span className="text-xs font-bold text-blue">₪{item.price}</span>
                <Plus size={14} className="text-blue" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}