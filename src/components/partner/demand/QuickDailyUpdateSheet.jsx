import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { saveDemandOverride, setDemandDayLevel } from '@/lib/partnerApi';
import { DAY_NAMES } from './demandMeta';

const STEP1 = [
  { key: 'quiet', label: 'أهدأ من المعتاد', icon: 'trending_down' },
  { key: 'medium', label: 'طبيعي', icon: 'trending_flat' },
  { key: 'busy', label: 'ضغط أكثر من المعتاد', icon: 'trending_up' },
];
const STEP2 = [
  { key: 'now', label: 'الآن فقط', minutes: 30 },
  { key: 'next', label: 'الساعة الجاية', minutes: 60 },
  { key: 'two', label: 'ساعتين', minutes: 120 },
  { key: 'eod', label: 'لآخر اليوم', minutes: 'eod' },
  { key: 'custom', label: 'تحديد وقت', minutes: 'custom' },
];

/** Quick temporary daily override from the Home card — does NOT rewrite the
 *  recurring weekly pattern unless the owner explicitly opts in. */
export default function QuickDailyUpdateSheet({ open, restaurantId, branchId, onClose, onSubmitted }) {
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState(null);
  const [period, setPeriod] = useState(null);
  const [customMin, setCustomMin] = useState('');
  const [asPattern, setAsPattern] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (open) { setStep(1); setLevel(null); setPeriod(null); setCustomMin(''); setAsPattern(false); setError(null); } }, [open]);

  const today = new Date().getDay();
  const minutesFor = (p) => {
    if (p.minutes === 'eod') {
      const now = new Date(); const eod = new Date(now); eod.setHours(23, 0, 0, 0);
      return Math.max(30, Math.round((eod - now) / 60000));
    }
    if (p.minutes === 'custom') return Math.max(15, Number(customMin) || 60);
    return p.minutes;
  };

  const submit = async () => {
    if (!level || !period) return;
    setSaving(true); setError(null);
    try {
      const mins = minutesFor(period);
      await saveDemandOverride(restaurantId, branchId, { demand_level: level, duration_minutes: mins, scope: level === 'busy' ? 'reduce_campaigns' : 'information_only' });
      if (asPattern) await setDemandDayLevel(restaurantId, branchId, today, level);
      onSubmitted?.();
      onClose?.();
    } catch (e) {
      setError(e?.error === 'no_permission' ? 'ما عندك صلاحية' : 'ما قدرنا نحفظ التعديل. اختياراتك ضلت موجودة.');
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <h2 className="font-bold text-base">كيف الحركة اليوم؟</h2>
        <p className="text-[11px] text-tamam-text-muted mb-3">{DAY_NAMES[today]} — تحديث سريع مؤقت.</p>

        {step === 1 && (
          <div className="grid grid-cols-1 gap-2">
            {STEP1.map((o) => {
              const on = level === o.key;
              return (
                <button key={o.key} onClick={() => { setLevel(o.key); setStep(2); }} className="flex items-center gap-3 rounded-xl p-3 bg-tamam-surface-low border border-tamam-outline/30 text-right active:scale-[0.99]">
                  <span className="w-9 h-9 rounded-full bg-tamam-surface-high flex items-center justify-center text-tamam-green-bright"><span className="material-symbols-outlined text-[20px]">{o.icon}</span></span>
                  <span className="flex-1 text-sm font-bold">{o.label}</span>
                  <span className="material-symbols-outlined text-tamam-text-muted text-[18px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-1.5 mb-2">
              <button onClick={() => setStep(1)} className="text-[11px] text-tamam-green-bright font-bold">رجوع</button>
              <span className="text-[11px] text-tamam-text-muted">— لأي فترة؟</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {STEP2.map((o) => {
                const on = period?.key === o.key;
                return (
                  <button key={o.key} onClick={() => setPeriod(o)} className={`flex items-center justify-between rounded-xl p-3 border text-right ${on ? 'bg-tamam-green/15 border-tamam-green/45' : 'bg-tamam-surface-low border-tamam-outline/30'}`}>
                    <span className="text-sm font-bold">{o.label}</span>
                    {on && <span className="material-symbols-outlined text-tamam-green-bright text-[18px]">check_circle</span>}
                  </button>
                );
              })}
              {period?.minutes === 'custom' && (
                <input type="number" value={customMin} onChange={(e) => setCustomMin(e.target.value)} placeholder="عدد الدقائق" inputMode="numeric"
                  className="w-full bg-tamam-surface-low border border-tamam-outline/30 rounded-xl px-3 py-2.5 text-sm outline-none text-right" style={{ fontSize: '16px' }} />
              )}
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" checked={asPattern} onChange={(e) => setAsPattern(e.target.checked)} className="w-5 h-5 accent-tamam-green" />
              <span className="text-[12px] text-tamam-text">احفظه كنمط أسبوعي لهاليوم</span>
            </label>
            <p className="text-[10px] text-tamam-text-muted mt-1">افتراضيًا التعديل مؤقت وما بغيّر جدولك الأسبوعي.</p>
            {error && <p className="text-tamam-error text-xs mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={submit} disabled={!period || saving} className={`flex-1 h-12 rounded-xl font-bold text-sm transition-transform active:scale-95 ${period && !saving ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text-muted'}`}>{saving ? 'جاري الحفظ…' : 'طبّق'}</button>
              <button onClick={() => onClose?.()} className="flex-1 h-12 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">إلغاء</button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}