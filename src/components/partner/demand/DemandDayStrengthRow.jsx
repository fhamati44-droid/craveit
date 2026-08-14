import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { LEVELS, LEVEL_ORDER, DAY_NAMES, SOURCE_LABEL } from './demandMeta';

/** Manual day-level picker (used by the "غيّر التصنيف" action). */
export function DayLevelSheet({ open, day, current, onApply, onClose }) {
  const [sel, setSel] = useState(current || 'unknown');
  useEffect(() => { if (open) setSel(current || 'unknown'); }, [current, open]);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <h2 className="font-bold text-base">قوة يوم {day != null ? DAY_NAMES[day] : ''}</h2>
        <p className="text-[11px] text-tamam-text-muted mb-3">اختر تصنيف اليوم (يدوي — ما رح يتغير تلقائياً).</p>
        <div className="grid grid-cols-1 gap-2">
          {LEVEL_ORDER.map((k) => {
            const m = LEVELS[k];
            const selected = sel === k;
            return (
              <button key={k} onClick={() => setSel(k)} aria-pressed={selected}
                className={`flex items-center gap-3 rounded-xl p-3 border text-right ${selected ? `${m.bg} ${m.border}` : 'bg-tamam-surface-low border-tamam-outline/30'}`}>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center ${m.bg} ${m.text}`}><span className="material-symbols-outlined text-[20px]">{m.icon}</span></span>
                <span className="flex-1"><span className="block text-sm font-bold">{m.label}</span><span className="block text-[11px] text-tamam-text-muted">{m.sub}</span></span>
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

/** One row in the "قوة الأيام" section. */
export default function DemandDayStrengthRow({ day, dayProfile, weekItem, onAccept, onSet }) {
  const dp = dayProfile || {};
  const level = dp.effective_demand_level || weekItem?.level || 'unknown';
  const m = LEVELS[level] || LEVELS.unknown;
  const source = SOURCE_LABEL[dp.source] || SOURCE_LABEL.merchant;
  const classified = weekItem?.classified || 0;
  const canAccept = !!dp.suggested_demand_level && dp.suggested_demand_level !== 'unknown' && !dp.manual_demand_level;

  return (
    <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} />
          <span className="font-bold text-sm text-tamam-text">{DAY_NAMES[day]}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.chip}`}>{m.label}</span>
        </div>
        <span className="text-[10px] text-tamam-text-muted shrink-0">{classified} ساعة مصنّفة</span>
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-tamam-text-muted">
        <span className="material-symbols-outlined text-[13px]">info</span>
        <span>{source}{dp.explanation ? ` · ${dp.explanation}` : ''}</span>
      </div>
      {canAccept && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => onAccept?.(day)} className="flex-1 h-10 rounded-xl bg-tamam-green/15 text-tamam-green-bright font-bold text-[12px] border border-tamam-green/40">اعتمد الاقتراح</button>
          <button onClick={() => onSet?.(day)} className="flex-1 h-10 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-[12px]">غيّر التصنيف</button>
        </div>
      )}
      {!canAccept && (
        <button onClick={() => onSet?.(day)} className="w-full mt-2 h-10 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-[12px]">غيّر التصنيف</button>
      )}
    </div>
  );
}