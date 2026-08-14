import { useState } from 'react';

// Shared primitives for the restaurant-owner quick-action flows.
// Mobile-first, RTL, TAMAM dark identity. 48px+ touch targets, 16px inputs.

export function FlowHeader({ title, subtitle }) {
  return (
    <div className="px-1">
      <h3 className="font-bold text-tamam-text text-base leading-snug">{title}</h3>
      {subtitle && <p className="text-tamam-text-muted text-xs mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function OptionButton({ active, onClick, icon, label, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-right min-h-[56px] active:scale-[0.99] transition-transform ${active ? 'border-tamam-green bg-tamam-green/10' : 'border-tamam-outline/30 bg-tamam-surface-low'}`}
    >
      <span className={`material-symbols-outlined text-[22px] shrink-0 ${active ? 'text-tamam-green-bright' : 'text-tamam-text-muted'}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${active ? 'text-tamam-green-bright' : 'text-tamam-text'}`}>{label}</p>
        {desc && <p className="text-[11px] text-tamam-text-muted leading-snug">{desc}</p>}
      </div>
      {active && <span className="material-symbols-outlined text-tamam-green-bright text-[20px] shrink-0">check_circle</span>}
    </button>
  );
}

export function ItemPicker({ items, selected, onSelect, multi = false }) {
  const [q, setQ] = useState('');
  const list = (items || []).filter((i) => i.available !== false && (!q || (i.name || '').includes(q)));
  const isSel = (id) => (multi ? (selected || []).includes(id) : selected === id);
  const toggle = (id) => {
    if (multi) onSelect(isSel(id) ? (selected || []).filter((x) => x !== id) : [...(selected || []), id]);
    else onSelect(id);
  };
  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث عن صنف…"
        className="w-full bg-tamam-surface-low border border-tamam-outline/30 rounded-xl px-3 py-2.5 text-base outline-none text-tamam-text placeholder:text-tamam-text-muted"
      />
      <div className="max-h-[40vh] overflow-y-auto space-y-1.5 pr-0.5">
        {list.length === 0 && <p className="text-tamam-text-muted text-xs text-center py-4">ما في أصناف متوفرة.</p>}
        {list.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => toggle(it.id)}
            className={`w-full flex items-center gap-2 p-2.5 rounded-xl border text-right ${isSel(it.id) ? 'border-tamam-green bg-tamam-green/10' : 'border-tamam-outline/30 bg-tamam-surface-low'}`}
          >
            <div className="w-9 h-9 rounded-lg bg-tamam-surface-high flex items-center justify-center shrink-0 overflow-hidden">
              {it.primary_image ? <img src={it.primary_image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" /> : <span className="material-symbols-outlined text-tamam-text-muted text-[18px]">restaurant</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-tamam-text truncate">{it.name || '—'}</p>
              <p className="text-[11px] text-tamam-text-muted">₪{it.price}{it.restaurant_category_name ? ` · ${it.restaurant_category_name}` : ''}</p>
            </div>
            {isSel(it.id) && <span className="material-symbols-outlined text-tamam-green-bright text-[20px] shrink-0">check_circle</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-tamam-text-muted text-xs">{label}</span>
      <span className="text-sm font-bold text-tamam-text text-left">{value}</span>
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, loading, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex-1 h-[52px] rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50 ${danger ? 'bg-tamam-error text-tamam-ink' : 'bg-tamam-green text-tamam-ink'}`}
    >
      {loading && <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 h-[52px] rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function ErrorLine({ children }) {
  return <p className="text-tamam-error text-xs font-semibold text-center">{children}</p>;
}

export function TimeField({ label, value, onChange }) {
  return (
    <div className="flex-1">
      <label className="text-[11px] text-tamam-text-muted mb-1 block">{label}</label>
      <input
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-tamam-surface-low border border-tamam-outline/30 rounded-xl px-3 py-2.5 text-base outline-none text-tamam-text"
      />
    </div>
  );
}

export function NumberField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[11px] text-tamam-text-muted mb-1 block">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-tamam-surface-low border border-tamam-outline/30 rounded-xl px-3 py-3 text-base outline-none text-tamam-text placeholder:text-tamam-text-muted"
      />
    </div>
  );
}

export function DoneView({ title, sub, onClose, onCloseLabel = 'تم', onUndo, undoLabel, undoing }) {
  return (
    <div className="text-center space-y-4 py-3">
      <div className="w-14 h-14 rounded-full bg-tamam-green/15 flex items-center justify-center mx-auto">
        <span className="material-symbols-outlined text-tamam-green-bright text-[32px]">check_circle</span>
      </div>
      <div>
        <h3 className="font-bold text-tamam-text text-base">{title}</h3>
        <p className="text-tamam-text-muted text-sm leading-snug mt-1">{sub}</p>
      </div>
      <div className="flex gap-2">
        {onUndo && <SecondaryButton onClick={onUndo} disabled={undoing}>{undoing ? 'جاري…' : undoLabel}</SecondaryButton>}
        <PrimaryButton onClick={onClose}>{onCloseLabel}</PrimaryButton>
      </div>
    </div>
  );
}