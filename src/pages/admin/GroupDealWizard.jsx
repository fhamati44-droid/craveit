import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RestaurantSelector from '@/components/admin/deals/RestaurantSelector';
import MealSelector from '@/components/admin/deals/MealSelector';
import ThresholdEditor from '@/components/admin/deals/ThresholdEditor';
import { saveGroupDeal, replaceDealItems, replaceDealThresholds, getGroupDeal, getGroupDealItems, getGroupDealThresholds, logAudit, publishGroupDeal, validateDealForPublish, COUNTING_LABELS, PAYMENT_MODEL_LABELS } from '@/lib/groupDealApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const STEPS = ['المطعم', 'الوجبات', 'المحتويات', 'الوقت', 'المستويات', 'الدفع', 'الحدود', 'الظهور', 'المراجعة'];

const toLocal = (iso) => { if (!iso) return ''; const d = new Date(iso); const off = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - off).toISOString().slice(0, 16); };
const fromLocal = (val) => (val ? new Date(val).toISOString() : '');

const blankDeal = {
  title: '', subtitle: '', description: '', restaurant_id: null, restaurant_name_snapshot: '', hero_image: '',
  reference_price: 0, start_at: '', end_at: '', timezone: 'Asia/Jerusalem', status: 'draft',
  counting_method: 'participants', payment_model: 'cod', minimum_success_participants: 1,
  maximum_participants: null, total_inventory: null, minimum_quantity_per_customer: 1, maximum_quantity_per_customer: 1,
  one_participation_per_customer: true, allow_customer_increase_quantity: false, reservation_expiration_minutes: null,
  stop_when_inventory_exhausted: true, homepage_featured: false, homepage_priority: 0, homepage_banner_enabled: false,
  banner_start_at: '', banner_end_at: '', banner_headline: '', banner_supporting_text: '', banner_cta: 'شوف العرض',
  show_upcoming_banner: true, upcoming_banner_start_at: '', show_in_ending_soon: true, highlight_badge: '',
  terms_summary: '', customer_explanation: '', auto_close_at_end: true,
};

export default function GroupDealWizard() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!dealId;
  const [step, setStep] = useState(0);
  const [deal, setDeal] = useState(blankDeal);
  const [items, setItems] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validation, setValidation] = useState(null);
  const [customization, setCustomization] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const d = await getGroupDeal(dealId);
        setDeal({ ...blankDeal, ...d });
        const [its, ths] = await Promise.all([getGroupDealItems(dealId), getGroupDealThresholds(dealId)]);
        setItems(its || []);
        setThresholds(ths || []);
        setCustomization((its || [])[0]?.customization_snapshot || '');
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [dealId]);

  const set = (k, v) => setDeal((d) => ({ ...d, [k]: v }));

  // Default hero image from first selected meal
  useEffect(() => {
    if (!deal.hero_image && items.length) set('hero_image', items[0].image_snapshot || '');
  }, [items]);

  const persist = useCallback(async (logAction) => {
    setSaving(true);
    try {
      const payload = { ...deal };
      if (!payload.hero_image && items.length) payload.hero_image = items[0].image_snapshot || '';
      const saved = await saveGroupDeal(payload);
      const id = saved.id || deal.id;
      if (!deal.id && id) setDeal((d) => ({ ...d, id }));
      await replaceDealItems(id, items.map((it) => ({ ...it, customization_snapshot: customization })));
      await replaceDealThresholds(id, thresholds);
      if (logAction) await logAudit(id, payload.title, logAction, null, null, '');
      return id;
    } catch (e) {
      console.error(e);
      alert('ما قدرنا نحفظ: ' + (e.message || ''));
    } finally { setSaving(false); }
  }, [deal, items, thresholds, customization]);

  const next = async () => {
    if (step === 0) await persist(isEdit ? 'edited' : 'created');
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const onPublish = async () => {
    setPublishing(true);
    setValidation(null);
    try {
      const id = await persist('edited');
      // attach items/thresholds for validation snapshot
      const res = await publishGroupDeal(id);
      if (res && res.published === false) {
        setValidation(res.errors || ['تعذّر النشر']);
      } else {
        alert('تم نشر العرض ✓');
        navigate(`/admin/group-deals/${id}`);
      }
    } catch (e) {
      setValidation([e.message || 'تعذّر النشر']);
    } finally { setPublishing(false); }
  };

  const onReviewValidate = async () => {
    const id = await persist('edited');
    const res = await validateDealForPublish({ ...deal, id }, items, thresholds);
    setValidation(res.errors || []);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/admin/group-deals')} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center"><Icon name="arrow_forward" /></button>
        <div>
          <h1 className="text-lg font-bold">{isEdit ? 'تعديل العرض' : 'إنشاء عرض جديد'}</h1>
          <p className="text-xs text-on-surface-variant">{isEdit ? deal.title : 'عم نجهّز عرض جماعي جديد'}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-5 pb-1">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} className={`flex-none px-3 py-1.5 rounded-full text-[11px] font-semibold ${i === step ? 'bg-primary text-on-primary' : i < step ? 'bg-primary/15 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 min-h-[300px]">
        {step === 0 && <RestaurantSelector value={deal.restaurant_id} onChange={(r) => { set('restaurant_id', r.id); set('restaurant_name_snapshot', r.name_ar || r.name); setItems([]); }} />}

        {step === 1 && <MealSelector restaurantId={deal.restaurant_id} selected={items} onChange={setItems} referencePrice={deal.reference_price} onReferencePrice={(v) => set('reference_price', v)} />}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="وصف العرض للعميل"><textarea value={deal.description} onChange={(e) => set('description', e.target.value)} rows={3} className="input" placeholder="مثلاً: وجبة لـ٤ أشخاص تشمل برغر وكولا وبطاطس" /></Field>
            <Field label="الإضافات والمشروبات والصوصات المشمولة (اختياري)"><textarea value={customization} onChange={(e) => setCustomization(e.target.value)} rows={2} className="input" placeholder="مثلاً: ٤ مشروبات غازية + صوص إضافي لكل وجبة" /></Field>
            <Field label="أقصى عدد استبدالات للعميل"><input type="number" min="0" value={deal.allow_customer_increase_quantity ? 1 : 0} onChange={(e) => set('allow_customer_increase_quantity', e.target.value > 0)} className="input" /></Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="تاريخ ووقت بداية العرض"><input type="datetime-local" value={toLocal(deal.start_at)} onChange={(e) => set('start_at', fromLocal(e.target.value))} className="input" /></Field>
              <Field label="تاريخ ووقت انتهاء العرض"><input type="datetime-local" value={toLocal(deal.end_at)} onChange={(e) => set('end_at', fromLocal(e.target.value))} className="input" /></Field>
            </div>
            {(() => {
              const errs = [];
              if (!deal.start_at) errs.push('حدد وقت بداية العرض.');
              if (!deal.end_at) errs.push('حدد وقت انتهاء العرض.');
              if (deal.start_at && deal.end_at && new Date(deal.end_at) <= new Date(deal.start_at)) errs.push('وقت انتهاء العرض لازم يكون بعد وقت البداية.');
              if (deal.start_at && Number.isNaN(new Date(deal.start_at).getTime())) errs.push('تاريخ العرض غير صالح.');
              if (deal.end_at && Number.isNaN(new Date(deal.end_at).getTime())) errs.push('تاريخ العرض غير صالح.');
              if (!errs.length) return null;
              return <div className="bg-error/10 border border-error/30 rounded-xl p-3"><ul className="text-sm text-error list-disc pr-4 space-y-0.5">{errs.map((e, i) => <li key={i}>{e}</li>)}</ul></div>;
            })()}
            <Toggle label="إغلاق تلقائي عند انتهاء الوقت" value={deal.auto_close_at_end} onChange={(v) => set('auto_close_at_end', v)} />
            <Toggle label="إظهار بانر «عرض قادم» قبل البداية" value={deal.show_upcoming_banner} onChange={(v) => set('show_upcoming_banner', v)} />
            {deal.show_upcoming_banner && <Field label="وقت بدء بانر العرض القادم"><input type="datetime-local" value={toLocal(deal.upcoming_banner_start_at)} onChange={(e) => set('upcoming_banner_start_at', fromLocal(e.target.value))} className="input" /></Field>}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <Field label="طريقة احتساب المستوى">
              <select value={deal.counting_method} onChange={(e) => set('counting_method', e.target.value)} className="input">
                {Object.entries(COUNTING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="السعر المرجعي (السعر الأصلي) (₪)"><input type="number" min="0" value={deal.reference_price} onChange={(e) => set('reference_price', Number(e.target.value))} className="input" /></Field>
            <ThresholdEditor thresholds={thresholds} onChange={setThresholds} referencePrice={deal.reference_price} />
            <Field label="أدنى عدد مشتركين لنجاح العرض"><input type="number" min="1" value={deal.minimum_success_participants} onChange={(e) => set('minimum_success_participants', Number(e.target.value))} className="input" /></Field>
          </div>
        )}

        {step === 4 && <ThresholdEditor thresholds={thresholds} onChange={setThresholds} referencePrice={deal.reference_price} />}

        {step === 6 && (
          <div className="space-y-3">
            <Field label="طريقة الدفع">
              <select value={deal.payment_model} onChange={(e) => set('payment_model', e.target.value)} className="input">
                {Object.entries(PAYMENT_MODEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <p className="text-[11px] text-on-surface-variant">{PAYMENT_MODEL_LABELS[deal.payment_model]}</p>
            <p className="text-[11px] text-tertiary bg-tertiary/10 rounded-lg p-2">ملاحظة: التفويض/الخصم الفعلي عبر البطاقة أو Google Pay يتطلّب ربط مزوّد الدفع. الدفع عند الاستلام متاح فورًا.</p>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="إجمالي المخزون"><input type="number" min="0" value={deal.total_inventory || ''} onChange={(e) => set('total_inventory', e.target.value ? Number(e.target.value) : null)} className="input" placeholder="بدون حد" /></Field>
              <Field label="أقصى عدد مشتركين"><input type="number" min="0" value={deal.maximum_participants || ''} onChange={(e) => set('maximum_participants', e.target.value ? Number(e.target.value) : null)} className="input" placeholder="بدون حد" /></Field>
              <Field label="أدنى كمية للعميل"><input type="number" min="1" value={deal.minimum_quantity_per_customer} onChange={(e) => set('minimum_quantity_per_customer', Number(e.target.value))} className="input" /></Field>
              <Field label="أقصى كمية للعميل"><input type="number" min="1" value={deal.maximum_quantity_per_customer} onChange={(e) => set('maximum_quantity_per_customer', Number(e.target.value))} className="input" /></Field>
            </div>
            <Toggle label="مشاركة واحدة لكل عميل" value={deal.one_participation_per_customer} onChange={(v) => set('one_participation_per_customer', v)} />
            <Toggle label="السماح للعميل بزيادة الكمية" value={deal.allow_customer_increase_quantity} onChange={(v) => set('allow_customer_increase_quantity', v)} />
            <Toggle label="إيقاف الانضمام عند نفاد المخزون" value={deal.stop_when_inventory_exhausted} onChange={(v) => set('stop_when_inventory_exhausted', v)} />
            <Field label="انتهاء الحجز (دقائق)"><input type="number" min="0" value={deal.reservation_expiration_minutes || ''} onChange={(e) => set('reservation_expiration_minutes', e.target.value ? Number(e.target.value) : null)} className="input" placeholder="بدون انتهاء" /></Field>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-3">
            <Field label="عنوان العرض"><input value={deal.title} onChange={(e) => set('title', e.target.value)} className="input" placeholder="مثلاً: وجبة الجماعة — ٤ أشخاص" /></Field>
            <Field label="عنوان فرعي"><input value={deal.subtitle} onChange={(e) => set('subtitle', e.target.value)} className="input" placeholder="مثلاً: أوفر وأشبع" /></Field>
            <Field label="شرح مخصص للعميل"><textarea value={deal.customer_explanation} onChange={(e) => set('customer_explanation', e.target.value)} rows={2} className="input" /></Field>
            <Field label="صورة العرض (افتراضي: صورة الوجبة)"><input value={deal.hero_image} onChange={(e) => set('hero_image', e.target.value)} className="input" placeholder="رابط الصورة" /></Field>
            {deal.hero_image && <img src={deal.hero_image} alt="" className="w-full h-32 object-cover rounded-xl" />}
            <Field label="شارة تمييز"><input value={deal.highlight_badge} onChange={(e) => set('highlight_badge', e.target.value)} className="input" placeholder="مثلاً: الأكثر طلبًا" /></Field>
            <Field label="ملخص الشروط والإلغاء"><textarea value={deal.terms_summary} onChange={(e) => set('terms_summary', e.target.value)} rows={2} className="input" placeholder="مثلاً: يُلغى العرض إذا لم يصل العدد الأدنى. الاسترداد كامل." /></Field>
            <div className="border-t border-outline-variant/20 pt-3 space-y-3">
              <Toggle label="عرض في بانر الصفحة الرئيسية" value={deal.homepage_banner_enabled} onChange={(v) => set('homepage_banner_enabled', v)} />
              {deal.homepage_banner_enabled && (
                <div className="space-y-3 pl-3 border-r-2 border-primary/30">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="أولوية الظهور"><input type="number" value={deal.homepage_priority} onChange={(e) => set('homepage_priority', Number(e.target.value))} className="input" /></Field>
                    <Field label="نص الزر"><input value={deal.banner_cta} onChange={(e) => set('banner_cta', e.target.value)} className="input" /></Field>
                    <Field label="بدء البانر"><input type="datetime-local" value={toLocal(deal.banner_start_at)} onChange={(e) => set('banner_start_at', fromLocal(e.target.value))} className="input" /></Field>
                    <Field label="نهاية البانر"><input type="datetime-local" value={toLocal(deal.banner_end_at)} onChange={(e) => set('banner_end_at', fromLocal(e.target.value))} className="input" /></Field>
                  </div>
                  <Field label="عنوان البانر"><input value={deal.banner_headline} onChange={(e) => set('banner_headline', e.target.value)} className="input" /></Field>
                  <Field label="نص داعم"><input value={deal.banner_supporting_text} onChange={(e) => set('banner_supporting_text', e.target.value)} className="input" /></Field>
                </div>
              )}
              <Toggle label="مميز بالصفحة الرئيسية (أولوية عامة)" value={deal.homepage_featured} onChange={(v) => set('homepage_featured', v)} />
              <Toggle label="إظهار في «ينتهي قريبًا»" value={deal.show_in_ending_soon} onChange={(v) => set('show_in_ending_soon', v)} />
            </div>
          </div>
        )}
      </div>

      {/* Validation summary (review) */}
      {validation && (
        <div className="mt-3 bg-error/10 border border-error/30 rounded-xl p-3">
          <p className="text-error font-bold text-sm mb-1">مراجعة العرض</p>
          {validation.length === 0 ? <p className="text-sm text-primary">العرض جاهز للنشر ✓</p> : <ul className="text-sm text-error list-disc pr-4 space-y-0.5">{validation.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between mt-4 gap-3">
        <button onClick={back} disabled={step === 0} className="px-5 py-2.5 rounded-full bg-surface-container border border-outline-variant/30 font-semibold disabled:opacity-40 flex items-center gap-1"><Icon name="arrow_forward" className="text-[18px]" /> السابق</button>
        <div className="flex gap-2">
          <button onClick={() => persist(isEdit ? 'edited' : 'created')} disabled={saving} className="px-4 py-2.5 rounded-full bg-surface-container-high font-semibold text-sm">{saving ? 'عم نحفظ...' : 'حفظ المسودة'}</button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} disabled={saving} className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-bold flex items-center gap-1 disabled:opacity-50">التالي <Icon name="arrow_back" className="text-[18px]" /></button>
          ) : (
            <>
              <button onClick={onReviewValidate} className="px-4 py-2.5 rounded-full bg-surface-container-high border border-outline-variant/30 font-semibold text-sm">مراجعة العرض</button>
              <button onClick={onPublish} disabled={publishing} className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-bold flex items-center gap-1">{publishing ? 'عم ننشر...' : 'نشر العرض'}</button>
            </>
          )}
        </div>
      </div>
      <style>{`.input{width:100%;background:#262b29;border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;color:#dfe3e0;border:1px solid transparent}.input:focus{border-color:#6ebf5f}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="w-full flex items-center justify-between bg-surface-container-high rounded-xl px-3 py-2.5">
      <span className="text-sm font-semibold">{label}</span>
      <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-primary' : 'bg-outline-variant/40'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${value ? '-translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}