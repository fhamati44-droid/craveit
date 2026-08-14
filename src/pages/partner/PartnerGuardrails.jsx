import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listGuardrails, listGuardrailChanges, submitGuardrailChange } from '@/lib/partnerApi';
import PartnerErrorState from '@/components/partner/PartnerErrorState';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const OFFER_TYPE_LABEL = { direct: 'خصم مباشر على الفاتورة', combo: 'وجبات توفير (كومبو)', quantity: 'عرض حسب الكمية', bogo: 'اشتر واحد وخذ الثاني', pickup: 'عرض استلام', delivery: 'عرض توصيل' };
const MANUAL_CASES = ['حملات التسويق الضخمة', 'عروض الأعياد والمناسبات الوطنية', 'تجاوز سقف الخصم المتفق عليه', 'إضافة صنف جديد غير مربوط تزامناً مع حملة'];

export default function PartnerGuardrails() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [list, setList] = useState([]);
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [req, setReq] = useState(null);
  const [proposed, setProposed] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!rid) return;
    setLoading(true); setError(false);
    Promise.all([listGuardrails(rid), listGuardrailChanges(rid)])
      .then(([g, c]) => { setList(g || []); setChanges(c || []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, [rid]);

  if (loading) return <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton-t rounded-2xl" />)}</div>;
  if (error) return <PartnerErrorState variant="error" onRetry={load} onBack={() => navigate('/partner/home')} />;

  const agreement = (list || []).find((g) => !g.menu_item_id && g.status === 'active');

  const submit = async () => {
    if (!req || !reason.trim()) return;
    setSubmitting(true);
    try {
      await submitGuardrailChange(rid, { guardrail_id: agreement?.id || null, section: req.section, field: req.section, current_value: req.current || '', proposed_value: proposed, reason });
      setReq(null); setProposed(''); setReason(''); load();
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <div className="px-4 py-4 pb-28 space-y-4">
      <div className="flex items-center gap-2 bg-tamam-surface-low rounded-2xl p-3">
        <span className="material-symbols-outlined text-tamam-green-bright">description</span>
        <span className="text-[10px] bg-tamam-green/15 text-tamam-green-bright px-2 py-0.5 rounded-full">اتفاقية الشراكة</span>
      </div>
      <div>
        <h1 className="font-bold text-lg text-tamam-text">حدود الشغل</h1>
        <p className="text-tamam-text-muted text-xs mt-1">هاي حدود الشغل اللي اتفقنا عليها. لتعديل أي حد، اطلب التغيير وفريق TAMAM راح يراجعه.</p>
      </div>

      {!agreement ? (
        <div className="bg-tamam-surface rounded-2xl p-6 text-center">
          <span className="material-symbols-outlined text-tamam-text-muted text-[36px]">shield</span>
          <p className="text-tamam-text-muted text-sm mt-2">ما في حدود شغل محددة بعد. فريق TAMAM راح يفعّلها بعد توقيع الاتفاقية.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Section icon="schedule" title="أوقات إطلاق العروض" onEdit={() => setReq({ section: 'offer_times', label: 'أوقات العروض', current: daysStr(agreement) })}>
            <Row label="الأيام المسموحة" value={agreement.allowed_days?.length ? agreement.allowed_days.map((d) => DAY_NAMES[d] || d).join('، ') : 'غير محدد'} />
            <Row label="الساعات المتاحة" value={agreement.allowed_time_ranges?.length ? agreement.allowed_time_ranges.join('، ') : 'غير محدد'} />
            <Row label="ساعات الذروة المستثناة" value={agreement.blocked_peak_hours?.length ? agreement.blocked_peak_hours.join('، ') : 'غير محدد'} />
          </Section>

          <Section icon="sell" title="الأسعار والحدود" onEdit={() => setReq({ section: 'price_boundaries', label: 'الأسعار والحدود', current: priceStr(agreement) })}>
            <div className="grid grid-cols-2 gap-2">
              <Mini label="السعر العادي" value={agreement.normal_price != null ? `${agreement.normal_price} ₪` : '—'} />
              <Mini label="أدنى سعر عرض للزبون" value={agreement.minimum_customer_offer_price != null ? `${agreement.minimum_customer_offer_price} ₪` : '—'} />
              <Mini label="الحد الأدنى للصافي للمطعم" value={agreement.minimum_restaurant_net != null ? `${agreement.minimum_restaurant_net} ₪` : '—'} />
            </div>
          </Section>

          <Section icon="category" title="أنواع العروض المدعومة" onEdit={() => setReq({ section: 'offer_types', label: 'أنواع العروض', current: (agreement.allowed_offer_types || []).join('، ') })}>
            <div className="flex flex-wrap gap-1.5">
              {(agreement.allowed_offer_types || []).length ? agreement.allowed_offer_types.map((t) => <span key={t} className="text-[11px] bg-tamam-surface-low text-tamam-text px-2 py-1 rounded">{OFFER_TYPE_LABEL[t] || t}</span>) : <span className="text-tamam-text-muted text-xs">غير محدد</span>}
            </div>
          </Section>

          <Section icon="tune" title="القدرة التشغيلية" onEdit={() => setReq({ section: 'capacity', label: 'القدرة التشغيلية', current: agreement.max_quantity != null ? String(agreement.max_quantity) : '' })}>
            <Row label="أقصى كمية/طلبات للعرض" value={agreement.max_quantity != null ? agreement.max_quantity : 'غير محدد'} />
          </Section>

          <Section icon="shield_lock" title="حالات تحتاج موافقة TAMAM" tint="error">
            <p className="text-[11px] text-tamam-text-muted mb-2">هذي الحالات لازم نرجع فيها لفريق TAMAM قبل الاعتماد:</p>
            <div className="space-y-1">{MANUAL_CASES.map((c, i) => <div key={i} className="flex items-center gap-1.5 text-xs text-tamam-text"><span className="material-symbols-outlined text-tamam-error text-[14px]">priority_high</span>{c}</div>)}</div>
            {agreement.requires_manual_approval && <span className="text-[11px] text-tamam-gold block mt-2">مفعّل: يتطلب موافقة يدوية.</span>}
          </Section>
        </div>
      )}

      {changes.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-tamam-text px-1">طلبات تعديل قيد المراجعة</h3>
          {changes.map((c) => (
            <div key={c.id} className="bg-tamam-surface rounded-2xl p-3 flex justify-between items-center">
              <div className="min-w-0"><p className="text-sm text-tamam-text font-medium truncate">{c.section}</p><p className="text-[11px] text-tamam-text-muted truncate">{c.proposed_value} — {c.reason}</p></div>
              <span className="text-[10px] bg-tamam-gold-dark/30 text-tamam-gold px-2 py-0.5 rounded-full shrink-0">بانتظار المراجعة</span>
            </div>
          ))}
        </div>
      )}

      {req && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setReq(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-tamam-surface rounded-t-3xl p-4 space-y-3 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-tamam-text">طلب تعديل: {req.label}</h3>
              <button onClick={() => setReq(null)}><span className="material-symbols-outlined text-tamam-text-muted">close</span></button>
            </div>
            {req.current && <p className="text-[11px] text-tamam-text-muted">القيمة الحالية: {req.current}</p>}
            <Input value={proposed} onChange={(e) => setProposed(e.target.value)} placeholder="القيمة المقترحة" className="bg-tamam-surface-low border-tamam-outline/30" />
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="سبب طلب التعديل" className="bg-tamam-surface-low border-tamam-outline/30 text-right" />
            <Button onClick={submit} disabled={submitting || !reason.trim()} className="w-full bg-tamam-green-bright text-tamam-ink">{submitting ? 'جاري…' : 'إرسال طلب التعديل'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function daysStr(g) { return g.allowed_days?.length ? g.allowed_days.map((d) => DAY_NAMES[d]).join('، ') : ''; }
function priceStr(g) { return [g.normal_price, g.minimum_customer_offer_price, g.minimum_restaurant_net].filter((v) => v != null).join(' / '); }
function Section({ icon, title, onEdit, tint, children }) {
  return (
    <div className="bg-tamam-surface rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><span className={`material-symbols-outlined text-[20px] ${tint === 'error' ? 'text-tamam-error' : 'text-tamam-green-bright'}`}>{icon}</span><h3 className="font-bold text-sm text-tamam-text">{title}</h3></div>
        {onEdit && <button onClick={onEdit} className="text-tamam-green-bright text-[11px] font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">edit</span>اطلب تعديل</button>}
      </div>
      {children}
    </div>
  );
}
function Row({ label, value }) { return <div className="flex justify-between items-center"><span className="text-tamam-text-muted text-xs">{label}</span><span className="text-tamam-text font-medium text-xs">{value}</span></div>; }
function Mini({ label, value }) { return <div className="bg-tamam-surface-low rounded-xl px-3 py-2"><p className="text-[10px] text-tamam-text-muted">{label}</p><p className="font-bold text-tamam-text text-sm">{value}</p></div>; }