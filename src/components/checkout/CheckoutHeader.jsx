import { useNavigate } from 'react-router-dom';
const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function CheckoutHeader({ title = 'إتمام الطلب', step = 2, onBack }) {
  const navigate = useNavigate();
  const steps = [
    { n: 1, label: 'السلة', icon: 'shopping_cart' },
    { n: 2, label: 'التفاصيل', icon: 'description' },
    { n: 3, label: 'الدفع', icon: 'payments' },
    { n: 4, label: 'التأكيد', icon: 'rocket_launch' },
  ];
  return (
    <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <button onClick={() => (onBack ? onBack() : navigate('/cart'))} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high active:scale-95">
          <Icon name="arrow_forward" />
        </button>
        <h1 className="text-lg font-bold flex-1">{title}</h1>
        <span className="flex items-center gap-1 text-[10px] text-primary font-bold"><Icon name="lock" className="text-[14px]" /> آمن</span>
      </div>
      <div className="flex items-center justify-between px-4 pb-3">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] ${s.n < step ? 'bg-primary text-on-primary' : s.n === step ? 'bg-primary text-on-primary ring-4 ring-surface' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                {s.n < step ? <Icon name="check" className="text-[14px]" /> : <Icon name={s.icon} className="text-[14px]" />}
              </div>
              <span className={`text-[10px] ${s.n === step ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-[2px] mx-1 mb-4 ${s.n < step ? 'bg-primary' : 'bg-surface-container-highest'}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}