import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Phone, User, FileText, CreditCard, Banknote, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/lib/CartContext';
import { createOrder } from '@/lib/api';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash on Delivery', icon: Banknote, desc: 'Pay when your food arrives' },
  { id: 'credit', label: 'Credit Card', icon: CreditCard, desc: 'Enter card details at door' },
  { id: 'whatsapp', label: 'Order via WhatsApp', icon: MessageCircle, desc: 'We\'ll confirm via WhatsApp' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, restaurant, subtotal, deliveryFee, total, clearCart } = useCart();
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });
  const [payment, setPayment] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.address.trim()) e.address = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const orderData = {
        customer_name: form.name,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
        restaurant_id: restaurant?.id,
        restaurant_name: restaurant?.name,
        items: items.map(i => ({
          item_id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          extras: i.extras || [],
        })),
        total_amount: total,
        delivery_fee: deliveryFee,
        payment_method: payment,
        status: 'new',
      };

      if (payment === 'whatsapp') {
        const lines = items.map(i => `${i.quantity}x ${i.name} - ₪${(i.price * i.quantity).toFixed(0)}`);
        const msg = `New Order from ${form.name}\nPhone: ${form.phone}\nAddress: ${form.address}\n\n${lines.join('\n')}\n\nDelivery: ₪${deliveryFee}\nTotal: ₪${total.toFixed(0)}`;
        window.open(`https://wa.me/${restaurant?.phone || ''}?text=${encodeURIComponent(msg)}`, '_blank');
        clearCart();
        navigate('/');
        return;
      }

      const order = await createOrder(orderData);
      clearCart();
      navigate(`/order/${order?.id || 'success'}`);
    } catch (err) {
      console.error(err);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#0C0C0F] flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-white font-bold text-xl mb-2">Your cart is empty</p>
          <button onClick={() => navigate('/')} className="mt-4 px-6 py-3 bg-orange rounded-2xl text-white font-bold">
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ChevronLeft size={20} className="text-gray-700" />
        </motion.button>
        <h1 className="text-gray-900 font-bold text-xl">Checkout</h1>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
        {/* Delivery Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-gray-900 font-bold text-lg mb-4">Delivery Details</h2>
          <div className="space-y-3">
            <Field
              icon={<User size={16} />}
              placeholder="Full name"
              value={form.name}
              onChange={v => setForm(f => ({ ...f, name: v }))}
              error={errors.name}
            />
            <Field
              icon={<Phone size={16} />}
              placeholder="Phone number"
              type="tel"
              value={form.phone}
              onChange={v => setForm(f => ({ ...f, phone: v }))}
              error={errors.phone}
            />
            <Field
              icon={<MapPin size={16} />}
              placeholder="Delivery address"
              value={form.address}
              onChange={v => setForm(f => ({ ...f, address: v }))}
              error={errors.address}
            />
            <Field
              icon={<FileText size={16} />}
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={v => setForm(f => ({ ...f, notes: v }))}
              multiline
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-gray-900 font-bold text-lg mb-4">Payment Method</h2>
          <div className="space-y-3">
            {PAYMENT_METHODS.map(method => {
              const Icon = method.icon;
              return (
                <motion.button
                  key={method.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPayment(method.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    payment === method.id ? 'border-orange bg-orange/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${payment === method.id ? 'bg-orange text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${payment === method.id ? 'text-orange' : 'text-gray-800'}`}>{method.label}</p>
                    <p className="text-gray-400 text-xs">{method.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payment === method.id ? 'border-orange' : 'border-gray-300'}`}>
                    {payment === method.id && <div className="w-2.5 h-2.5 rounded-full bg-orange" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-gray-900 font-bold text-lg mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4">
            {items.map(item => (
              <div key={item.cartId} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}× {item.name}</span>
                <span className="text-gray-800 font-medium">₪{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex justify-between text-gray-500 text-sm">
              <span>Subtotal</span>
              <span>₪{subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-sm">
              <span>Delivery</span>
              <span className={deliveryFee === 0 ? 'text-green-500' : ''}>
                {deliveryFee === 0 ? 'Free' : `₪${deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-lg">
              <span>Total</span>
              <span>₪{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Place Order */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-orange text-white rounded-2xl py-5 font-bold text-lg shadow-orange-lg disabled:opacity-50"
        >
          {loading ? 'Placing Order...' : `Place Order • ₪${total.toFixed(0)}`}
        </motion.button>
      </div>
    </div>
  );
}

function Field({ icon, placeholder, value, onChange, error, type = 'text', multiline = false }) {
  const base = "w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none transition-all";
  const borderClass = error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-orange';
  return (
    <div>
      <div className="relative">
        <span className="absolute left-3 top-3.5 text-gray-400">{icon}</span>
        {multiline ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={`${base} ${borderClass} pl-10 resize-none`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${base} ${borderClass} pl-10`}
          />
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </div>
  );
}