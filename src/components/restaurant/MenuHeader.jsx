import { useNavigate } from 'react-router-dom';
import { ChevronDown, Star, Clock, Bike, Share2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MenuHeader({ restaurant }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      {/* Cover */}
      <div className="h-52 relative overflow-hidden bg-gray-200">
        <img
          src={restaurant.cover_url || 'https://images.unsplash.com/photo-1514190051997-0f6f39ca5cde?w=800&q=80'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        {/* Back button - Wolt style */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-card"
        >
          <ChevronDown size={18} className="text-gray-700" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-card"
        >
          <Heart size={16} className="text-gray-700" />
        </motion.button>
      </div>

      {/* Restaurant Info - RTL */}
      <div className="px-4 pt-4 pb-4 rtl-text">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-2">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="font-semibold text-gray-700">{restaurant.rating || '8.0'}</span>
          </div>
          <span>·</span>
          <span>פתוח עד 23:00</span>
          <span>·</span>
          <span>מינימום הזמנה ₪{restaurant.min_order || 50}</span>
        </div>

        {/* Delivery info */}
        <div className="flex items-center gap-2 text-sm">
          <Bike size={14} className="text-green-DEFAULT" />
          <span className={restaurant.delivery_fee === 0 ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {restaurant.delivery_fee === 0
              ? 'דמי משלוח חינם'
              : `דמי משלוח ₪${restaurant.delivery_fee}`}
          </span>
          <span className="text-gray-400">·</span>
          <Clock size={14} className="text-gray-400" />
          <span className="text-gray-500">
            משלוח משוער {restaurant.delivery_time || '25-35'} דק'
          </span>
        </div>

        {restaurant.description && (
          <p className="text-gray-400 text-sm mt-2">{restaurant.description}</p>
        )}
      </div>
    </div>
  );
}