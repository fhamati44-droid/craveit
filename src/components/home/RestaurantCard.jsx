import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Clock, Bike } from 'lucide-react';

export default function RestaurantCard({ restaurant }) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/restaurant/${restaurant.slug}`)}
      className="cursor-pointer rounded-2xl overflow-hidden bg-white shadow-card"
    >
      {/* Cover Image */}
      <div className="relative h-32 overflow-hidden bg-gray-100">
        <img
          src={restaurant.cover_url || `https://images.unsplash.com/photo-1514190051997-0f6f39ca5cde?w=400&q=80`}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Free delivery badge */}
        {restaurant.delivery_fee === 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-green text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Bike size={10} />
            דמי משלוח חינם
          </div>
        )}

        {/* Delivery fee pill - Sala style */}
        {restaurant.delivery_fee > 0 && (
          <div className="absolute top-2 right-2 bg-white/90 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            רק ₪{restaurant.delivery_fee}
          </div>
        )}
      </div>

      {/* Logo + Info */}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          {restaurant.logo_url && (
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0 bg-white">
              <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{restaurant.name}</h3>
            {restaurant.description && (
              <p className="text-gray-400 text-[11px] line-clamp-1 mt-0.5">{restaurant.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            <span className="text-gray-600 text-[11px] font-semibold">{restaurant.rating || '4.5'}</span>
          </div>
          <span className="text-gray-300 text-[11px]">·</span>
          <div className="flex items-center gap-0.5">
            <Clock size={11} className="text-gray-400" />
            <span className="text-gray-400 text-[11px]">{restaurant.delivery_time || '25-35'} דק'</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}