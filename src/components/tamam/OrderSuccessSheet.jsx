import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function OrderSuccessSheet({ open, orderNumber, customerName, total, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-sm rounded-3xl overflow-hidden"
      >
        <div className="bg-[#1A3C34] px-5 pt-6 pb-5 text-center">
          <div className="w-14 h-14 rounded-full bg-[#3DEB8B]/20 flex items-center justify-center mx-auto mb-3">
            <Check size={28} className="text-[#3DEB8B]" />
          </div>
          <h2 className="text-white font-extrabold text-xl">ההזמנה התקבלה!</h2>
          <p className="text-white/70 text-sm mt-1">ההזמנה שלך נשלחה למטבח</p>
        </div>

        <div className="p-5">
          <div className="text-center mb-4">
            <p className="text-[#b8860b] font-extrabold text-2xl tracking-wider">{orderNumber}#</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
            <Row label="מספר הזמנה" value={`${orderNumber}#`} />
            <Row label="לקוח" value={customerName || '—'} />
            <Row label="זמן הכנה משוער" value="כ-15 דקות" pill />
            <Row label="סה״כ לתשלום" value={`₪${Math.round(total || 0)}`} bold />
          </div>
          <button onClick={onClose}
            className="w-full bg-[#1A3C34] text-white font-bold py-3.5 rounded-2xl mt-4">
            סיום / סגירה
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value, pill, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-600'}>{label}</span>
      {pill ? (
        <span className="bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">{value}</span>
      ) : (
        <span className={bold ? 'font-bold text-gray-900' : 'text-gray-900'}>{value}</span>
      )}
    </div>
  );
}