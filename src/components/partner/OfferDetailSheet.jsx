import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { pauseOfferRequest, createSignal } from '@/lib/partnerApi';

const STATUS_LABEL = {
  active: 'شغّالة', scheduled: 'جاية', draft: 'جاهزة للمراجعة', paused: 'متوقفة',
  ended: 'منتهية', completed: 'مكتملة', cancelled: 'ملغية', failed: 'فاشلة',
};

export default function OfferDetailSheet({ open, offer, restaurantId, menuItems, onClose }) {
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!offer) return null;
  const o = offer.offer || offer;
  const items = offer.items || [];
  const guardrail = (offer.guardrails || [])[0];

  const run = async (fn) => {
    if (!reason.trim()) { setError('سبب مطلوب'); return; }
    setBusy(true); setError(null);
    try { await fn(); setReason(''); onClose?.(); }
    catch (e) { setError(e?.error === 'no_permission' ? 'ما عندك صلاحية' : 'صار خطأ'); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(ok) => !ok && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <div className="mb-3">
          <h2 className="font-bold text-base">{o.title}</h2>
          <span className="text-[11px] text-tamam-text-muted">{STATUS_LABEL[o.status] || o.status}</span>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          <Info label="النافذة الزمنية" value={o.start_at && o.end_at ? `${fmt(o.start_at)} ← ${fmt(o.end_at)}` : '—'} />
          {items.length > 0 && (
            <div className="bg-tamam-surface-low rounded-xl p-3">
              <p className="text-[11px] text-tamam-text-muted mb-1">الأصناف</p>
              {items.map((it) => (
                <div key={it.id} className="flex justify-between text-sm py-0.5">
                  <span>{it.meal_name_snapshot}{it.quantity_included ? ` ×${it.quantity_included}` : ''}</span>
                  {it.base_price_snapshot != null && <span>₪{Math.round(it.base_price_snapshot)}</span>}
                </div>
              ))}
            </div>
          )}
          {guardrail && (
            <div className="bg-tamam-surface-low rounded-xl p-3 text-sm space-y-1">
              <p className="text-[11px] text-tamam-text-muted">الحدود التجارية</p>
              <Row2 k="أقل سعر للزبون" v={guardrail.minimum_customer_offer_price != null ? `₪${guardrail.minimum_customer_offer_price}` : '—'} />
              <Row2 k="أقل صافي للمطعم" v={guardrail.minimum_restaurant_net != null ? `₪${guardrail.minimum_restaurant_net}` : '—'} />
              <Row2 k="السعر العادي" v={guardrail.normal_price != null ? `₪${guardrail.normal_price}` : '—'} />
            </div>
          )}
          <div>
            <Label className="text-[11px] text-tamam-text-muted mb-1 block">سبب الإيقاف/التبليغ</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="bg-tamam-surface-low border-tamam-outline/30 text-right" />
            {error && <p className="text-error text-xs mt-1">{error}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button variant="outline" disabled={busy} onClick={() => run(() => pauseOfferRequest(restaurantId, o.id, reason))} className="border-tamam-outline/40 text-tamam-text">إيقاف مؤقت</Button>
          <Button variant="outline" disabled={busy} onClick={() => run(() => createSignal(restaurantId, { type: 'sold_out', menu_item_id: items[0]?.id, reason }))} className="border-tamam-outline/40 text-tamam-text">تبليغ خلص</Button>
          <Button onClick={() => { onClose?.(); navigate('/partner/offers/request'); }} className="col-span-2 bg-tamam-surface-high text-tamam-text hover:bg-tamam-surface-highest">اطلب فكرة عرض ثانية</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between bg-tamam-surface-low rounded-xl px-3 py-2 text-sm">
      <span className="text-tamam-text-muted text-[11px]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
function Row2({ k, v }) { return <div className="flex justify-between"><span className="text-tamam-text-muted">{k}</span><span>{v}</span></div>; }
function fmt(iso) { try { return new Date(iso).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } }