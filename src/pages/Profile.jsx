import { useState, useEffect } from 'react';
import { Package, MapPin, Heart, Settings, LogOut, ChevronLeft, Bell, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { getOrdersByPhone } from '@/lib/api';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(localStorage.getItem('user_phone') || '');
  const [name, setName] = useState(localStorage.getItem('user_name') || '');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    if (phone) {
      setLoadingOrders(true);
      getOrdersByPhone(phone).then(setOrders).catch(() => setOrders([])).finally(() => setLoadingOrders(false));
    }
  }, [phone]);

  const handleSavePhone = () => {
    localStorage.setItem('user_phone', phoneInput);
    setPhone(phoneInput);
  };

  const menuItems = [
    { id: 'orders', icon: Package, label: 'ההזמנות שלי', count: orders.length, color: 'text-blue' },
    { id: 'addresses', icon: MapPin, label: 'כתובות שמורות', color: 'text-green-600' },
    { id: 'favorites', icon: Heart, label: 'מסעדות מועדפות', color: 'text-red-500' },
    { id: 'payments', icon: CreditCard, label: 'אמצעי תשלום', color: 'text-purple-500' },
    { id: 'notifications', icon: Bell, label: 'התראות', color: 'text-orange' },
    { id: 'settings', icon: Settings, label: 'הגדרות', color: 'text-gray-500' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5]" dir="rtl">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-gray-900 font-bold text-2xl text-right">פרופיל</h1>
      </div>

      {/* Avatar / User Info */}
      <div className="bg-white mx-3 mt-3 rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{name || 'אורח'}</h2>
            <p className="text-gray-400 text-sm">{phone || 'הוסף מספר טלפון'}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue/10 flex items-center justify-center text-3xl mr-auto">
            {name ? name[0] : '👤'}
          </div>
        </div>

        {/* Phone Input */}
        {!phone && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-gray-600 text-sm mb-2 text-right">הזן מספר טלפון לצפייה בהזמנות</p>
            <div className="flex gap-2">
              <button
                onClick={handleSavePhone}
                className="px-4 py-2.5 btn-blue text-sm rounded-xl"
              >
                שמור
              </button>
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="+972..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-blue/50 text-right"
              />
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="bg-white mx-3 mt-3 rounded-2xl shadow-card overflow-hidden">
        {menuItems.map(({ id, icon: Icon, label, count, color }, idx) => (
          <div key={id}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveSection(activeSection === id ? null : id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-right"
            >
              <ChevronLeft size={16} className={`text-gray-300 transition-transform ${activeSection === id ? '-rotate-90' : ''} mr-auto flex-shrink-0`} />
              {count !== undefined && count > 0 && (
                <span className="bg-blue/10 text-blue text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0">{count}</span>
              )}
              <span className="flex-1 text-gray-900 font-semibold">{label}</span>
              <div className={`w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={color} />
              </div>
            </motion.button>

            {/* Order History expanded */}
            {id === 'orders' && activeSection === 'orders' && (
              <div className="px-4 pb-3 border-t border-gray-50">
                {loadingOrders ? (
                  <div className="py-6 flex justify-center">
                    <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-2 pt-3">
                    {orders.map(order => (
                      <motion.div
                        key={order.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/order/${order.id}`)}
                        className="bg-gray-50 rounded-xl p-3 cursor-pointer"
                      >
                        <div className="flex justify-between mb-1">
                          <span className="text-blue font-bold text-sm">₪{Number(order.total_amount).toFixed(0)}</span>
                          <span className="text-gray-900 font-bold text-sm">#{order.id?.toString().slice(-6)}</span>
                        </div>
                        <p className="text-gray-500 text-sm text-right">{order.restaurant_name}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue/10 text-blue'
                          }`}>
                            {order.status === 'delivered' ? 'הגיע' : order.status === 'new' ? 'חדש' : order.status}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy') : ''}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-2xl mb-1">📦</p>
                    <p className="text-gray-400 text-sm">אין הזמנות עדיין</p>
                  </div>
                )}
              </div>
            )}

            {idx < menuItems.length - 1 && <div className="h-px bg-gray-100 mx-5" />}
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="mx-3 mt-3 mb-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            localStorage.removeItem('user_phone');
            localStorage.removeItem('user_name');
            setPhone('');
            setName('');
            setOrders([]);
          }}
          className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-card border border-red-100"
        >
          <span className="flex-1 text-red-500 font-semibold text-right">התנתקות</span>
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <LogOut size={18} className="text-red-500" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}