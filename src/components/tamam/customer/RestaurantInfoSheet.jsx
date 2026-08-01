const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function RestaurantInfoSheet({ restaurant, open, onClose }) {
  if (!open || !restaurant) return null;
  const rows = [
    { icon: 'description', label: 'الوصف', value: restaurant.description_ar || restaurant.description },
    { icon: 'location_on', label: 'العنوان', value: restaurant.address },
    { icon: 'schedule', label: 'ساعات العمل', value: restaurant.opening_hours },
    { icon: 'phone', label: 'الهاتف', value: restaurant.phone },
    { icon: 'delivery_dining', label: 'رسوم التوصيل', value: restaurant.delivery_fee != null ? (restaurant.delivery_fee === 0 ? 'مجاني' : `₪${restaurant.delivery_fee}`) : null },
    { icon: 'payments', label: 'الحد الأدنى للطلب', value: restaurant.min_order != null ? `₪${restaurant.min_order}` : null },
    { icon: 'storefront', label: 'الاستلام من المطعم', value: restaurant.pickup_available ? 'متاح' : null },
  ].filter(r => r.value != null && r.value !== '');

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="absolute bottom-0 inset-x-0 bg-surface-container-high rounded-t-[28px] p-6 max-w-[480px] mx-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-5" />
        <h3 className="text-lg font-bold mb-4">معلومات المطعم</h3>
        <div className="space-y-1 max-h-[60vh] overflow-auto">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-white/5">
              <Icon name={r.icon} className="text-primary text-xl mt-0.5" />
              <div className="flex-1">
                <div className="text-[11px] text-on-surface-variant">{r.label}</div>
                <div className="text-sm text-on-surface">{r.value}</div>
              </div>
            </div>
          ))}
          {!rows.length && <p className="text-on-surface-variant text-sm">لا توجد معلومات إضافية متاحة.</p>}
        </div>
        <button onClick={onClose} className="w-full mt-6 h-12 bg-primary text-on-primary rounded-2xl font-bold">إغلاق</button>
      </div>
    </div>
  );
}