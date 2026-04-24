import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchBar({ value, onChange, placeholder = 'Search restaurants or dishes...' }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/6 border border-white/8 rounded-2xl pl-11 pr-10 py-3.5 text-white placeholder-white/30 text-sm outline-none focus:border-orange/50 focus:bg-white/8 transition-all"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/10"
          >
            <X size={14} className="text-white/60" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}