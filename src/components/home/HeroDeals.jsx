import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
      <div className="px-3 pt-3 mb-4">
        <div className="h-40 skeleton rounded-2xl" />
      </div>
    );
  }

  // Fallback banner when no deals
  const fallbackDeal = {
    id: 'fallback',
    title: 'קניות לסוף"ש',
    subtitle: 'מאפיות, פרחים, ירקניות וקצביות עד הבית >>',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  };

  const allDeals = deals.length ? deals : [fallbackDeal];
  const deal = allDeals[active];

  return (
    <div className="px-3 pt-3 mb-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={deal.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative h-40 rounded-2xl overflow-hidden cursor-pointer shadow-card"
          onClick={() => deal.restaurant_slug && navigate(`/restaurant/${deal.restaurant_slug}`)}
        >
          <img
            src={deal.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'}
            alt={deal.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 rtl-text">
            <h3 className="text-white font-bold text-xl leading-tight">{deal.title}</h3>
            {deal.subtitle && (
              <p className="text-white/80 text-xs mt-0.5">{deal.subtitle}</p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {allDeals.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {allDeals.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-5 bg-blue' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}