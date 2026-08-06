const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function MenuStatsCard({ stats }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e8efeb] grid grid-cols-2 gap-4">
      <div className="col-span-2 pb-2 border-b border-[#e8efeb] flex items-center gap-1">
        <Icon name="monitoring" className="text-[#40493c]" />
        <h3 className="text-lg font-semibold text-[#181d1a]">إحصائيات المينيو</h3>
      </div>
      <Stat n={stats.total} label="وجبة بالمينيو" valueCls="text-[#181d1a]" />
      <Stat n={stats.mapped} label="مربوطة مع TAMAM" valueCls="text-[#1c6d17]" />
      <Stat n={stats.unmapped} label="بحاجة للربط" valueCls="text-[#ba1a1a]" labelCls="text-[#ba1a1a]" />
      <Stat n={stats.noImage} label="بدون صور" valueCls="text-[#707a6b]" />
      <Stat n={stats.unavailable} label="غير متوفرة" valueCls="text-[#707a6b]" />
    </div>
  );
}

function Stat({ n, label, valueCls, labelCls }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-4xl font-bold ${valueCls}`}>{n}</span>
      <span className={`text-xs ${labelCls || 'text-[#40493c]'}`}>{label}</span>
    </div>
  );
}