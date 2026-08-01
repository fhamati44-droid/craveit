const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

const METHODS = [
  { id: 'card', label: 'بطاقة ائتمان أو فيزا', icon: 'credit_card', desc: 'دفع آمن عبر Stripe. بياناتك مشفّرة.', available: true },
  { id: 'google_pay', label: 'Google Pay', icon: 'nfc', desc: 'دفع سريع وآمن بحسابك على Google.', available: true },
  { id: 'paypal', label: 'PayPal', icon: 'account_balance_wallet', desc: 'الدفع عبر PayPal.', available: false, reason: 'مش متاح لهذا الطلب' },
  { id: 'cash', label: 'الدفع نقدًا عند الاستلام', icon: 'payments', desc: 'بتدفع للمندوب وقت استلام الطلب.', available: true },
];

export default function PaymentMethodSelector({ value, onChange }) {
  return (
    <div className="space-y-2">
      {METHODS.map(m => {
        const selected = value === m.id;
        return (
          <button
            key={m.id}
            disabled={!m.available}
            onClick={() => onChange(m.id)}
            className={`w-full p-3 rounded-xl flex items-center justify-between border text-right transition-all ${selected ? 'bg-primary/10 border-primary/30' : 'bg-surface-container border-outline-variant/30'} ${!m.available ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.99]'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon name={m.icon} className="text-primary" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">{m.label}</p>
                <p className="text-[11px] text-on-surface-variant truncate">{m.available ? m.desc : m.reason}</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-primary' : 'border-outline'}`}>
              {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </button>
        );
      })}
      <p className="text-[11px] text-on-surface-variant px-1 flex items-center gap-1"><Icon name="lock" className="text-[14px]" /> بيانات الدفع محمية ومشفّرة. ما بنحتفظ برقم البطاقة الكامل.</p>
    </div>
  );
}