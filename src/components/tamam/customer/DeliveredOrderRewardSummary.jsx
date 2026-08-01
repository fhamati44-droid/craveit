const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function DeliveredOrderRewardSummary({ points, coupon, onRate, onReorder, onReport }) {
  return (
    <div className="space-y-3">
      <div className="bg-surface-container rounded-2xl p-4 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-2"><Icon name="celebration" className="text-primary text-3xl" /></div>
        <h2 className="text-xl font-bold">صحة وهنا!</h2>
        <p className="text-sm text-on-surface-variant">تم توصيل طلبك بنجاح.</p>
      </div>
      {points ? (
        <div className="flex items-center gap-3 bg-secondary-container/20 border border-secondary-container/40 rounded-2xl p-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-container/30 flex items-center justify-center flex-shrink-0"><Icon name="stars" className="text-on-secondary-container" /></div>
          <div><p className="font-bold text-sm">مبروك! أضفنا {points} نقطة لحسابك.</p><p className="text-[11px] text-on-surface-variant">رصيدك الحالي تم تحديثه.</p></div>
        </div>
      ) : null}
      {coupon ? (
        <div className="bg-gradient-to-l from-tertiary/15 to-primary/10 border border-tertiary/30 rounded-2xl p-4">
          <p className="text-[11px] text-tertiary font-bold mb-1">إلك مكافأة على طلبك</p>
          <p className="font-bold">خصم ₪{coupon.value} على طلبك الجاي</p>
          <div className="flex items-center justify-between mt-2 bg-surface-container/60 rounded-lg px-3 py-2">
            <span className="text-sm font-bold tracking-wider" dir="ltr">{coupon.code}</span>
            <button onClick={() => navigator.clipboard?.writeText(coupon.code)} className="text-primary text-xs font-bold flex items-center gap-1"><Icon name="content_copy" className="text-[14px]" />نسخ</button>
          </div>
          {coupon.min_order ? <p className="text-[11px] text-on-surface-variant mt-1">أدنى طلب ₪{coupon.min_order} · يصلح لكل المطاعم</p> : null}
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={onRate} className="h-11 bg-primary text-on-primary rounded-xl font-bold text-sm flex items-center justify-center gap-1"><Icon name="star" className="text-[16px]" />قيّم</button>
        <button onClick={onReorder} className="h-11 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm flex items-center justify-center gap-1 border border-outline-variant/30"><Icon name="replay" className="text-[16px]" />إعادة</button>
        <button onClick={onReport} className="h-11 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm flex items-center justify-center gap-1 border border-outline-variant/30"><Icon name="report" className="text-[16px]" />مشكلة</button>
      </div>
    </div>
  );
}