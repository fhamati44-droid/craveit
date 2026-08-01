import { ROUTE_OPTIONS } from '@/lib/homepageApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function InternalRouteSelector({ routeKey, routeParams = {}, onChange }) {
  const opt = ROUTE_OPTIONS.find((r) => r.key === routeKey) || ROUTE_OPTIONS.find((r) => r.key === 'custom');
  const isCustom = routeKey === 'custom';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {ROUTE_OPTIONS.map((r) => (
          <button key={r.key} type="button" onClick={() => onChange({ routeKey: r.key, routeParams: r.key === 'custom' ? routeParams : {} })} className={`px-3 py-2.5 rounded-xl text-sm font-semibold border text-right flex items-center gap-2 ${routeKey === r.key ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>
            <Icon name="link" className="text-[16px]" />
            <span>{r.label}</span>
          </button>
        ))}
      </div>
      {isCustom && (
        <input value={routeParams?.path || ''} onChange={(e) => onChange({ routeKey: 'custom', routeParams: { path: e.target.value } })} placeholder="/مسار-مخصص" className="w-full bg-surface-container rounded-xl p-3 text-sm outline-none border border-outline-variant/30" dir="ltr" />
      )}
      {opt && !isCustom && opt.path && (
        <p className="text-[11px] text-on-surface-variant flex items-center gap-1"><Icon name="arrow_forward" className="text-[14px]" /><span dir="ltr">{opt.path}</span></p>
      )}
    </div>
  );
}

export function resolveRoute(routeKey, routeParams = {}) {
  const opt = ROUTE_OPTIONS.find((r) => r.key === routeKey);
  if (routeKey === 'custom') return routeParams?.path || '';
  return opt?.path || '';
}