import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { schedulePlan, activatePlan, reevaluateActive, completeCampaign, manualOverride } from '@/lib/demandExecutionApi';
import { CheckCircle2, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';

const PAUSE_REASONS = ['ضغط بالمطعم', 'مشكلة بالمنتج', 'مشكلة تجارية', 'مراجعة TAMAM', 'سبب آخر'];

// ---------- Approve / schedule / reject (READY / APPROVAL_REQUIRED) ----------
export function ApproveActions({ plan, onDone }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const run = async (fn, label) => {
    setBusy(label); setErr('');
    try { await fn(); onDone(); } catch (e) { setErr(e.message || 'فشل'); } finally { setBusy(''); }
  };
  const approveExecute = () => run(() => activatePlan(plan.id).then((r) => { if (r.outcome && !['ACTIVATE', 'REDUCE_QUOTA'].includes(r.outcome)) throw new Error(r.reason || r.outcome); }), 'وافق ونفّذ');
  const schedule = () => run(() => schedulePlan(plan.id).then((r) => { if (r.scheduled === false) throw new Error(r.reason || 'not_ready'); }), 'جدول');
  const reject = () => run(() => manualOverride(plan.id, 'reject'), 'ارفض');
  const requestRestaurant = () => run(() => manualOverride(plan.id, 'force_review'), 'طلب موافقة');
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button onClick={approveExecute} disabled={!!busy} className="bg-tamam-green text-tamam-ink hover:bg-tamam-green-bright">
        {busy === 'وافق ونفّذ' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} وافق ونفّذ
      </Button>
      <Button onClick={schedule} disabled={!!busy} variant="outline">جدول</Button>
      <Button onClick={requestRestaurant} disabled={!!busy} variant="outline">طلب موافقة المطعم</Button>
      <Button onClick={reject} disabled={!!busy} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">ارفض</Button>
      {err && <p className="text-xs text-red-600 w-full">ما قدرنا ننفّذ: {err}</p>}
    </div>
  );
}

// ---------- Pause (ACTIVE) ----------
export function PauseAction({ plan, onDone }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true); setErr('');
    try { await manualOverride(plan.id, 'pause', { reason: reason || 'manual_pause' }); onDone(); setOpen(false); setReason(''); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="text-amber-700 border-amber-200 hover:bg-amber-50">أوقف مؤقتاً</Button>
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(o)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle className="text-right">إيقاف الحملة مؤقتاً</DialogTitle>
          <DialogDescription className="text-right">اختار السبب. الطلبات المدفوعة ما تتأثر.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-2">
            {PAUSE_REASONS.map((r) => (
              <button key={r} onClick={() => setReason(r === 'سبب آخر' ? '' : r)}
                className={`w-full text-right px-3 py-2 rounded-lg border text-sm ${(!reason && r === 'سبب آخر') || reason === r ? 'border-tamam-green bg-green-50 text-green-700 font-bold' : 'border-gray-200 text-gray-700'}`}>{r}</button>
            ))}
            {!PAUSE_REASONS.slice(0, -1).includes(reason) && (
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب السبب" dir="rtl" />
            )}
          </div>
          {err && <p className="text-xs text-red-600">ما قدرنا نوقف الحملة: {err}</p>}
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" disabled={busy || !reason} onClick={submit}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} أوقف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- Resume with revalidation (PAUSED) ----------
export function ResumeAction({ plan, onDone }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const revalidate = async () => {
    setBusy(true); setErr(''); setResult(null);
    try { const r = await reevaluateActive(plan.id); setResult(r); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const outcomeAr = { RESUME: 'الضغط انفرج — الحملة استؤنفت', KEEP_PAUSED: 'لا زالت موقوفة — ما في قيمة متبقية', COMPLETE: 'تم إكمال الحملة (انتهت)', CONTINUE: 'متابعة طبيعية', PAUSE: 'لا زالت موقوفة' };
  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-tamam-green text-tamam-ink hover:bg-tamam-green-bright">
        <RotateCcw className="w-4 h-4" /> راجع واستأنف
      </Button>
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(o)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle className="text-right">إعادة التحقق والاستئناف</DialogTitle>
          <DialogDescription className="text-right">بنفحص الأمان قبل ما نرجّعها شغالة.</DialogDescription></DialogHeader>
          <div className="py-2">
            {!result && !busy && <p className="text-sm text-gray-500">اضغط «فحص الأمان» للتحقق من القدرة والضغط والوقت.</p>}
            {busy && <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> بنفحص…</p>}
            {result && (
              <div className={`rounded-xl p-3 ${result.recommendation === 'RESUME' || result.recommendation === 'CONTINUE' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <p className="text-sm font-bold">{outcomeAr[result.recommendation] || result.recommendation}</p>
                {result.reason && <p className="text-xs text-gray-600 mt-1">{result.reason}</p>}
                {result.message_ar && <p className="text-xs text-gray-600 mt-1">{result.message_ar}</p>}
              </div>
            )}
            {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إغلاق</Button>
            <Button onClick={revalidate} disabled={busy}>فحص الأمان</Button>
            {result && (result.recommendation === 'RESUME' || result.recommendation === 'CONTINUE') && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={onDone}>تم</Button>
            )}
            {result && (result.recommendation === 'KEEP_PAUSED' || result.recommendation === 'COMPLETE' || result.recommendation === 'PAUSE') && (
              <Button variant="outline" onClick={onDone}>تم</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- Stop / Complete / Cancel ----------
export function StopAction({ plan, onDone }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isLive = plan.status === 'EXECUTED' || plan.status === 'PAUSED';
  const submit = async () => {
    setBusy(true); setErr('');
    try { if (isLive) await completeCampaign(plan.id); else await manualOverride(plan.id, 'cancel'); onDone(); setOpen(false); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
        {isLive ? 'إنهاء الحملة' : 'إلغاء الخطة'}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(o)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle className="text-right">{isLive ? 'إنهاء الحملة' : 'إلغاء الخطة'}</DialogTitle>
          <DialogDescription className="text-right">{isLive ? 'رح يتم إكمال الحملة وتسجيل التعلم. سجل التدقيق ما يُحذف.' : 'رح يتم إلغاء الخطة. سجل التدقيق يبقى محفوظ.'}</DialogDescription></DialogHeader>
          {err && <p className="text-xs text-red-600 py-2">{err}</p>}
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>تراجع</Button>
            <Button className="bg-red-600 hover:bg-red-700" disabled={busy} onClick={submit}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} تأكيد</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}