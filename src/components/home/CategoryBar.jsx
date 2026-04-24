import { motion } from 'framer-motion';

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'burger', label: 'Burger', emoji: '🍔' },
  { id: 'asian', label: 'Asian', emoji: '🍜' },
  { id: 'home', label: 'Home Food', emoji: '🏠' },
  { id: 'sushi', label: 'Sushi', emoji: '🍣' },
  { id: 'salad', label: 'Salad', emoji: '🥗' },
  { id: 'dessert', label: 'Dessert', emoji: '🍰' },
];

export default function CategoryBar({ selected, onSelect }) {
  return (
    <div className="mb-6">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
        {CATEGORIES.map(cat => {
          const isActive = selected === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelect(cat.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-orange border-orange text-white shadow-orange'
                  : 'bg-white/5 border-white/8 text-white/70 hover:bg-white/10'
              }`}
            >
              <span className="text-xl">{cat.emoji}</span>
              <span className="text-[11px] font-semibold whitespace-nowrap">{cat.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}