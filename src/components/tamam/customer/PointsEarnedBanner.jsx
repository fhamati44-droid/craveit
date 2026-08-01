const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function PointsEarnedBanner({ points, pending = true }) {
  if (!points) return null;
  return (
    <div className="flex items-center gap-3 bg-secondary-container/20 border border-secondary-container/40 rounded-2xl p-3">
      <div className="w-10 h-10 rounded-xl bg-secondary-container/30 flex items-center justify-center flex-shrink-0"><Icon name="stars" className="text-on-secondary-container" /></div>
      <div>
        <p className="font-bold text-sm text-on-secondary-container">{pending ? `بعد توصيل الطلب رح يضاف لحسابك +${points} نقطة.` : `مبروك! أضفنا ${points} نقطة لحسابك.`}</p>
        {!pending && <p className="text-[11px] text-on-surface-variant">رصيدك الحالي تم تحديثه.</p>}
      </div>
    </div>
  );
}