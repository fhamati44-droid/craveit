/** Selectable mood pill. */
export default function MoodChip({ icon = '✨', name, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${
        active
          ? 'bg-tamam-green text-tamam-ink border-tamam-green'
          : 'bg-tamam-surface text-tamam-text-muted border-tamam-outline/50'
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      {name}
    </button>
  );
}