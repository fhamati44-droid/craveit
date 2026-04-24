import { useState, useEffect } from 'react';
import { Package, MapPin, Heart, Settings, LogOut, ChevronRight, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { getOrdersByPhone } from '@/lib/api';
import { format } from 'date-fns';

export default function Profile() {
  const [phone, setPhone] = useState(localStorage.getItem('user_phone') || '');
  const [name, setName] = useState(localStorage.getItem('user_name') || '');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    if (phone) {
      setLoadingOrders(true);
      getOrdersByPhone(phone).then(setOrders).catch(console.error).finally(() => setLoadingOrders(false));
    }
  }, [phone]);

  const handleSavePhone = () => {
    localStorage.setItem('user_phone', phoneInput);
    setPhone(phoneInput);
    setActiveSection(null);
  };

  const menuItems = [
    { id: 'orders', icon: Package, label: 'Order History', count: orders.length },
    { id: 'addresses', icon: MapPin, label: 'Saved Addresses' },
    { id: 'favorites', icon: Heart, label: 'Favorite Restaurants' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#0C0C0F]">
      {/* Header */}
      <div className="px-4 pt-14 pb-6">
        <h1 className="text-white font-bold text-2xl mb-6">Profile</h1>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange/20 border border-orange/30 flex items-center justify-center text-3xl">
            {name ? name[0].toUpperCase() : '👤'}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{name || 'Guest User'}</p>
            <p className="text-white/40 text-sm">{phone || 'Add your phone to track orders'}</p>
          </div>
        </div>

        {/* Phone Setup */}
        {!phone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-6 border border-orange/20"
          >
            <p className="text-white font-semibold text-sm mb-3">📱 Add your phone to see order history</p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="+972..."
                className="flex-1 bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-orange/50"
              />
              <button onClick={handleSavePhone} className="px-4 py-2.5 bg-orange rounded-xl text-white text-sm font-bold">
                Save
              </button>
            </div>
          </motion.div>
        )}

        {/* Menu */}
        <div className="space-y-2">
          {menuItems.map(({ id, icon: Icon, label, count }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveSection(activeSection === id ? null : id)}
              className="w-full glass rounded-2xl p-4 flex items-center gap-4 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center">
                <Icon size={18} className="text-orange" />
              </div>
              <span className="flex-1 text-white font-semibold">{label}</span>
              {count !== undefined && count > 0 && (
                <span className="bg-orange/20 text-orange text-xs px-2 py-0.5 rounded-full font-bold">{count}</span>
              )}
              <ChevronRight size={16} className={`text-white/30 transition-transform ${activeSection === id ? 'rotate-90' : ''}`} />
            </motion.button>
          ))}
        </div>

        {/* Order History Section */}
        {activeSection === 'orders' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-3"
          >
            {loadingOrders ? (
              <div className="glass rounded-2xl p-6 text-center">
                <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : orders.length > 0 ? (
              orders.map(order => (
                <div key={order.id} className="glass rounded-2xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-white font-bold">Order #{order.id?.toString().slice(-4)}</span>
                    <span className="text-orange font-bold">₪{order.total_amount}</span>
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
            ) : (
              <div className="glass rounded-2xl p-8 text-center">
                <p className="text-3xl mb-2">📦</p>
                <p className="text-white/50 text-sm">No orders yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Logout */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            localStorage.removeItem('user_phone');
            localStorage.removeItem('user_name');
            setPhone('');
            setName('');
            setOrders([]);
          }}
          className="w-full mt-6 glass rounded-2xl p-4 flex items-center gap-4 border border-red-500/20"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <LogOut size={18} className="text-red-400" />
          </div>
          <span className="text-red-400 font-semibold">Logout</span>
        </motion.button>
      </div>
    </div>
  );
}