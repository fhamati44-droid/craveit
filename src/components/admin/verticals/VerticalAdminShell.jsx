import { Link } from "react-router-dom";

/**
 * Shared admin shell for the Menu Vertical strategy screens.
 * Renders a back link, title, subtitle, and a right-side actions slot.
 */
export default function VerticalAdminShell({ title, subtitle, backTo = "/admin/verticals", children, actions }) {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6" dir="rtl">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={backTo} className="shrink-0 h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted" aria-label="رجوع">
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/** Small labeled field wrapper. */
export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-muted-foreground mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground mt-0.5">{hint}</span>}
    </label>
  );
}

/** Pill toggle for multi-select enum arrays (tiers, dayparts, …). */
export function ChipMulti({ options, value = [], onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition ${value.includes(o) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}