export default function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-tamam-green-bright' : 'bg-tamam-surface-highest'} ${disabled ? 'opacity-50' : ''}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-tamam-cream shadow transition-all ${checked ? 'left-0.5' : 'right-0.5'}`} />
    </button>
  );
}