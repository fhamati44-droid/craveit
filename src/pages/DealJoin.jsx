import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeals } from '@/lib/api';
import { base44 } from '@/api/base44Client';
import { buildTiers, currentTier, nextTier, countdown, pad, tierProgress } from '@/lib/dealTiers';
import { getSessionId } from '@/lib/tamamApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function DealJoin() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [participants, setParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: localStorage.getItem('user_name') || '', phone: localStorage.getItem('user_phone') || '', quantity: 1, method: 'delivery' });
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await getDeals();
        const d = (list || []).find(x => String(x.id) === dealId);
        setDeal(d || null);
        const parts = await base44.entities.DealParticipation.filter({ deal_id: Number(dealId) }).catch(() => []);
        setParticipants((parts || []).length);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [dealId]);

  if (loading) return <div className="flex items-center justify-center py-32"><div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!deal) return <div className="text-center py-32"><p className="text-on-surface-variant mb-4">العرض غير موجود</p><button onClick={() => navigate('/deals')} className="text-primary underline">العودة للعروض</button></div>;

  const tiers = buildTiers(deal);
  const cur = currentTier(tiers, participants);
  const next = nextTier(tiers, participants);
  const cd = countdown(deal.end_time || deal.valid_until);
  const expired = cd?.expired;

  const submit = async () => {
    setError('');
    if (expired) { setError('انتهى العرض، ما عاد ممكن الاشتراك'); return; }
    if (!form.name.trim() || !form.phone.trim()) { setError('اسمك ورقم هاتفك مطلوبين'); return; }
    if (!/^[0-9+\-\s]{7,}$/.test(form.phone)) { setError('رقم هاتف غير صحيح'); return; }
    // prevent duplicate
    setSubmitting(true);
    try {
      const existing = await base44.entities.DealParticipation.filter({ deal_id: Number(dealId), phone: form.phone });
      if ((existing || []).length > 0) { setError('أنت مشترك بهالعرض من قبل'); setSubmitting(false); return; }
      localStorage.setItem('user_name', form.name);
      localStorage.setItem('user_phone', form.phone);
      await base44.entities.DealParticipation.create({ deal_id: Number(dealId), name: form.name, phone: form.phone, quantity: form.quantity, method: form.method, session_id: getSessionId() });
      navigate(`/deals/${dealId}/confirmed`, { state: { name: form.name, phone: form.phone, quantity: form.quantity, method: form.method } });
    } catch (e) { console.error(e); setError('ما قدرنا نكمل الاشتراك، حاول مرة ثانية'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="pb-40">
      {/* Deal context */}
      <div className="relative w-full rounded-xl overflow-hidden bg-surface-container-high shadow-xl mt-3 mx-4" style={{ maxWidth: 'calc(100% - 32px)' }}>
        <div className="w-full h-48 bg-cover bg-center" style={{ backgroundImage: deal.image_url ? `url('${deal.image_url}')` : 'none' }}>
          {!deal.image_url && <div className="w-full h-full flex items-center justify-center text-5xl">🎉</div>}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-highest via-surface-container-highest/40 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1">
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/20 text-primary w-fit border border-primary/10"><Icon name="trending_down" className="text-[14px]" /><span className="font-label-sm">عرض جماعي نشط</span></span>
          <h2 className="font-bold">{deal.title || deal.name}</h2>
          <div className="flex items-end gap-2 mt-1">
            <div className="flex flex-col"><span className="text-label-sm text-on-surface-variant">السعر الحالي</span><span className="font-bold">{cur ? `₪${Math.round(cur.price)}` : '—'}</span></div>
            {next && <div className="flex flex-col opacity-60 mr-2"><span className="text-label-sm text-on-surface-variant">السعر القادم</span><span className="font-bold text-primary">₪{Math.round(next.price)}</span></div>}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4 mx-4 p-4 bg-surface-container rounded-xl">
        <div className="flex justify-between items-center mb-2"><span className="font-semibold">هدف المجموعة</span><span className="text-primary font-semibold">{next ? `باقي ${next.at - participants} مشاركين` : 'وصلنا أفضل سعر'}</span></div>
        <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${tierProgress(tiers, participants)}%` }} /></div>
        <p className="text-label-sm text-on-surface-variant mt-2">كلما زاد عددنا، قل السعر على الجميع!</p>
      </div>

      {/* Form */}
      <div className="mt-6 px-4 flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label className="font-semibold flex items-center gap-2"><Icon name="inventory_2" className="text-primary" />اختر الكمية</label>
          <div className="flex gap-3">
            {[1, 2].map(q => (
              <button key={q} onClick={() => setForm(f => ({ ...f, quantity: q }))} className={`flex-1 py-3 rounded-xl font-medium border transition-all ${form.quantity === q ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-high text-on-surface border-outline/10'}`}>{q} وحدة</button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-label-lg text-on-surface-variant">الاسم الكامل</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-surface-container-high px-4 py-3 rounded-xl text-on-surface focus:border-primary focus:outline-none border-b-2 border-transparent" placeholder="مثلاً: سامي أحمد" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-lg text-on-surface-variant">رقم الهاتف</label>
            <div className="flex flex-row-reverse items-center bg-surface-container-high px-4 py-3 rounded-xl"><span className="text-on-surface-variant ml-2">972+</span><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" className="flex-1 bg-transparent text-on-surface focus:outline-none text-right" placeholder="05X-XXXXXXX" type="tel" /></div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="font-semibold flex items-center gap-2"><Icon name="local_shipping" className="text-primary" />طريقة الاستلام</label>
          {[{ id: 'delivery', t: 'توصيل للمنزل', s: 'رسوم إضافية ₪15' }, { id: 'pickup', t: 'استلام من الفرع', s: 'مجانًا' }].map(o => (
            <label key={o.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-transform ${form.method === o.id ? 'bg-surface-container-high border border-primary/40' : 'bg-surface-container-high'}`}>
              <input checked={form.method === o.id} onChange={() => setForm(f => ({ ...f, method: o.id }))} className="w-5 h-5 accent-primary" name="method" type="radio" />
              <div className="flex flex-col"><span className="font-semibold">{o.t}</span><span className="text-label-sm text-on-surface-variant">{o.s}</span></div>
            </label>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-tertiary-container/10 border border-tertiary/20 flex gap-3 items-start">
          <Icon name="info" className="text-tertiary" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">تأكيد الالتزام</p>
            <p className="text-label-sm text-on-surface-variant leading-relaxed">سيتم حجز مكانك بالسعر الحالي. القيمة النهائية تُحدّد عند انتهاء العرض بناءً على أرخص سعر يتم فتحه. ما بيصير دفع فوري هسا.</p>
          </div>
        </div>

        {error && <p className="text-error text-sm text-center">{error}</p>}
      </div>

      <div className="fixed bottom-16 inset-x-0 px-4 z-40">
        <button onClick={submit} disabled={submitting || expired} className="w-full bg-primary text-on-primary h-14 rounded-full font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/30 active:scale-97 transition-all disabled:opacity-50">
          {submitting ? 'لحظة...' : 'تأكيد الاشتراك'}<Icon name="arrow_back" />
        </button>
      </div>
    </div>
  );
}