import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Phone, User, FileText, Banknote, CreditCard, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/lib/CartContext';
import { createOrder } from '@/lib/api';

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
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        clearCart();
        navigate('/');
        return;
      }

      const order = await createOrder({
        customer_name: form.name,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
        restaurant_id: restaurant?.id,
        restaurant_name: restaurant?.name,
        items: items.map(i => ({ item_id: i.id, name: i.name, quantity: i.quantity, price: i.price, extras: i.extras || [] })),
        total_amount: total,
        delivery_fee: deliveryFee,
        payment_method: payment,
        status: 'new',
      });

      clearCart();
      navigate(`/order/${order?.id || 'success'}`);
    } catch (err) {
      console.error(err);
      alert('שגיאה בשליחת ההזמנה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-gray-900 font-bold text-xl mb-2">הסל שלך ריק</p>
          <button onClick={() => navigate('/')} className="mt-4 px-6 py-3 btn-blue text-white rounded-2xl">
            עיין במסעדות
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-8" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ChevronLeft size={20} className="text-gray-700 rotate-180" />
        </motion.button>
        <h1 className="text-gray-900 font-bold text-xl">קופה</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Delivery Details */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <h2 className="text-gray-900 font-bold text-lg mb-4 text-right">פרטי משלוח</h2>
          <div className="space-y-3">
            <Field icon={<User size={16} />} placeholder="שם מלא" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} error={errors.name} />
            <Field icon={<Phone size={16} />} placeholder="מספר טלפון" type="tel" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} error={errors.phone} />
            <Field icon={<MapPin size={16} />} placeholder="כתובת למשלוח" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} error={errors.address} />
            <Field icon={<FileText size={16} />} placeholder="הערות (אופציונלי)" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} multiline />
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <h2 className="text-gray-900 font-bold text-lg mb-4 text-right">אמצעי תשלום</h2>
          <div className="space-y-2">
            {PAYMENT_METHODS.map(method => {
              const Icon = method.icon;
              return (
                <motion.button
                  key={method.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPayment(method.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-right transition-all ${
                    payment === method.id ? 'border-blue bg-blue/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    payment === method.id ? 'border-blue' : 'border-gray-300'
                  }`}>
                    {payment === method.id && <div className="w-2.5 h-2.5 rounded-full bg-blue" />}
                  </div>
                  <div className="flex-1 text-right">
                    <p className={`font-semibold text-sm ${payment === method.id ? 'text-blue' : 'text-gray-800'}`}>{method.label}</p>
                    <p className="text-gray-400 text-xs">{method.desc}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${payment === method.id ? 'bg-blue text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Icon size={18} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <h2 className="text-gray-900 font-bold text-lg mb-4 text-right">סיכום הזמנה</h2>
          <div className="space-y-2 mb-3">
            {items.map(item => (
              <div key={item.cartId} className="flex justify-between text-sm">
                <span className="text-gray-900 font-medium">₪{(item.price * item.quantity).toFixed(0)}</span>
                <span className="text-gray-600">{item.quantity}× {item.name}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-gray-500 text-sm">
              <span>₪{subtotal.toFixed(0)}</span>
              <span>סכום ביניים</span>
            </div>
            <div className="flex justify-between text-gray-500 text-sm">
              <span className={deliveryFee === 0 ? 'text-green-600 font-semibold' : ''}>{deliveryFee === 0 ? 'חינם' : `₪${deliveryFee}`}</span>
              <span>משלוח</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-lg">
              <span>₪{total.toFixed(0)}</span>
              <span>סה"כ</span>
            </div>
          </div>
        </div>

        {/* Place Order */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={loading}
          className="w-full btn-blue py-5 text-lg rounded-2xl disabled:opacity-50"
        >
          {loading ? 'שולח הזמנה...' : `שלח הזמנה • ₪${total.toFixed(0)}`}
        </motion.button>
      </div>
    </div>
  );
}

function Field({ icon, placeholder, value, onChange, error, type = 'text', multiline = false }) {
  const base = "w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none transition-all text-right";
  const borderClass = error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue';
  return (
    <div>
      <div className="relative">
        <span className="absolute left-3 top-3.5 text-gray-400">{icon}</span>
        {multiline ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${base} ${borderClass} pl-10 resize-none`} />
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${base} ${borderClass} pl-10`} />
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1 text-right">{error}</p>}
    </div>
  );
}