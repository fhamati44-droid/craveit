import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Clock, Bike, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MenuHeader({ restaurant }) {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Cover */}
      <div className="h-56 relative overflow-hidden bg-gray-900">
        <img
          src={restaurant.cover_url || 'https://images.unsplash.com/photo-1514190051997-0f6f39ca5cde?w=800&q=80'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 glass w-10 h-10 rounded-full flex items-center justify-center"
        >
          <ChevronLeft size={20} className="text-white" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 glass w-10 h-10 rounded-full flex items-center justify-center"
        >
          <Share2 size={16} className="text-white" />
        </motion.button>

        {/* Logo */}
        {restaurant.logo_url && (
          <div className="absolute bottom-4 left-4 w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 bg-black shadow-lg">
            <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Restaurant Info */}
      <div className="bg-white px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{restaurant.name}</h1>
        {restaurant.description && (
          <p className="text-gray-500 text-sm mb-3">{restaurant.description}</p>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
              <Star size={13} className="text-yellow-500 fill-yellow-500" />
              <span className="text-yellow-700 text-xs font-bold">{restaurant.rating || '4.5'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <Clock size={14} />
            <span className="text-sm">{restaurant.delivery_time || '25-35'} min</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <Bike size={14} />
            <span className="text-sm">
              {restaurant.delivery_fee > 0 ? `₪${restaurant.delivery_fee} delivery` : 'Free delivery'}
            </span>
          </div>
        </div>
        {restaurant.min_order > 0 && (
          <p className="text-gray-400 text-xs mt-2">Min order: ₪{restaurant.min_order}</p>
        )}
      </div>
    </div>
  );
}