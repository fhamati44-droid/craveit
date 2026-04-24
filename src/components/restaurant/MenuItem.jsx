import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import TagBadge from '@/components/shared/TagBadge';

export default function MenuItem({ item, onClick }) {
  const tags = Array.isArray(item.tags) ? item.tags : [];

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(item)}
      className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:bg-gray-50"
    >
      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {tags.map(tag => <TagBadge key={tag} tag={tag} />)}
            </div>
          )}
          <h4 className="font-semibold text-gray-900 text-[15px] leading-tight mb-1">{item.name}</h4>
          {item.description && (
            <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{item.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-gray-900 font-bold text-base">₪{item.price}</span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={e => { e.stopPropagation(); onClick(item); }}
            className="w-9 h-9 rounded-full bg-orange flex items-center justify-center shadow-orange-lg text-white"
          >
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>

      {/* Image */}
      {item.image_url && (
        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
    </motion.div>
  );
}