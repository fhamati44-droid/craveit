import { STAGES, stageIndex } from '@/lib/orderUtils';
const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function OrderStatusTimeline({ status }) {
  const active = stageIndex(status);
  return (
    <div className="bg-surface-container rounded-2xl p-4">
      <div className="flex flex-col gap-0">
        {STAGES.map((s, i) => {
          const done = i < active;
          const current = i === active;
          const last = i === STAGES.length - 1;
          return (
            <div key={s.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${done ? 'bg-primary text-on-primary' : current ? 'bg-primary/20 text-primary ring-4 ring-primary/10' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  <Icon name={done ? 'check' : s.icon} className="text-[18px]" />
                </div>
                {!last && <div className={`w-0.5 flex-1 min-h-[24px] ${done ? 'bg-primary' : 'bg-outline-variant/40'}`} />}
              </div>
              <div className={`pb-4 ${current ? '' : 'opacity-70'}`}>
                <p className={`font-bold text-sm ${current ? 'text-primary' : 'text-on-surface'}`}>{s.label}</p>
                {(done || current) && <p className="text-[12px] text-on-surface-variant leading-snug mt-0.5">{s.desc}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}