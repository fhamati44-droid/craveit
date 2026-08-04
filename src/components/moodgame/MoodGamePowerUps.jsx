import { Lightbulb, Shuffle, Undo2 } from 'lucide-react';

export default function MoodGamePowerUps({ hints, shuffles, onHint, onShuffle, onUndo, canUndo }) {
  const items = [
    { icon: Lightbulb, label: 'تلميح', count: hints, onClick: onHint, disabled: hints <= 0 },
    { icon: Shuffle, label: 'خلط', count: shuffles, onClick: onShuffle, disabled: shuffles <= 0 },
    { icon: Undo2, label: 'تراجع', count: null, onClick: onUndo, disabled: !canUndo },
  ];

  return (
    <div dir="rtl" className="flex flex-col gap-1.5 px-2" style={{ position: 'absolute', top: '50%', left: '4px', transform: 'translateY(-50%)', zIndex: 15 }}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={i}
            onClick={item.onClick}
            disabled={item.disabled}
            className="relative w-10 h-10 rounded-full bg-tamam-surface-high/80 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 border border-tamam-outline/20"
            aria-label={item.label}
          >
            <Icon size={16} className="text-tamam-green-bright" />
            {item.count !== null && item.count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-tamam-gold text-tamam-ink text-[8px] font-bold flex items-center justify-center">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}