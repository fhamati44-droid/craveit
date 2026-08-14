import { useState } from 'react';
import { createSignal, toggleAcceptingOrders, updateRestaurantSettings } from '@/lib/partnerApi';
import { FlowHeader, OptionButton, SummaryRow, PrimaryButton, SecondaryButton, ErrorLine, DoneView } from './shared';

const LEVELS = [
  { key: 'light', label: 'ضغط خفيف', delta: 5, desc: 'نرفع وقت التحضير شوي', icon: 'warning' },
  { key: 'medium', label: 'ضغط متوسط', delta: 10, desc: 'نرفع وقت التحضير ونخفف العروض', icon: 'warning' },
  { key: 'high', label: 'ضغط عالي', delta: 15, desc: 'نرفع وقت التحضير ونخفف العروض', icon: 'warning' },
  { key: 'stop', label: 'وقف الطلبات الجديدة', delta: 0, stop: true, desc: 'الطلبات المقبولة بتضل شغالة', icon: 'block' },
];
const DURATIONS = [{ m: 30, label: '30 دقيقة' }, { m: 60, label: 'ساعة' }, { m: 90, label: 'ساعة ونص' }];

export default function PressureFlow({ restaurantId, prepTime, onDone }) {
  const [step, setStep] = useState('level');
  const [level, setLevel] = useState(null);
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const lvl = LEVELS.find((l) => l.key === level);
  const newPrep = lvl ? prepTime + lvl.delta : prepTime;

  const apply = async () => {
    setBusy(true); setErr(null);
    try {
      await createSignal(restaurantId, { type: 'kitchen_pressure', expected_duration: duration, reason: lvl.label });
      if (lvl.stop) await toggleAcceptingOrders(restaurantId, false);
      if (lvl.delta) await updateRestaurantSettings(restaurantId, { preparation_time_min: newPrep, preparation_time_max: newPrep });
      setDone(true);
    } catch (e) {
      setErr(e?.error === 'no_permission' ? 'ما عندك صلاحية' : 'ما قدرنا نحدّث الوضع، جرّب مرة ثانية');
    } finally { setBusy(false); }
  };

  const undo = async () => {
    setBusy(true);
    try {
      if (lvl.stop) await toggleAcceptingOrders(restaurantId, true);
      if (lvl.delta) await updateRestaurantSettings(restaurantId, { preparation_time_min: prepTime, preparation_time_max: prepTime });
    } catch {}
    finally { setBusy(false); onDone?.(); }
  };

  if (done) {
    return (
      <DoneView
        title="تم تحديث وضع المطعم"
        sub={lvl.stop ? 'وقفنا الطلبات الجديدة. الطلبات المقبولة بتضل شغالة.' : `رفعنا وقت التحضير إلى ${newPrep} دقيقة لمدة ${duration} دقيقة، وخفّفنا ظهور العروض.`}
        onClose={onDone}
        onUndo={undo}
        undoLabel="تراجع"
        undoing={busy}
      />
    );
  }

  if (step === 'level') {
    return (
      <div className="space-y-3">
        <FlowHeader title="قديش الضغط عندك؟" />
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <OptionButton key={l.key} active={level === l.key} onClick={() => { setLevel(l.key); setStep('duration'); }} icon={l.icon} label={l.label} desc={l.desc} />
          ))}
        </div>
        {err && <ErrorLine>{err}</ErrorLine>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FlowHeader title="لمدة قديش؟" />
      <div className="space-y-2">
        {DURATIONS.map((d) => (
          <OptionButton key={d.m} active={duration === d.m} onClick={() => setDuration(d.m)} icon="timer" label={d.label} />
        ))}
      </div>
      <div className="bg-tamam-surface rounded-xl p-3 space-y-2 mt-1">
        <SummaryRow label="الضغط" value={lvl?.label || '—'} />
        <SummaryRow label="المدة" value={`${duration} دقيقة`} />
        {lvl?.delta ? <SummaryRow label="وقت التحضير" value={`${prepTime} ← ${newPrep} دقيقة`} /> : <SummaryRow label="الطلبات الجديدة" value="متوقفة" />}
      </div>
      <p className="text-tamam-text-muted text-xs leading-snug">{lvl?.stop ? 'الطلبات المقبولة بتضل شغالة.' : 'رح نخفف ظهور العروض بهالفترة.'}</p>
      {err && <ErrorLine>{err}</ErrorLine>}
      <div className="flex gap-2">
        <SecondaryButton onClick={() => setStep('level')}>رجوع</SecondaryButton>
        <PrimaryButton onClick={apply} disabled={busy || !lvl}>
          {busy ? 'جاري…' : `طبّق لمدة ${DURATIONS.find((d) => d.m === duration)?.label || ''}`}
        </PrimaryButton>
      </div>
    </div>
  );
}