import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { LEVELS, LEVEL_ORDER } from './demandMeta';

/** Bottom sheet to classify a single hour block. */
export default function DemandHourSheet({ open, dayName, start, end, level, onApply, onClose }) {
  const [sel, setSel] = useState(level || 'unknown');
  useEffect(() => { if (open) setSel(level || 'unknown'); }, [level, open]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <h2 className="font-bold text-base">كيف الحركة من {start} إلى {end}؟</h2>
        <p className="text-[11px] text-tamam-text-muted mb-3">{dayName}</p>
        <div className="grid grid-cols-1 gap-2">
          {LEVEL_ORDER.map((k) => {
            const m = LEVELS[k];
            const selected = sel === k;
            return (
              <button key={k} onClick={() => setSel(k)} aria-pressed={selected}
                className={`flex items-center gap-3 rounded-xl p-3 border text-right transition ${selected ? `${m.bg} ${m.border}` : 'bg-tamam-surface-low border-tamam-outline/30'}`}>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center ${m.bg} ${m.text}`}><span className="material-symbols-outlined text-[20px]">{m.icon}</span></span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{m.label}</span>
                  <span className="block text-[11px] text-tamam-text-muted">{m.sub}</span>
                </span>
                {selected && <span className={`material-symbols-outlined ${m.text} text-[20px]`}>check_circle</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onApply?.(sel)} className="flex-1 h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform">طبّق</button>
          <button onClick={() => onClose?.()} className="flex-1 h-12 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">إلغاء</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}