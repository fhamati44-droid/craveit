import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DealSkeleton } from '@/components/shared/SkeletonCard';

export default function HeroDeals({ deals, loading }) {
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (deals.length <= 1) return;
    timerRef.current = setInterval(() => setActive(a => (a + 1) % deals.length), 4000);
    return () => clearInterval(timerRef.current);
  }, [deals.length]);

  if (loading) {
    return (
      <div className="px-4 mb-6">
        <div className="h-48 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!deals.length) return null;

  const deal = deals[active];

  return (
    <div className="px-4 mb-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={deal.id}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.4 }}
          className="relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-card"
          onClick={() => deal.restaurant_slug && navigate(`/restaurant/${deal.restaurant_slug}`)}
        >
          <img
            src={deal.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'}
            alt={deal.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5">
            <span className="inline-block px-2 py-0.5 rounded-full bg-orange text-white text-[10px] font-bold mb-2 uppercase tracking-wide">
              🔥 Hot Deal
            </span>
            <h3 className="text-white font-bold text-lg leading-tight">{deal.title}</h3>
            {deal.subtitle && (
              <p className="text-white/70 text-sm mt-0.5">{deal.subtitle}</p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      {deals.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {deals.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-6 bg-orange' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}