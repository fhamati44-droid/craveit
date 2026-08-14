import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { DAY_NAMES } from './demandMeta';

/** Copy one day's hour classifications to other days (with replace warning). */
export default function DemandCopySheet({ open, fromDay, onApply, onClose }) {
  const [days, setDays] = useState([]);
  useEffect(() => { if (open) setDays([]); }, [open]);
  const toggle = (d) => setDays((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <h2 className="font-bold text-base">انسخ هذا اليوم</h2>
        <p className="text-[12px] text-tamam-text-muted mb-1">لأي أيام بدك تنسخ ساعات {DAY_NAMES[fromDay]}؟</p>
        <div className="flex flex-wrap gap-2 my-3">
          {DAY_NAMES.map((name, d) => {
            if (d === fromDay) return null;
            const on = days.includes(d);
            return (
              <button key={d} onClick={() => toggle(d)} aria-pressed={on}
                className={`h-11 px-4 rounded-xl text-sm font-bold border transition ${on ? 'bg-tamam-green text-tamam-ink border-tamam-green' : 'bg-tamam-surface-low text-tamam-text border-tamam-outline/30'}`}>
                {name}
              </button>
            );
          })}
        </div>
        <div className="flex items-start gap-2 bg-tamam-error/10 border border-tamam-error/30 rounded-xl p-3 mb-4">
          <span className="material-symbols-outlined text-tamam-error text-[18px] mt-0.5">warning</span>
          <p className="text-[11px] text-tamam-error leading-snug">رح نستبدل التصنيف الحالي بالأيام اللي اخترتها.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onApply?.(days)} disabled={!days.length}
            className={`flex-1 h-12 rounded-xl font-bold text-sm transition-transform active:scale-95 ${days.length ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text-muted'}`}>
            انسخ للأيام المحددة
          </button>
          <button onClick={() => onClose?.()} className="flex-1 h-12 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">إلغاء</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}