import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getPartnerOrder, updateOrderStatus } from '@/lib/partnerApi';
import PartnerErrorState from '@/components/partner/PartnerErrorState';
import { Textarea } from '@/components/ui/textarea';

const STATUS_LABEL = {
  pending: { label: 'بانتظار القبول', cls: 'bg-tamam-gold-dark/30 text-tamam-gold' },
  accepted: { label: 'مقبول', cls: 'bg-tamam-green/15 text-tamam-green-bright' },
  preparing: { label: 'قيد التحضير', cls: 'bg-tamam-green/20 text-tamam-green-bright' },
  ready: { label: 'جاهز', cls: 'bg-tamam-green-bright text-tamam-ink' },
  picked_up: { label: 'استُلم', cls: 'bg-tamam-surface-high text-tamam-text-muted' },
  on_the_way: { label: 'بالطريق', cls: 'bg-tamam-surface-high text-tamam-text-muted' },
  delivered: { label: 'تم التسليم', cls: 'bg-tamam-surface-high text-tamam-text-muted' },
  cancelled: { label: 'ملغى', cls: 'bg-tamam-error/20 text-tamam-error' },
  rejected: { label: 'مرفوض', cls: 'bg-tamam-error/20 text-tamam-error' },
};

const FULFILLMENT = {
  delivery: { icon: 'two_wheeler', label: 'توصيل' },
  pickup: { icon: 'storefront', label: 'استلام من الفرع' },
  dinein: { icon: 'restaurant', label: 'محلي' },
  dine_in: { icon: 'restaurant', label: 'محلي' },
};

const ACTIONS = {
  pending: [{ to: 'accepted', label: 'اقبل الطلب', icon: 'check' }, { to: 'cancelled', label: 'رفض', icon: 'close', danger: true }],
  accepted: [{ to: 'preparing', label: 'ابدأ التحضير', icon: 'play_arrow' }],
  preparing: [{ to: 'ready', label: 'جاهز', icon: 'check_circle' }],
  ready: [{ to: 'delivered', label: 'تم التسليم', icon: 'check' }],
};

export default function PartnerOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState(null);

  const load = () => {
    if (!rid || !orderId) return;
    setLoading(true); setError(false);
    getPartnerOrder(rid, orderId).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid, orderId]);

  if (loading) return <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton-t rounded-2xl" />)}</div>;
  if (error) return <PartnerErrorState variant="error" onRetry={load} onBack={() => navigate('/partner/orders')} />;
  if (!data?.order) return <PartnerErrorState variant="not_found" onBack={() => navigate('/partner/orders')} />;

  const o = data.order;
  const items = data.items || [];
  const ff = FULFILLMENT[o.fulfillment] || FULFILLMENT.delivery;
  const st = STATUS_LABEL[o.status] || { label: o.status, cls: 'bg-tamam-surface-high text-tamam-text-muted' };
  const actions = ACTIONS[o.status] || [];
  const needsReason = actions.some((a) => a.danger);
  const hasAllergy = /حساس|allerg/i.test(o.customer_notes || '');
  const readyBy = o.preparation_time && o.created_date ? new Date(new Date(o.created_date).getTime() + (o.preparation_time || 0) * 60000) : null;

  const transition = async (to) => {
    if (to === 'cancelled' && !reason.trim()) { setActionError('سبب الرفض مطلوب'); return; }
    setBusy(true); setActionError(null);
    try { await updateOrderStatus(rid, o.id, to, reason); load(); } catch (e) { setActionError(e?.error === 'invalid_transition' ? 'هذه النقلة غير مسموحة' : 'صار خطأ'); }
    finally { setBusy(false); }
  };

  return (
    <div className="pb-28">
      <div className="px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate('/partner/orders')} className="w-9 h-9 flex items-center justify-center"><span className="material-symbols-outlined text-tamam-text">chevron_right</span></button>
        <h1 className="font-bold text-lg text-tamam-text">تفاصيل الطلب</h1>
      </div>

      <div className="px-4 space-y-3">
        <div className="bg-tamam-surface rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${st.cls}`}><span className="material-symbols-outlined text-[14px]">hourglass_top</span>{st.label}</span>
            <span className="font-bold text-xl text-tamam-text">#{o.parent_order_number || o.id?.slice(-6)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div><span className="text-tamam-text-muted text-[11px] block">وقت الطلب</span><span className="text-tamam-text text-sm">{o.created_date ? new Date(o.created_date).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>
            <div className="flex items-center gap-1 bg-tamam-surface-high px-2 py-1 rounded"><span className="material-symbols-outlined text-[16px] text-tamam-text">{ff.icon}</span><span className="text-[11px] text-tamam-text">{ff.label}</span></div>
          </div>
          {readyBy && <div className="flex items-center gap-1 text-[11px] text-tamam-text-muted"><span className="material-symbols-outlined text-[14px]">schedule</span>موعد التسليم المتوقع: {readyBy.toLocaleString('ar', { hour: '2-digit', minute: '2-digit' })}</div>}
        </div>

        {o.offer_title && (
          <div className="flex items-center gap-2 bg-tamam-green/10 text-tamam-green-bright text-xs px-3 py-2 rounded-xl"><span className="material-symbols-outlined text-[16px]">sell</span>عرض: {o.offer_title}</div>
        )}

        <div className="bg-tamam-surface rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-tamam-text-muted text-[18px]">receipt_long</span><h3 className="font-bold text-sm text-tamam-text">تفاصيل الطلب</h3></div>
          {items.length === 0 ? <p className="text-tamam-text-muted text-sm">{o.items_count || 0} صنف</p> : (
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex justify-between items-start gap-2 py-1 border-b border-tamam-outline/20 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-tamam-green-bright bg-tamam-green/15 w-7 h-7 flex items-center justify-center rounded text-xs font-bold shrink-0">{it.quantity || 1}x</span>
                      <span className="text-sm text-tamam-text truncate">{it.name}</span>
                    </div>
                    {Array.isArray(it.modifiers) && it.modifiers.map((m, mi) => (
                      <div key={mi} className="text-[11px] text-tamam-text-muted pr-9 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">add</span>{typeof m === 'string' ? m : (m.name || m.label || '')}</div>
                    ))}
                  </div>
                  {it.price != null && <span className="text-sm text-tamam-text font-medium shrink-0" dir="ltr">{Math.round((it.price || 0) * (it.quantity || 1))} ₪</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {o.customer_notes && (
          <div className={`rounded-2xl p-4 ${hasAllergy ? 'bg-tamam-gold-dark/20 border border-tamam-gold/40' : 'bg-tamam-error/10'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`material-symbols-outlined ${hasAllergy ? 'text-tamam-gold' : 'text-tamam-error'}`}>{hasAllergy ? 'warning' : 'notes'}</span>
              <h3 className="font-bold text-sm text-tamam-text">{hasAllergy ? 'تنبيه حساسية' : 'ملاحظة العميل'}</h3>
            </div>
            <p className="text-sm text-tamam-text">{o.customer_notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center bg-tamam-surface rounded-2xl px-4 py-3">
          <span className="text-tamam-text-muted text-sm">الإجمالي</span>
          <span className="font-bold text-lg text-tamam-text" dir="ltr">{Math.round(o.total || 0)} ₪</span>
        </div>

        {needsReason && (
          <div>
            <label className="text-[11px] text-tamam-text-muted mb-1 block">سبب الرفض</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="bg-tamam-surface border-tamam-outline/30 text-right" />
          </div>
        )}
        {actionError && <p className="text-tamam-error text-xs">{actionError}</p>}
        {actions.length > 0 ? (
          <div className="space-y-2">
            {actions.map((a) => (
              <button key={a.to} onClick={() => transition(a.to)} disabled={busy} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${a.danger ? 'bg-tamam-error/15 text-tamam-error border border-tamam-error/40' : 'bg-tamam-green-bright text-tamam-ink'}`}>
                <span className="material-symbols-outlined text-[20px]">{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-tamam-text-muted text-sm py-2">ما في إجراءات متاحة لهذه الحالة.</p>
        )}
      </div>
    </div>
  );
}