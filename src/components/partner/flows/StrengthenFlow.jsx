import { useState } from 'react';
import { submitOfferRequest } from '@/lib/partnerApi';
import { FlowHeader, OptionButton, ItemPicker, SummaryRow, PrimaryButton, SecondaryButton, ErrorLine, DoneView, TimeField, NumberField } from './shared';

const GOALS = [
  { key: 'weak', label: 'مبيعاتها ضعيفة', goal: 'strengthen_item' },
  { key: 'new', label: 'بدي أوصلها لزبائن جدد', goal: 'attract_new' },
  { key: 'quiet', label: 'بدي أبيعها بوقت هادئ', goal: 'quiet_hour' },
  { key: 'winback', label: 'بدي أرجّع زبائن جربوها', goal: 'reactivate' },
  { key: 'tamam', label: 'خلّي تمام تقترح', goal: 'strengthen_item' },
];

export default function StrengthenFlow({ restaurantId, menuItems, onDone }) {
  const [step, setStep] = useState('item');
  const [item, setItem] = useState(null);
  const [goal, setGoal] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [max, setMax] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const it = (menuItems || []).find((m) => m.id === item);
  const goalMeta = GOALS.find((g) => g.key === goal);

  const submit = async () => {
    if (!item || !goal) return;
    setBusy(true); setErr(null);
    try {
      await submitOfferRequest(restaurantId, {
        goal: goalMeta.goal,
        requested_menu_items: [item],
        available_quantity: max ? Number(max) : null,
        allowed_time_ranges: (from && to) ? [`${from}-${to}`] : [],
        operational_reason: `تقوية وجبة — ${goalMeta.label}`,
      });
      setDone(true);
    } catch (e) {
      setErr(e?.error === 'no_permission' ? 'ما عندك صلاحية' : 'ما قدرنا نرسل الاقتراح، جرّب مرة ثانية');
    } finally { setBusy(false); }
  };

  if (done) return <DoneView title="وصل اقتراحك لتمام" sub="تمام رح تبني اقتراح مناسب بدون ما تغيّر أسعارك أو تنشر العرض قبل موافقتك." onClose={onDone} />;

  if (step === 'item') {
    return (
      <div className="space-y-3">
        <FlowHeader title="أي وجبة بدك تقوّيها؟" />
        <ItemPicker items={menuItems} selected={item} onSelect={setItem} />
        <PrimaryButton onClick={() => setStep('goal')} disabled={!item}>كمّل</PrimaryButton>
        {err && <ErrorLine>{err}</ErrorLine>}
      </div>
    );
  }
  if (step === 'goal') {
    return (
      <div className="space-y-3">
        <FlowHeader title="شو هدفك؟" />
        <div className="space-y-2">
          {GOALS.map((g) => (
            <OptionButton key={g.key} active={goal === g.key} onClick={() => setGoal(g.key)} icon="flag" label={g.label} />
          ))}
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => setStep('item')}>رجوع</SecondaryButton>
          <PrimaryButton onClick={() => setStep('limits')} disabled={!goal}>كمّل</PrimaryButton>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <FlowHeader title="حدود العرض" subtitle="اختياري — بتقدر تحدد وقت وحد أقصى." />
      <div className="flex gap-2">
        <TimeField label="من الساعة" value={from} onChange={setFrom} />
        <TimeField label="للساعة" value={to} onChange={setTo} />
      </div>
      <NumberField label="حد أقصى للطلبات" value={max} onChange={setMax} placeholder="مثال: 20" />
      <div className="bg-tamam-surface rounded-xl p-3 space-y-2">
        <SummaryRow label="الوجبة" value={it?.name || '—'} />
        <SummaryRow label="الهدف" value={goalMeta?.label || '—'} />
        <SummaryRow label="الوقت" value={(from && to) ? `${from} - ${to}` : 'غير محدد'} />
        <SummaryRow label="الحد الأقصى" value={max || 'بدون حد'} />
      </div>
      <p className="text-tamam-text-muted text-xs leading-snug">بدون ما يتغير سعرها أو ينشر قبل موافقتك.</p>
      {err && <ErrorLine>{err}</ErrorLine>}
      <div className="flex gap-2">
        <SecondaryButton onClick={() => setStep('goal')}>رجوع</SecondaryButton>
        <PrimaryButton onClick={submit} disabled={busy}>{busy ? 'جاري…' : 'أرسل الاقتراح لتمام'}</PrimaryButton>
      </div>
    </div>
  );
}