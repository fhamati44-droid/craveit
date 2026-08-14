import { LEVELS, LEVEL_ORDER } from './demandMeta';

/** Sticky fast-paint bar: pick a status, tap multiple hours, apply at once. */
export default function DemandPaintBar({ activeLevel, setLevel, count, onApply, onExit }) {
  return (
    <div className="sticky bottom-16 z-20 bg-tamam-surface-low/95 backdrop-blur-xl border-t border-tamam-outline/30 rounded-t-2xl px-3 pt-2 pb-2 mx-4" dir="rtl">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-2">
        <span className="text-[11px] text-tamam-text-muted shrink-0 ml-1">الحالة:</span>
        {LEVEL_ORDER.filter((k) => k !== 'unknown').map((k) => {
          const m = LEVELS[k];
          const on = activeLevel === k;
          return (
            <button key={k} onClick={() => setLevel(k)} aria-pressed={on}
              className={`shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-full text-[12px] font-bold border transition ${on ? `${m.chip} ${m.border}` : 'bg-tamam-surface border-tamam-outline/30 text-tamam-text-muted'}`}>
              <span className="material-symbols-outlined text-[15px]">{m.icon}</span>{m.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="text-[12px] font-bold text-tamam-text">{count ? `اخترت ${count} ساعات` : 'اضغط على الساعات اللي بدك تصنّفها'}</p>
          <p className="text-[10px] text-tamam-text-muted">اضغط مرة تانية لإلغاء التحديد.</p>
        </div>
        <button onClick={onExit} className="h-11 px-3 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">تم</button>
        <button onClick={onApply} disabled={!count}
          className={`h-11 px-4 rounded-xl font-bold text-sm transition-transform active:scale-95 ${count ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text-muted'}`}>
          طبّق على {count || 0} ساعات
        </button>
      </div>
    </div>
  );
}