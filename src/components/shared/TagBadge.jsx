const TAG_STYLES = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  popular: 'bg-orange/20 text-orange border-orange/30',
  spicy: 'bg-red-500/20 text-red-400 border-red-500/30',
  vegan: 'bg-green-500/20 text-green-400 border-green-500/30',
  bestseller: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const TAG_LABELS = {
  new: '✨ New',
  popular: '🔥 Popular',
  spicy: '🌶️ Spicy',
  vegan: '🌱 Vegan',
  bestseller: '⭐ Best Seller',
};

export default function TagBadge({ tag }) {
  const style = TAG_STYLES[tag] || 'bg-white/10 text-white/60 border-white/10';
  const label = TAG_LABELS[tag] || tag;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style}`}>
      {label}
    </span>
  );
}