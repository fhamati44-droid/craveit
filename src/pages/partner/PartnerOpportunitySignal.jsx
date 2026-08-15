import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { partnerCreateOpportunity } from '@/lib/campaignApi';

const REASONS = [
  { k: 'raw_material', label: 'المادة الخام أرخص اليوم' },
  { k: 'surplus', label: 'عندي كمية' },
  { k: 'temporary_capacity', label: 'عندي قدرة تشغيلية زيادة' },
  { k: 'strengthen_item', label: 'بدي أقوّي وجبة' },
  { k: 'low_demand', label: 'الطلب ضعيف اليوم' },
  { k: 'other', label: 'سبب ثاني' },
];

/** Fast restaurant partner flow: "عندي فرصة اليوم" — creates an Opportunity signal
 *  (NOT a campaign). TAMAM reviews and may convert it into a campaign. */
export default function PartnerOpportunitySignal() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [reason, setReason] = useState(REASONS[0].k);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState('');
  const [until, setUntil] = useState('22:00');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!rid) return;
    setSending(true);
    try {
      const end = new Date(); const [h, m] = until.split(':').map(Number); end.setHours(h, m || 0, 0, 0);
      await partnerCreateOpportunity(rid, {
        opportunity_type: reason, quantity: qty ? Number(qty) : null,
        reason: REASONS.find((r) => r.k === reason)?.label + (note ? ' — ' + note : ''),
        start_at: new Date().toISOString(), end_at: end.toISOString(),
      });
      setDone(true);
    } finally { setSending(false); }
  };

  if (done) return (
    <div className="p-6 text-center" dir="rtl">
      <div className="text-4xl mb-2">✅</div>
      <p className="font-bold text-tamam-text">وصلت فرصتك لتمام.</p>
      <p className="text-sm text-tamam-text-muted mt-1">فريق تمام بيراجعها وبجهّز اقتراح حملة مناسب ضمن حدودك.</p>
      <button onClick={() => navigate('/partner/home')} className="mt-4 h-11 px-4 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm">رجوع</button>
    </div>
  );

  return (
    <div className="pb-6" dir="rtl">
      <div className="sticky top-0 z-20 bg-tamam-bg/95 backdrop-blur-xl border-b border-tamam-outline/20 px-3 py-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-tamam-surface"><span className="material-symbols-outlined text-tamam-text text-[22px]">arrow_forward</span></button>
        <div className="flex-1"><h1 className="font-bold text-sm text-tamam-text">عندي فرصة اليوم</h1><p className="text-[10px] text-tamam-text-muted">أخبر TAMAM — لا يلزم إنشاء حملة بنفسك</p></div>
      </div>
      <div className="px-4 pt-4 space-y-3">
        <div>
          <p className="text-xs text-tamam-text-muted mb-1.5">شو السبب؟</p>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button key={r.k} onClick={() => setReason(r.k)} className={`h-12 rounded-xl text-xs font-bold border ${reason === r.k ? 'bg-tamam-green text-tamam-ink border-tamam-green' : 'bg-tamam-surface text-tamam-text border-tamam-outline/30'}`}>{r.label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-tamam-text-muted mb-1">كمية (اختياري)</p>
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="مثال: 15" className="w-full h-11 px-3 rounded-xl bg-tamam-surface text-tamam-text border border-tamam-outline/30 text-sm" />
        </div>
        <div>
          <p className="text-xs text-tamam-text-muted mb-1">صالحة لغاية</p>
          <input type="time" value={until} onChange={(e) => setUntil(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-tamam-surface text-tamam-text border border-tamam-outline/30 text-sm" />
        </div>
        <div>
          <p className="text-xs text-tamam-text-muted mb-1">ملاحظة (اختياري)</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full p-3 rounded-xl bg-tamam-surface text-tamam-text border border-tamam-outline/30 text-sm" />
        </div>
        <button onClick={submit} disabled={sending || !rid} className="w-full h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition disabled:opacity-50">{sending ? 'جاري…' : 'أرسل الفرصة لتمام'}</button>
        <p className="text-[11px] text-tamam-text-muted text-center">هادي إشارة فرصة — TAMAM بتراجعها وبقرر الحملة المناسبة ضمن حدودك التجارية.</p>
      </div>
    </div>
  );
}