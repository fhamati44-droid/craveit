import { useState } from 'react';
import { updateMenuItem, createSignal } from '@/lib/partnerApi';
import { FlowHeader, OptionButton, ItemPicker, SummaryRow, PrimaryButton, SecondaryButton, ErrorLine, DoneView } from './shared';

const WHEN = [
  { key: 'unknown', label: 'مش معروف', off: null },
  { key: 'hour', label: 'بعد ساعة', offMs: 3600000 },
  { key: 'tomorrow', label: 'بكرا', offMs: 24 * 3600000 },
];

function returnAt(key) {
  const w = WHEN.find((x) => x.key === key);
  if (!w || !w.offMs) return null;
  return new Date(Date.now() + w.offMs).toISOString();
}

export default function SoldOutFlow({ restaurantId, menuItems, onDone }) {
  const [step, setStep] = useState('item');
  const [items, setItems] = useState([]);
  const [when, setWhen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);
  const [hidden, setHidden] = useState([]);

  const apply = async () => {
    setBusy(true); setErr(null);
    try {
      const ret = returnAt(when);
      for (const id of items) {
        await updateMenuItem(restaurantId, id, { available: false, sold_out: true });
        if (ret) await createSignal(restaurantId, { type: 'sold_out', menu_item_id: id, expires_at: ret, reason: 'صنف خلص — إعادة متوقعة' });
      }
      setHidden(items);
      setDone(true);
    } catch (e) {
      setErr(e?.error === 'no_permission' ? 'ما عندك صلاحية' : 'ما قدرنا نحدّث الأصناف، جرّب مرة ثانية');
    } finally { setBusy(false); }
  };

  const restore = async () => {
    setBusy(true);
    try {
      for (const id of hidden) await updateMenuItem(restaurantId, id, { available: true, sold_out: false });
    } catch {}
    finally { setBusy(false); onDone?.(); }
  };

  if (done) {
    return (
      <DoneView
        title="تم إيقاف الصنف مؤقتًا"
        sub={`خفّينا ${hidden.length} صنف عن الطلبات الجديدة.`}
        onClose={onDone}
        onUndo={restore}
        undoLabel="رجّع الصنف متوفر"
        undoing={busy}
      />
    );
  }

  if (step === 'item') {
    return (
      <div className="space-y-3">
        <FlowHeader title="أي صنف خلص؟" subtitle="اختار صنف أو أكتر." />
        <ItemPicker items={menuItems} selected={items} onSelect={setItems} multi />
        <PrimaryButton onClick={() => setStep('when')} disabled={items.length === 0}>كمّل</PrimaryButton>
        {err && <ErrorLine>{err}</ErrorLine>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FlowHeader title="متى بصير متوفر؟" />
      <div className="space-y-2">
        {WHEN.map((w) => (
          <OptionButton key={w.key} active={when === w.key} onClick={() => setWhen(w.key)} icon="schedule" label={w.label} />
        ))}
      </div>
      <div className="bg-tamam-surface rounded-xl p-3 space-y-2">
        <SummaryRow label="عدد الأصناف" value={String(items.length)} />
        <SummaryRow label="العودة المتوقعة" value={WHEN.find((w) => w.key === when)?.label || '—'} />
      </div>
      <p className="text-tamam-error text-xs leading-snug">رح نخفي الصنف عن الطلبات الجديدة، ونسجّل وقت العودة المتوقع. أول ما يجهز، رجّعه متوفر من زر الرجوع.</p>
      {err && <ErrorLine>{err}</ErrorLine>}
      <div className="flex gap-2">
        <SecondaryButton onClick={() => setStep('item')}>رجوع</SecondaryButton>
        <PrimaryButton onClick={apply} disabled={busy || !when} danger>{busy ? 'جاري…' : 'علّم الصنف غير متوفر'}</PrimaryButton>
      </div>
    </div>
  );
}