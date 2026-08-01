import { useState } from 'react';
import { validateCoupon } from '@/lib/loyaltyApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function CouponInput({ amount, phone, onApplied, onClear }) {
  const [code, setCode] = useState('');
  const [state, setState] = useState(null); // {valid, discount, reason, coupon}
  const [loading, setLoading] = useState(false);

  const apply = async () => {
    if (!code.trim()) return;
    setLoading(true); setState(null);
    const res = await validateCoupon({ code: code.trim().toUpperCase(), amount, phone });
    setLoading(false);
    setState(res);
    if (res?.valid) onApplied?.({ code: code.trim().toUpperCase(), discount: res.discount, coupon: res.coupon });
    else onClear?.();
  };

  const remove = () => { setCode(''); setState(null); onClear?.(); };

  return (
    <div className="bg-surface-container rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Icon name="confirmation_number" className="text-primary" />عندك كوبون؟</h3>
      {state?.valid ? (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl p-3">
          <div>
            <p className="font-bold text-sm">{state.coupon.code}</p>
            <p className="text-[11px] text-on-surface-variant">{state.coupon.description_ar || 'تم تطبيق الكوبون'} · خصم ₪{state.discount}</p>
          </div>
          <button onClick={remove} className="text-error text-xs font-bold flex items-center gap-1"><Icon name="delete" className="text-[16px]" />إزالة</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="اكتب كود الكوبون" className="flex-1 bg-surface-container-high rounded-xl p-3 outline-none text-sm border border-outline-variant/30" />
          <button onClick={apply} disabled={loading || !code.trim()} className="px-5 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-50">{loading ? '...' : 'تطبيق'}</button>
        </div>
      )}
      {state && !state.valid && <p className="text-error text-[11px] mt-2 flex items-center gap-1"><Icon name="error" className="text-[14px]" />{state.reason}</p>}
    </div>
  );
}