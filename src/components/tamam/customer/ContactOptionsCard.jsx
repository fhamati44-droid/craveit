const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

// status: current order status; meta: OrderCheckoutMeta; restaurantName optional
export default function ContactOptionsCard({ status, meta, orderNumber, deliveryRef, onSupport }) {
  const si = stageOrder(status);
  const courierAssigned = si >= 5; // courier_assigned
  const beforePickup = si < 6; // before picked_up
  const delivered = si >= 9;

  return (
    <div className="bg-surface-container rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">تواصل</h3>
      <div className="space-y-2">
        <Action icon="support_agent" label="تواصل مع TAMAM" desc="دعم في أي مرحلة" onClick={onSupport} always />
        {beforePickup && !delivered && (
          <Action icon="restaurant" label="تواصل مع المطعم" desc="قبل خروج الطلب مع المندوب" onClick={() => onSupport?.('restaurant')} />
        )}
        {courierAssigned && !delivered && (
          <Action icon="two_wheeler" label="تواصل مع المندوب" desc="مندوب التوصيل" onClick={() => onSupport?.('courier')} />
        )}
        {delivered && (
          <Action icon="report" label="بلّغ عن مشكلة بالتوصيل" desc="أبلغنا عن أي مشكلة" onClick={() => onSupport?.('report')} />
        )}
        {!courierAssigned && !delivered && <p className="text-[11px] text-on-surface-variant">لسه ما تم تعيين مندوب.</p>}
      </div>
    </div>
  );
}

function Action({ icon, label, desc, onClick, always }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-container-high border border-outline-variant/30 active:scale-[0.99] text-right">
      <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0"><Icon name={icon} className="text-primary" /></div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-[11px] text-on-surface-variant">{desc}</p>
      </div>
      <Icon name="chevron_left" className="text-on-surface-variant" />
    </button>
  );
}

import { stageIndex } from '@/lib/orderUtils';
function stageOrder(status) { return stageIndex(status); }