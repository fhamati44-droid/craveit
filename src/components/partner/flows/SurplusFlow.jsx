import { useState } from 'react';
import { submitOfferRequest } from '@/lib/partnerApi';
import { FlowHeader, OptionButton, ItemPicker, SummaryRow, PrimaryButton, SecondaryButton, ErrorLine, DoneView, TimeField, NumberField } from './shared';

const OBJECTIVES = [
  { key: 'sell', label: 'بيع الكمية خلال وقت محدد', goal: 'surplus' },
  { key: 'new', label: 'جذب زبائن جدد', goal: 'attract_new' },
  { key: 'quiet', label: 'تقوية وقت ضعيف', goal: 'quiet_hour' },
  { key: 'tamam', label: 'خلّي تمام تقترح', goal: 'surplus' },
];

export default function SurplusFlow({ restaurantId, menuItems, onDone }) {
  const [step, setStep] = useState('item');
  const [item, setItem] = useState(null);
  const [qty, setQty] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [obj, setObj] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const it = (menuItems || []).find((m) => m.id === item);
  const objMeta = OBJECTIVES.find((o) => o.key === obj);

  const submit = async () => {
    if (!item || !qty) return;
    setBusy(true); setErr(null);
    try {
      await submitOfferRequest(restaurantId, {
        goal: objMeta?.goal || 'surplus',
        requested_menu_items: [item],
        available_quantity: Number(qty),
        allowed_time_ranges: (from && to) ? [`${from}-${to}`] : [],
        operational_reason: `كمية متوفرة — ${objMeta?.label || ''}`,
      });
      setDone(true);
    } catch (e) {
      setErr(e?.error === 'no_permission' ? 'ما عندك صلاحية' : 'ما قدرنا نرسلها، جرّب مرة ثانية');
    } finally { setBusy(false); }
  };

  if (done) return <DoneView title="وصلتنا الكمية" sub="تمام بتجهز الاقتراح ومنخبرك لما يصير جاهز." onClose={onDone} />;

  if (step === 'item') {
    return (
      <div className="space-y-3">
        <FlowHeader title="شو الكمية المتوفرة عندك؟" subtitle="اختار الصنف اللي عندك منه كمية." />
        <ItemPicker items={menuItems} selected={item} onSelect={setItem} />
        <PrimaryButton onClick={() => setStep('qty')} disabled={!item}>كمّل</PrimaryButton>
        {err && <ErrorLine>{err}</ErrorLine>}
      </div>
    );
  }
  if (step === 'qty') {
    return (
      <div className="space-y-3">
        <FlowHeader title="قديش كمية متوفرة؟" />
        <NumberField label="الكمية المتوفرة" value={qty} onChange={setQty} placeholder="مثال: 25" />
        <div className="flex gap-2">
          <SecondaryButton onClick={() => setStep('item')}>رجوع</SecondaryButton>
          <PrimaryButton onClick={() => setStep('time')} disabled={!qty || Number(qty) <= 0}>كمّل</PrimaryButton>
        </div>
      </div>
    );
  }
  if (step === 'time') {
    return (
      <div className="space-y-3">
        <FlowHeader title="بأي وقت متوفرة؟" />
        <div className="flex gap-2">
          <TimeField label="من الساعة" value={from} onChange={setFrom} />
          <TimeField label="للساعة" value={to} onChange={setTo} />
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => setStep('qty')}>رجوع</SecondaryButton>
          <PrimaryButton onClick={() => setStep('goal')}>كمّل</PrimaryButton>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <FlowHeader title="شو هدفك من الكمية؟" />
      <div className="space-y-2">
        {OBJECTIVES.map((o) => (
          <OptionButton key={o.key} active={obj === o.key} onClick={() => setObj(o.key)} icon="flag" label={o.label} />
        ))}
      </div>
      <div className="bg-tamam-surface rounded-xl p-3 space-y-2">
        <SummaryRow label="الصنف" value={it?.name || '—'} />
        <SummaryRow label="الكمية" value={qty || '—'} />
        <SummaryRow label="الوقت" value={(from && to) ? `${from} - ${to}` : 'غير محدد'} />
      </div>
      <p className="text-tamam-text-muted text-xs leading-snug">تمام رح تراجع أفضل طريقة لتسويقها ضمن حدود مطعمك.</p>
      {err && <ErrorLine>{err}</ErrorLine>}
      <div className="flex gap-2">
        <SecondaryButton onClick={() => setStep('time')}>رجوع</SecondaryButton>
        <PrimaryButton onClick={submit} disabled={busy || !obj}>{busy ? 'جاري…' : 'أرسلها لتمام'}</PrimaryButton>
      </div>
    </div>
  );
}