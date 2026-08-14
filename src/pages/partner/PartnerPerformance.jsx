import { useState, useEffect } from 'react';
import { usePartner } from '@/lib/partnerContext';
import { getPerformance } from '@/lib/partnerApi';

export default function PartnerPerformance() {
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!rid) return;
    getPerformance(rid).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, [rid]);

  if (loading) return <div className="p-4"><div className="h-32 skeleton-t rounded-2xl" /></div>;
  if (error || !data?.has_data) {
    return (
      <div className="p-6 text-center">
        <h1 className="font-bold text-lg mb-2">الأداء</h1>
        <p className="text-tamam-text-muted text-sm leading-relaxed">لسه ما في بيانات كافية لعرض الأداء.<br />رح تظهر النتائج بعد تنفيذ طلبات فعلية عبر TAMAM.</p>
      </div>
    );
  }
  const w = data.week;
  return (
    <div className="p-4 space-y-3">
      <h1 className="font-bold text-lg">الأداء — آخر 7 أيام</h1>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="طلبات مكتملة" value={w.completed_orders} />
        <Stat label="طلبات ملغاة" value={w.cancelled_orders} />
        <Stat label="إيرادات TAMAM" value={`₪${w.revenue}`} />
        <Stat label="موثوقية التوصيل" value={w.fulfillment_reliability != null ? `${w.fulfillment_reliability}%` : '—'} />
      </div>
      <p className="text-[11px] text-tamam-text-muted">البيانات مبنية على طلبات TAMAM الفعلية فقط.</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-4">
      <p className="text-[11px] text-tamam-text-muted">{label}</p>
      <p className="font-bold text-xl mt-1">{value}</p>
    </div>
  );
}