const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function RestaurantSummaryCard({ restaurant, categoryNames, onEdit }) {
  const r = restaurant || {};
  const delivery = r.delivery_time_min || r.delivery_time_max
    ? `توصيل ${r.delivery_time_min || ''}${r.delivery_time_max ? `-${r.delivery_time_max}` : ''} دقيقة`
    : null;
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e8efeb] flex flex-col sm:flex-row gap-6 items-start relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#1c6d17]/5 rounded-bl-full -z-10" />
      <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#ebefeb] shrink-0 border border-[#e8efeb] flex items-center justify-center">
        {r.logo_url ? <img src={r.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl">🏪</span>}
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-semibold text-[#181d1a]">{r.name_ar || r.name}</h2>
          <span className="px-2 py-0.5 rounded-md bg-[#a2f881]/50 text-[#237408] text-xs flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${r.active ? 'bg-[#1c6d00]' : 'bg-[#ba1a1a]'}`} /> {r.active ? 'فعّال' : 'معطّل'}
          </span>
          {r.accepts_orders && <span className="px-2 py-0.5 rounded-md bg-[#1c6d17]/10 text-[#1c6d17] text-xs">يستقبل طلبات</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-[#40493c]">
          {categoryNames && <div className="flex items-center gap-1"><Icon name="restaurant_menu" className="text-[18px]" /><span>{categoryNames}</span></div>}
          {r.phone && <div className="flex items-center gap-1"><Icon name="call" className="text-[18px]" /><span dir="ltr">{r.phone}</span></div>}
          {delivery && <div className="flex items-center gap-1"><Icon name="two_wheeler" className="text-[18px]" /><span>{delivery}</span></div>}
          {r.delivery_fee != null && <div className="flex items-center gap-1"><Icon name="payments" className="text-[18px]" /><span>رسوم ₪{r.delivery_fee}</span></div>}
        </div>
      </div>
      <button onClick={onEdit} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[#40493c] hover:bg-[#ebefeb] transition-colors" title="تعديل بيانات المطعم">
        <Icon name="edit" />
      </button>
    </div>
  );
}