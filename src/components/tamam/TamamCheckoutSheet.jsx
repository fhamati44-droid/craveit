import { useState } from 'react';
import { X, Truck, ShoppingBag, UtensilsCrossed, MapPin, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import MapPicker from './MapPicker';

const ORDER_TYPES = [
  { id: 'delivery', label: 'משלוח', icon: Truck },
  { id: 'pickup', label: 'איסוף עצמי', icon: ShoppingBag },
  { id: 'dinein', label: 'ישיבה במקום', icon: UtensilsCrossed },
];

export default function TamamCheckoutSheet({ open, onClose, total, mood, packageLevel, suggestionTitle, onSubmit }) {
  const [name, setName] = useState(localStorage.getItem('user_name') || '');
  const [phone, setPhone] = useState(localStorage.getItem('user_phone') || '');
  const [orderType, setOrderType] = useState('delivery');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null);
  const [notes, setNotes] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = () => {
    const e = {};
    if (!name.trim()) e.name = 'שדה חובה';
    if (!phone.trim()) e.phone = 'שדה חובה';
    if (orderType === 'delivery' && !address.trim()) e.address = 'שדה חובה';
    setErrors(e);
    if (Object.keys(e).length) return;
    localStorage.setItem('user_name', name);
    localStorage.setItem('user_phone', phone);
    setSubmitting(true);
    onSubmit({
      name, phone, orderType,
      address: orderType === 'delivery' ? address : '',
      location: orderType === 'delivery' ? location : null,
      notes,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }}
          className="bg-white w-full max-w-lg rounded-t-3xl max-h-[94vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 z-10">
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={18} />
              </button>
              <div className="text-right">
                <h2 className="font-extrabold text-[#1A3C34] text-lg">סיום הזמנה</h2>
                <p className="text-xs text-gray-500">הזן פרטי לקוח להשלמת ההזמנה</p>
              </div>
            </div>
            {mood && (
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-[#1A3C34]/10 text-[#1A3C34] font-bold">TAMAM • {packageLevel}</span>
                <span className="text-gray-400">{mood.name_ar}</span>
                {suggestionTitle && <span className="text-gray-400">• {suggestionTitle}</span>}
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">שם מלא *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="לדוגמה: נג'לא / שרה"
                className={`w-full px-3 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-gray-200'} text-right text-sm`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            {/* Phone */}
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">מספר טלפון *</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="050-1234567" type="tel"
                className={`w-full px-3 py-3 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-gray-200'} text-right text-sm`} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Order type */}
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">סוג ארוחה</label>
              <div className="grid grid-cols-3 gap-2">
                {ORDER_TYPES.map(t => {
                  const Icon = t.icon;
                  const active = orderType === t.id;
                  return (
                    <button key={t.id} onClick={() => setOrderType(t.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold border-2 transition ${
                        active ? 'bg-[#1A3C34] text-white border-[#1A3C34]' : 'bg-white text-[#1A3C34] border-gray-200'
                      }`}>
                      <Icon size={18} /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery address */}
            {orderType === 'delivery' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">כתובת מפורטת *</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="לדוגמה: רחוב המגינים 4, דירה 12" rows={2}
                  className={`w-full px-3 py-3 rounded-xl border ${errors.address ? 'border-red-500' : 'border-gray-200'} text-right text-sm resize-none`} />
                {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowMap(true)}
                    className="flex items-center gap-1.5 text-[#1A3C34] text-xs font-bold bg-[#1A3C34]/8 px-3 py-2 rounded-lg">
                    <MapPin size={14} /> השתמש במיקום הנוכחי שלי
                  </button>
                  {location && <span className="text-[11px] text-green-600">✓ מיקום נקבע</span>}
                </div>
                {location?.formatted_address && (
                  <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2">נעץ מיקום על המפה: {location.formatted_address}</p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">הערות מיוחדות (אופציונלי)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="לדוגמה: תוספת טחינה בצד, ללא סחוג..." rows={2}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-right text-sm resize-none" />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="font-bold text-[#1A3C34] text-lg">₪{Math.round(total)}</span>
              <span className="text-xs text-gray-600">סה"כ להזמנה</span>
            </div>

            {/* CTA */}
            <button onClick={submit} disabled={submitting}
              className="w-full bg-[#C59D46] text-black font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
              <Check size={18} /> {submitting ? 'שולח...' : 'אישור וביצוע הזמנה'}
            </button>
          </div>
        </motion.div>
      </div>

      {showMap && (
        <MapPicker
          onClose={() => setShowMap(false)}
          onConfirm={(loc) => { setLocation(loc); if (loc.formatted_address && !address) setAddress(loc.formatted_address); setShowMap(false); }}
        />
      )}
    </>
  );
}