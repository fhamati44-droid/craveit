import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Phone, User, FileText, Banknote, CreditCard, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/lib/CartContext';
import { createOrder } from '@/lib/api';

const WA_NUMBER = '972544616474'; // Your WhatsApp number

const PAYMENT_METHODS = [
  { id: 'cash', label: 'מזומן בעת המסירה', icon: Banknote, desc: 'שלם כשהאוכל מגיע' },
  { id: 'credit', label: 'כרטיס אשראי', icon: CreditCard, desc: 'הוסף כרטיס בדלת' },
  { id: 'whatsapp', label: 'הזמנה דרך WhatsApp', icon: MessageCircle, desc: 'נאשר דרך ווצאפ' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, restaurant, subtotal, deliveryFee, total, clearCart } = useCart();
  const [form, setForm] = useState({
    name: localStorage.getItem('user_name') || '',
    phone: localStorage.getItem('user_phone') || '',
    address: '',
    notes: ''
  });
  const [payment, setPayment] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'שם הוא שדה חובה';
    if (!form.phone.trim()) e.phone = 'טלפון הוא שדה חובה';
    if (!form.address.trim()) e.address = 'כתובת היא שדה חובה';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    localStorage.setItem('user_name', form.name);
    localStorage.setItem('user_phone', form.phone);
    setLoading(true);

    try {
      if (payment === 'whatsapp') {
        const lines = items.map(i => `${i.quantity}x ${i.name} - ₪${(i.price * i.quantity).toFixed(0)}`);
        const msg = `הזמנה חדשה מ${form.name}\nטלפון: ${form.phone}\nכתובת: ${form.address}\n\n${lines.join('\n')}\n\nמשלוח: ₪${deliveryFee}\nסה"כ: ₪${total.toFixed(0)}`;
        window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
        clearCart();
        navigate('/');
        return;
      }

      // Format items as string for DB display
      const itemsString = items.map(i => 
        `${i.quantity}x ${i.name}${i.extras?.length ? ' + ' + i.extras.map(e => e.name).join(', ') : ''}`
      ).join(', ');

      // Format order_items as JSONB for detailed tracking
      const orderItems = items.map(i => ({
        item_id: i.id,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        extras: i.extras || [],
        subtotal: i.price * i.quantity
      }));

      const order = await createOrder({
        customer_name: form.name,
        phone: form.phone,
        address: form.address,
        notes: form.notes || null,
        kitchen_id: restaurant?.kitchen_id || 1,
        courier_id: null,
        channel: 'אתר',
        items: itemsString,
        order_items: orderItems,
        drinks: null,
        dessert: null,
        quantity: items.reduce((sum, i) => sum + i.quantity, 0),
        amount: total,
        status: 'new',
      });

      clearCart();
      navigate(`/order/${order?.id || 'success'}`);
    } catch (err) {
      console.error('Order submission error:', err);
      alert(`שגיאה בשליחת ההזמנה: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-gray-500 mb-2 text-lg font-medium">הסל ריק</p>
          <p className="text-gray-400 text-sm mb-6">הוסף פריטים כדי להמשיך</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#009DE0] text-white px-8 py-3 rounded-full font-semibold"
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-32">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">פרטי הזמנה</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Delivery Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-[#009DE0]" />
            פרטי משלוח
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                <User size={14} />
                שם מלא
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-[#009DE0]`}
                placeholder="הכנס שם מלא"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                <Phone size={14} />
                טלפון
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-[#009DE0]`}
                placeholder="05X-XXX-XXXX"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                <MapPin size={14} />
                כתובת למשלוח
              </label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border ${errors.address ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-[#009DE0]`}
                placeholder="רחוב, מספר בית, עיר"
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                <FileText size={14} />
                הערות (אופציונלי)
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#009DE0] resize-none"
                rows={3}
                placeholder="הערות מיוחדות למסעדה..."
              />
            </div>
          </div>
        </motion.div>

        {/* Payment Method */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <h2 className="font-bold text-gray-900 mb-4">אמצעי תשלום</h2>
          <div className="space-y-2">
            {PAYMENT_METHODS.map(pm => {
              const Icon = pm.icon;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPayment(pm.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    payment === pm.id
                      ? 'border-[#009DE0] bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                      payment === pm.id ? 'border-[#009DE0] bg-[#009DE0]' : 'border-gray-300'
                    }`}>
                      {payment === pm.id && <div className="w-full h-full rounded-full bg-white scale-50" />}
                    </div>
                    <Icon size={20} className={payment === pm.id ? 'text-[#009DE0]' : 'text-gray-400'} />
                    <div className="flex-1 text-right">
                      <p className="font-medium text-gray-900">{pm.label}</p>
                      <p className="text-xs text-gray-500">{pm.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <h2 className="font-bold text-gray-900 mb-3">סיכום הזמנה</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">סכום ביניים</span>
              <span className="font-medium">₪{subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">משלוח</span>
              <span className="font-medium">₪{deliveryFee.toFixed(0)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
              <span className="font-bold text-gray-900">סה"כ</span>
              <span className="font-bold text-[#009DE0] text-lg">₪{total.toFixed(0)}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#009DE0] text-white py-4 rounded-full font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0088C5] transition-colors"
        >
          {loading ? 'שולח הזמנה...' : `בצע הזמנה • ₪${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  );
}