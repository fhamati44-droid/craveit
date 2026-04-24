import { motion } from 'framer-motion';

const CATEGORIES = [
  { id: 'all', label: 'מסעדות', emoji: '🍽️', bg: 'bg-amber-50' },
  { id: 'pizza', label: 'פיצה', emoji: '🍕', bg: 'bg-red-50' },
  { id: 'burger', label: 'בורגר', emoji: '🍔', bg: 'bg-yellow-50' },
  { id: 'asian', label: 'אסייתי', emoji: '🍜', bg: 'bg-orange-50' },
  { id: 'home', label: 'אוכל בית', emoji: '🏠', bg: 'bg-green-50' },
  { id: 'sushi', label: 'סושי', emoji: '🍣', bg: 'bg-pink-50' },
  { id: 'salad', label: 'סלט', emoji: '🥗', bg: 'bg-lime-50' },
  { id: 'dessert', label: 'קינוח', emoji: '🍰', bg: 'bg-purple-50' },
  { id: 'health', label: 'בריאות', emoji: '🥑', bg: 'bg-teal-50' },
  { id: 'alcohol', label: 'אלכוהול', emoji: '🍷', bg: 'bg-rose-50' },
];

export default function CategoryBar({ selected, onSelect }) {
  return (
    <div className="bg-white border-b border-gray-100 py-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
        {CATEGORIES.map(cat => {
          const isActive = selected === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelect(cat.id)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                isActive ? 'ring-2 ring-blue ring-offset-1' : ''
              } ${cat.bg}`}>
                {cat.emoji}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${
                isActive ? 'text-blue' : 'text-gray-500'
              }`}>
                {cat.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}