import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroupDeal, getGroupDealItems, getGroupDealThresholds, getGroupDealParticipations, getGroupDealAudit, computeDealStatus, STATUS_LABELS, PAYMENT_MODEL_LABELS, COUNTING_LABELS, sortTiers, currentTier, nextTier, transitionGroupDeal, finalizeGroupDeal, duplicateGroupDeal } from '@/lib/groupDealApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function GroupDealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [items, setItems] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [parts, setParts] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [, tick] = useState(0);

  const load = async () => {
    try {
      const [d, its, ths, ps, au] = await Promise.all([
        getGroupDeal(dealId),
        getGroupDealItems(dealId),
        getGroupDealThresholds(dealId),
        getGroupDealParticipations(dealId),
        getGroupDealAudit(dealId).catch(() => []),
      ]);
      setDeal(d);
      setItems(its || []);
      setThresholds(ths || []);
      setParts(ps || []);
      setAudit(au || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, [dealId]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!deal) return <div className="text-center py-16"><p className="text-on-surface-variant">العرض غير موجود</p></div>;

  const activeParts = parts.filter((p) => p.participation_status !== 'cancelled');
  const participants = new Set(activeParts.map((p) => p.customer_id || p.phone || p.guest_session_id || p.id)).size;
  const qty = activeParts.reduce((s, p) => s + (p.quantity || 0), 0);
  const cur = currentTier(thresholds, participants, qty, deal.counting_method);
  const next = nextTier(thresholds, participants, qty, deal.counting_method);
  const revenueReserved = activeParts.reduce((s, p) => s + (p.joined_price || 0) * (p.quantity || 1), 0);
  const expectedFinal = cur ? cur.price * qty : 0;
  const ordersCreated = activeParts.filter((p) => p.order_id).length;
  const failedPayments = activeParts.filter((p) => p.payment_status === 'released' || p.payment_status === 'refunded').length;
  const invRem = deal.total_inventory ? Math.max(0, deal.total_inventory - qty) : '—';
  const endMs = deal.end_at ? new Date(deal.end_at).getTime() : 0;
  const remaining = endMs > 0 ? Math.max(0, endMs - Date.now()) : 0;
  const status = computeDealStatus(deal);

  const act = async (to, label) => {
    if (!confirm(`${label}؟`)) return;
    await transitionGroupDeal(dealId, to, '');
    load();
  };
  const onFinalize = async () => {
    if (!confirm('تثبيت العرض؟ رح يُحسب السعر النهائي وتُنشأ الطلبات.')) return;
    setFinalizing(true);
    try { await finalizeGroupDeal(dealId, ''); alert('تم تثبيت العرض'); load(); }
    catch (e) { alert(e.message || 'تعذّر التثبيت'); }
    finally { setFinalizing(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/group-deals')} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center"><Icon name="arrow_forward" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{deal.title}</h1>
          <p className="text-xs text-on-surface-variant truncate">{deal.restaurant_name_snapshot} · {STATUS_LABELS[status]}</p>
        </div>
        <button onClick={() => navigate(`/admin/group-deals/${dealId}/edit`)} className="px-3 py-2 rounded-full bg-surface-container text-sm font-semibold flex items-center gap-1"><Icon name="edit" className="text-[16px]" /> تعديل</button>
      </div>

      {deal.hero_image && <img src={deal.hero_image} alt="" className="w-full h-40 object-cover rounded-2xl" />}

      {/* Live stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="المشتركون" value={participants} icon="groups" />
        <Stat label="إجمالي الكمية" value={qty} icon="inventory_2" />
        <Stat label="المستوى الحالي" value={cur ? `₪${Math.round(cur.price)}` : '—'} icon="price_change" />
        <Stat label="المستوى التالي" value={next ? `${next.min_participants} → ₪${Math.round(next.price)}` : 'أفضل سعر'} icon="trending_down" />
        <Stat label="الدخل المحجوز" value={`₪${Math.round(revenueReserved)}`} icon="account_balance_wallet" />
        <Stat label="الدخل المتوقع" value={`₪${Math.round(expectedFinal)}`} icon="payments" />
        <Stat label="طلبات أُنشئت" value={ordersCreated} icon="receipt_long" />
        <Stat label="مخزون متبقٍ" value={invRem} icon="inventory" />
        <Stat label="مدفوعات معكوسة" value={failedPayments} icon="error" />
        <Stat label="الوقت المتبقي" value={fmtDur(remaining)} icon="schedule" />
      </div>

      {/* Thresholds */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4">
        <h3 className="font-bold text-sm mb-3">مستويات السعر</h3>
        <div className="space-y-2">
          {sortTiers(thresholds).map((t, i) => {
            const reached = participants >= (t.min_participants || 0);
            return (
              <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 ${reached ? 'bg-primary/15' : 'bg-surface-container-high'}`}>
                <span className="text-sm">{t.label || `مستوى ${i + 1}`} · {t.min_participants} مشترك</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">₪{Math.round(t.price)}</span>
                  <span className="text-[11px] text-on-surface-variant">{t.discount_percentage || 0}%</span>
                  {t.is_best_tier && <span className="text-[10px] bg-tertiary/20 text-tertiary px-1.5 py-0.5 rounded-full">نهائي</span>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-on-surface-variant mt-2">طريقة الاحتساب: {COUNTING_LABELS[deal.counting_method]} · الدفع: {PAYMENT_MODEL_LABELS[deal.payment_model]}</p>
      </div>

      {/* Items */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4">
        <h3 className="font-bold text-sm mb-3">محتويات العرض</h3>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">{it.image_snapshot ? <img src={it.image_snapshot} alt="" className="w-full h-full object-cover" /> : null}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{it.meal_name_snapshot}</p><p className="text-[11px] text-on-surface-variant">معرّف الوجبة: {it.meal_id} · ₪{Math.round(it.base_price_snapshot || 0)} · ×{it.quantity_included}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4">
        <h3 className="font-bold text-sm mb-3">المشتركون ({parts.length})</h3>
        {parts.length === 0 ? <p className="text-sm text-on-surface-variant">لا يوجد مشتركون بعد.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] text-on-surface-variant text-right">
                <th className="py-1 font-normal">العميل</th><th className="py-1 font-normal">الكمية</th><th className="py-1 font-normal">سعر الانضمام</th><th className="py-1 font-normal">السعر المتوقع</th><th className="py-1 font-normal">الدفع</th><th className="py-1 font-normal">الحالة</th><th className="py-1 font-normal">الطلب</th>
              </tr></thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id} className="border-t border-outline-variant/20">
                    <td className="py-2">{p.name || p.phone || 'ضيف'}</td>
                    <td className="py-2">{p.quantity}</td>
                    <td className="py-2">₪{Math.round(p.joined_price || 0)}</td>
                    <td className="py-2">{cur ? `₪${Math.round(cur.price)}` : '—'}</td>
                    <td className="py-2 text-[11px]">{p.payment_status}</td>
                    <td className="py-2 text-[11px]">{p.participation_status}</td>
                    <td className="py-2">{p.order_id ? <button onClick={() => navigate(`/orders/${p.order_id}`)} className="text-primary underline">#{p.order_id}</button> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {status === 'active' && <button onClick={() => act('paused', 'إيقاف العرض')} className="px-4 py-2.5 rounded-full bg-surface-container-high font-semibold text-sm">إيقاف</button>}
        {status === 'paused' && <button onClick={() => act('active', 'استئناف العرض')} className="px-4 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-sm">استئناف</button>}
        {['active', 'paused', 'scheduled'].includes(status) && <button onClick={() => act('cancelled', 'إلغاء العرض')} className="px-4 py-2.5 rounded-full bg-error/15 text-error font-semibold text-sm">إلغاء</button>}
        {!deal.finalized && <button onClick={onFinalize} disabled={finalizing} className="px-4 py-2.5 rounded-full bg-primary text-on-primary font-bold text-sm">{finalizing ? '...' : 'تثبيت العرض'}</button>}
        <button onClick={() => duplicateGroupDeal(dealId).then((r) => navigate(`/admin/group-deals/${r.id}/edit`))} className="px-4 py-2.5 rounded-full bg-surface-container-high font-semibold text-sm">نسخ العرض</button>
      </div>

      {/* Audit log */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4">
        <h3 className="font-bold text-sm mb-3">سجل الإجراءات</h3>
        {audit.length === 0 ? <p className="text-sm text-on-surface-variant">لا يوجد سجل بعد.</p> : (
          <div className="space-y-2">
            {audit.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-sm">
                <span className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0"><Icon name="history" className="text-[14px] text-on-surface-variant" /></span>
                <div>
                  <p className="font-semibold">{ACTION_LABELS[a.action] || a.action} {a.reason && <span className="text-on-surface-variant">— {a.reason}</span>}</p>
                  <p className="text-[11px] text-on-surface-variant">{a.admin_name || 'مشرف'} · {new Date(a.created_date).toLocaleString('ar')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ACTION_LABELS = { created: 'إنشاء', edited: 'تعديل', threshold_changed: 'تغيير المستويات', published: 'نشر', paused: 'إيقاف', resumed: 'استئناف', cancelled: 'إلغاء', end_extended: 'تمديد الوقت', finalized: 'تثبيت', refund_initiated: 'استرداد', duplicated: 'نسخ', archived: 'أرشفة' };

function Stat({ label, value, icon }) {
  return (
    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant mb-1"><Icon name={icon} className="text-[16px]" /> {label}</div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function fmtDur(ms) {
  if (ms <= 0) return 'انتهى';
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000);
  return `${h}س ${m}د ${s}ث`;
}