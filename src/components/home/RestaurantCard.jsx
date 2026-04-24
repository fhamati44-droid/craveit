import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Clock, Bike } from 'lucide-react';

export default function RestaurantCard({ restaurant, featured = false }) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/restaurant/${restaurant.slug}`)}
      className={`cursor-pointer rounded-2xl overflow-hidden bg-card border border-white/5 shadow-card card-hover ${
        featured ? 'min-w-[280px]' : 'w-full'
      }`}
    >
      {/* Cover Image */}
      <div className={`relative overflow-hidden ${featured ? 'h-44' : 'h-36'}`}>
        <img
          src={restaurant.cover_url || `https://images.unsplash.com/photo-1514190051997-0f6f39ca5cde?w=500&q=80`}
          alt={restaurant.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Logo Badge */}
        {restaurant.logo_url && (
          <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl overflow-hidden border-2 border-white/20 bg-black">
            <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Delivery fee badge */}
        {restaurant.delivery_fee === 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-green-500 rounded-full text-white text-[10px] font-bold">
            FREE DELIVERY
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-base leading-tight mb-1.5">{restaurant.name}</h3>
        {restaurant.description && (
          <p className="text-white/50 text-xs mb-2 line-clamp-1">{restaurant.description}</p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-white/80 text-xs font-semibold">{restaurant.rating || '4.5'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-white/40" />
            <span className="text-white/50 text-xs">{restaurant.delivery_time || '25-35'} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Bike size={12} className="text-white/40" />
            <span className="text-white/50 text-xs">
              {restaurant.delivery_fee > 0 ? `₪${restaurant.delivery_fee}` : 'Free'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}