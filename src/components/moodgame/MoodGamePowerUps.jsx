import { Lightbulb, Shuffle, Undo2 } from 'lucide-react';

export default function MoodGamePowerUps({ hints, shuffles, onHint, onShuffle, onUndo, canUndo }) {
  const items = [
    { icon: Lightbulb, label: 'تلميح', count: hints, onClick: onHint, disabled: hints <= 0 },
    { icon: Shuffle, label: 'خلط', count: shuffles, onClick: onShuffle, disabled: shuffles <= 0 },
    { icon: Undo2, label: 'تراجع', count: null, onClick: onUndo, disabled: !canUndo },
  ];

  return (
    <div
      dir="rtl"
      className="flex flex-col gap-2 px-1.5"
      style={{ position: 'absolute', top: '50%', left: '4px', transform: 'translateY(-50%)', zIndex: 15 }}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={i}
            onClick={item.onClick}
            disabled={item.disabled}
            className="relative w-11 h-11 rounded-full bg-tamam-surface/85 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 border border-tamam-outline/25 focus-visible:ring-2 focus-visible:ring-tamam-green/40"
            aria-label={item.label}
            style={item.disabled ? undefined : { boxShadow: '0 0 12px rgba(137,219,120,0.15)' }}
          >
            <Icon size={17} className="text-tamam-green-bright" />
            {item.count !== null && item.count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-tamam-gold text-tamam-ink text-[8px] font-bold flex items-center justify-center border border-tamam-ink/40">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}