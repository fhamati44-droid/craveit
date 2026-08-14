import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateOrderStatus } from '@/lib/partnerApi';

// Allowed partner transitions per current status.
const ACTIONS = {
  pending: [{ to: 'accepted', label: 'قبول الطلب', tone: 'green' }, { to: 'preparing', label: 'ابدأ التحضير', tone: 'green' }, { to: 'cancelled', label: 'رفض', tone: 'red' }],
  accepted: [{ to: 'preparing', label: 'ابدأ التحضير', tone: 'green' }, { to: 'cancelled', label: 'إلغاء', tone: 'red' }],
  preparing: [{ to: 'ready', label: 'الطلب جاهز', tone: 'green' }],
  ready: [{ to: 'delivered', label: 'تم التسليم', tone: 'green' }, { to: 'picked_up', label: 'استُلم', tone: 'green' }],
};

export default function OrderDetailSheet({ open, order, restaurantId, onClose, onChanged }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!order) return null;
  const o = order.order || order;
  const items = o.items_preview || [];
  const needsReason = (to) => to === 'cancelled';
  const actions = ACTIONS[o.status] || [];

  const transition = async (to) => {
    if (needsReason(to) && !reason.trim()) { setError('سبب مطلوب للرفض/الإلغاء'); return; }
    setBusy(true); setError(null);
    try {
      await updateOrderStatus(restaurantId, o.id, to, reason);
      setReason('');
      onChanged?.();
      onClose?.();
    } catch (e) {
      setError(e?.error === 'invalid_transition' ? 'هذه النقلة غير مسموحة' : e?.error === 'reason_required' ? 'سبب مطلوب' : 'صار خطأ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(ok) => !ok && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <div className="mb-3">
          <h2 className="font-bold text-base">{o.parent_order_number || `#${o.id?.slice(-6)}`}</h2>
          <p className="text-[11px] text-tamam-text-muted">{o.customer_name || 'زبون'} · {o.fulfillment || 'توصيل'}</p>
        </div>
        <div className="space-y-2 max-h-[58vh] overflow-y-auto">
          <div className="bg-tamam-surface-low rounded-xl p-3">
            <p className="text-[11px] text-tamam-text-muted mb-1">الأصناف</p>
            {items.length ? items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm py-0.5">
                <span>{it.name} ×{it.quantity}</span>
              </div>
            )) : <p className="text-sm text-tamam-text-muted">—</p>}
          </div>
          {o.customer_notes && (
            <div className="bg-tamam-surface-low rounded-xl p-3">
              <p className="text-[11px] text-tamam-text-muted mb-0.5">ملاحظات الزبون</p>
              <p className="text-sm">{o.customer_notes}</p>
            </div>
          )}
          <div className="flex justify-between bg-tamam-surface-low rounded-xl px-3 py-2 text-sm">
            <span className="text-tamam-text-muted text-[11px]">الإجمالي</span>
            <span className="font-bold">₪{Math.round(o.total || 0)}</span>
          </div>
          {actions.some((a) => needsReason(a.to)) && (
            <div>
              <Label className="text-[11px] text-tamam-text-muted mb-1 block">سبب الرفض/الإلغاء</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="bg-tamam-surface-low border-tamam-outline/30 text-right" />
            </div>
          )}
          {error && <p className="text-error text-xs">{error}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {actions.map((a) => (
            <Button
              key={a.to}
              disabled={busy}
              onClick={() => transition(a.to)}
              className={a.tone === 'red'
                ? 'col-span-2 bg-error/90 text-on-error hover:bg-error'
                : 'bg-tamam-green text-tamam-ink hover:bg-tamam-green-dark'}
            >
              {a.label}
            </Button>
          ))}
          {actions.length === 0 && <p className="col-span-2 text-center text-tamam-text-muted text-sm py-2">لا إجراءات متاحة لهذه الحالة.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}