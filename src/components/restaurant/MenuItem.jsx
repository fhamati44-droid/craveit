import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import TagBadge from '@/components/shared/TagBadge';

export default function MenuItem({ item, onClick }) {
  const tags = Array.isArray(item.tags) ? item.tags : [];

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(item)}
      className="flex items-center gap-3 bg-white p-4 cursor-pointer active:bg-gray-50 border-b border-gray-100 last:border-0 rtl-text"
    >
      {/* Info - RTL so text comes first (right) */}
      <div className="flex-1 min-w-0">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5 justify-end">
            {tags.map(tag => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}
        <h4 className="font-bold text-gray-900 text-[15px] leading-tight mb-1">{item.name}</h4>
        {item.description && (
          <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mb-2">{item.description}</p>
        )}
        <p className="text-blue font-bold text-sm">₪{item.price}</p>
      </div>

      {/* Image + Add button */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        {item.image_url ? (
          <div className="w-24 h-20 rounded-xl overflow-hidden relative">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={e => { e.stopPropagation(); onClick(item); }}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border-2 border-blue rounded-full flex items-center justify-center shadow-card"
            >
              <Plus size={16} className="text-blue" strokeWidth={3} />
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={e => { e.stopPropagation(); onClick(item); }}
            className="w-8 h-8 bg-white border-2 border-blue rounded-full flex items-center justify-center"
          >
            <Plus size={16} className="text-blue" strokeWidth={3} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}