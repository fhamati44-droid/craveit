import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Phone, HelpCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { getOrderById, getOrdersByPhone } from '@/lib/api';
import { format } from 'date-fns';

const STATUSES = [
  { id: 'new', label: 'Placed', icon: '📋', desc: 'Your order has been received' },
  { id: 'confirmed', label: 'Confirmed', icon: '✅', desc: 'Restaurant confirmed your order' },
  { id: 'cooking', label: 'Cooking', icon: '👨‍🍳', desc: "They're preparing your food" },
  { id: 'ready', label: 'Ready', icon: '📦', desc: 'Your order is ready!' },
  { id: 'delivered', label: 'Done', icon: '🎉', desc: 'Enjoy your meal!' },
];

function TrackingView({ order }) {
  const navigate = useNavigate();
  const currentIndex = order ? Math.max(STATUSES.findIndex(s => s.id === order.status), 0) : 0;
  const current = STATUSES[currentIndex];

  return (
    <div className="px-4 space-y-5">
      {/* Status Card */}
      <div className="glass rounded-3xl p-6">
        <div className="text-center mb-6">
          <motion.div key={currentIndex} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl mb-3">
            {current?.icon}
          </motion.div>
          <h2 className="text-white font-bold text-xl">{current?.label}</h2>
          <p className="text-white/50 text-sm mt-1">{current?.desc}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-1">
          {STATUSES.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${i <= currentIndex ? 'bg-orange text-white' : 'bg-white/10 text-white/30'}`}>
                {i < currentIndex ? '✓' : i + 1}
              </div>
              {i < STATUSES.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-orange rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: i < currentIndex ? 1 : 0 }}
                    style={{ transformOrigin: 'left' }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex">
          {STATUSES.map((s, i) => (
            <div key={s.id} className={`flex-1 text-center text-[9px] ${i <= currentIndex ? 'text-orange' : 'text-white/25'}`}>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Order Details */}
      {order && (
        <div className="glass rounded-3xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-bold text-lg">Order Details</h3>
            <span className="text-white/40 text-xs">#{order.id?.toString().slice(-6)}</span>
          </div>
          {order.restaurant_name && (
            <p className="text-orange text-sm font-medium">🏪 {order.restaurant_name}</p>
          )}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="space-y-1.5 border-t border-white/8 pt-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white/60">{item.quantity}× {item.name}</span>
                  <span className="text-white">₪{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-white/8 pt-3 flex justify-between text-white font-bold">
            <span>Total</span>
            <span>₪{Number(order.total_amount).toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Estimated time */}
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <Clock size={18} className="text-orange flex-shrink-0" />
        <div>
          <p className="text-white/60 text-xs">Estimated delivery</p>
          <p className="text-white font-bold">30-45 minutes</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        {order?.restaurant?.phone && (
          <a href={`tel:${order.restaurant.phone}`} className="flex items-center justify-center gap-2 glass rounded-2xl py-4 text-white font-semibold text-sm">
            <Phone size={16} className="text-orange" />
            Call Restaurant
          </a>
        )}
        <button onClick={() => navigate('/')} className="col-span-2 flex items-center justify-center gap-2 glass rounded-2xl py-4 text-white font-semibold text-sm">
          <HelpCircle size={16} className="text-orange" />
          Back to Home
        </button>
      </div>
    </div>
  );
}

function OrderHistory() {
  const [phone, setPhone] = useState(localStorage.getItem('user_phone') || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (phone) {
      setLoading(true);
      getOrdersByPhone(phone).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
    }
  }, [phone]);

  if (!phone) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-4xl mb-4">📦</p>
        <h2 className="text-white font-bold text-xl mb-2">Track Your Orders</h2>
        <p className="text-white/50 text-sm mb-6">Enter your phone number to see your order history</p>
        <div className="flex gap-2 max-w-sm mx-auto">
          <input
            type="tel"
            value={phoneInput}
            onChange={e => setPhoneInput(e.target.value)}
            placeholder="+972..."
            className="flex-1 bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-orange/50"
          />
          <button
            onClick={() => { localStorage.setItem('user_phone', phoneInput); setPhone(phoneInput); }}
            className="px-5 py-3 bg-orange rounded-xl text-white font-bold text-sm"
          >
            Search
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 space-y-3">
        {[1, 2].map(i => <div key={i} className="glass rounded-2xl h-28 skeleton" />)}
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-white font-bold">No orders yet</p>
          <button onClick={() => navigate('/')} className="mt-4 px-6 py-3 bg-orange rounded-2xl text-white font-bold text-sm">
            Order Now
          </button>
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id} className="glass rounded-2xl p-4" onClick={() => navigate(`/order/${order.id}`)}>
            <div className="flex justify-between mb-1">
              <span className="text-white font-bold">#{order.id?.toString().slice(-6)}</span>
              <span className="text-orange font-bold">₪{Number(order.total_amount).toFixed(0)}</span>
            </div>
            <p className="text-white/50 text-sm">{order.restaurant_name}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-white/30 text-xs">
                {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy') : ''}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                order.status === 'delivered' ? 'bg-green-500/20 text-green-400' : 'bg-orange/20 text-orange'
              }`}>
                {order.status}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!!id && id !== 'success');

  useEffect(() => {
    if (!id || id === 'success') { setLoading(false); return; }
    const fetch = () => getOrderById(id).then(setOrder).catch(console.error);
    fetch();
    setLoading(false);
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const isHistoryMode = !id;
  const isSuccessMode = id === 'success';

  return (
    <div className="min-h-screen bg-[#0C0C0F]">
      <div className="px-4 pt-14 pb-4 flex items-center justify-between">
        <h1 className="text-white font-bold text-xl">
          {isHistoryMode ? 'My Orders' : isSuccessMode ? '🎉 Order Placed!' : `Order #${id?.slice(-6)}`}
        </h1>
        {!isHistoryMode && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/')} className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <X size={18} className="text-white/70" />
          </motion.button>
        )}
      </div>

      {isHistoryMode ? (
        <OrderHistory />
      ) : isSuccessMode ? (
        <div className="px-4 space-y-5">
          <div className="glass rounded-3xl p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} className="text-6xl mb-4">🎉</motion.div>
            <h2 className="text-white font-bold text-2xl mb-2">Order Placed!</h2>
            <p className="text-white/50 text-sm">Your order has been received and will be confirmed shortly.</p>
          </div>
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <Clock size={18} className="text-orange" />
            <div>
              <p className="text-white/60 text-xs">Estimated delivery</p>
              <p className="text-white font-bold">30-45 minutes</p>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="w-full bg-orange text-white rounded-2xl py-4 font-bold shadow-orange-lg">
            Back to Home
          </button>
        </div>
      ) : (
        loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-8 h-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TrackingView order={order} />
        )
      )}
    </div>
  );
}