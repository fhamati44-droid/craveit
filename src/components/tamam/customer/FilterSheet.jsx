const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function FilterSheet({ open, onClose, title, options, selected, onSelect, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute bottom-0 left-0 w-full max-w-[480px] mx-auto bg-surface-container-high rounded-t-[32px] p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center"><Icon name="close" /></button>
        </div>
        <div className="space-y-2 max-h-[55vh] overflow-auto no-scrollbar">
          {options.map(o => {
            const on = selected === o.value;
            return (
              <button key={String(o.value)} onClick={() => { onSelect(o.value); onClose && onClose(); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${on ? 'bg-primary/10 border-primary/30' : 'bg-surface-container border-outline-variant/30'}`}>
                <span className="flex items-center gap-2 text-right"><Icon name={on ? 'check_circle' : 'circle'} className={on ? 'text-primary' : 'text-on-surface-variant'} /><span className="font-medium text-sm">{o.label}</span></span>
                {o.sub && <span className="text-xs text-on-surface-variant">{o.sub}</span>}
              </button>
            );
          })}
        </div>
        {footer}
      </div>
    </div>
  );
}