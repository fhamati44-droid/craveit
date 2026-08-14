import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getDemandProfile, saveDemandSlots, setDemandDayLevel, acceptDaySuggestion, copyDemandDay, requestDemandOpportunity } from '@/lib/partnerApi';
import { LEVELS, levelMeta, DAY_NAMES, buildBlocks, endOf, accessibleName, SOURCE_LABEL, LEVEL_ORDER, toMin } from '@/components/partner/demand/demandMeta';
import DemandHourSheet from '@/components/partner/demand/DemandHourSheet';
import DemandPaintBar from '@/components/partner/demand/DemandPaintBar';
import DemandCopySheet from '@/components/partner/demand/DemandCopySheet';
import DemandDayStrengthRow, { DayLevelSheet } from '@/components/partner/demand/DemandDayStrengthRow';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const SAVE_LABEL = { idle: 'محفوظ', saving: 'عم نحفظ…', saved: 'محفوظ', error: 'ما قدرنا نحفظ' };

export default function PartnerDemandSchedule() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;

  const [profile, setProfile] = useState(null);
  const [localByDay, setLocalByDay] = useState({});
  const [dayProfiles, setDayProfiles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [denied, setDenied] = useState(false);
  const [selectedDay, setSelectedDay] = useState(location.state?.day ?? new Date().getDay());
  const [showAll24, setShowAll24] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [paintActive, setPaintActive] = useState(false);
  const [paintLevel, setPaintLevel] = useState('quiet');
  const [paintSel, setPaintSel] = useState(() => new Set());
  const [hourSheet, setHourSheet] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [dayLevelDay, setDayLevelDay] = useState(null);
  const [backGuard, setBackGuard] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [reqMsg, setReqMsg] = useState(null);
  const savedTimer = useRef(null);

  const load = useCallback(() => {
    if (!rid) return;
    setLoading(true); setError(false); setDenied(false);
    getDemandProfile(rid, null)
      .then((d) => {
        setProfile(d.profile);
        setDayProfiles(d.day_profiles || []);
        setSummary(d.summary || null);
        const map = {};
        (d.slots || []).forEach((s) => {
          if (!map[s.day_of_week]) map[s.day_of_week] = {};
          map[s.day_of_week][s.start_time] = s.demand_level;
        });
        setLocalByDay(map);
      })
      .catch((e) => { if (e?.error === 'no_permission' || e?.error === 'no_membership') setDenied(true); else setError(true); })
      .finally(() => setLoading(false));
  }, [rid]);
  useEffect(load, [load]);

  useEffect(() => {
    const h = (e) => { if (saveState === 'saving' || saveState === 'error') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [saveState]);

  const operating = profile?.operating_hours?.[selectedDay] || { open: '10:00', close: '22:00' };
  const blocks = useMemo(() => buildBlocks(operating.open, operating.close, 60, showAll24), [operating.open, operating.close, showAll24]);

  // persistDay takes the explicitly-computed next day map so it never reads a
  // stale closure value of localByDay (the old persist(day) read localByDay[day]
  // from the closure, which lagged behind the setState just triggered).
  // Returns true only after saveDemandSlots succeeds; false otherwise. On
  // failure we stay on the page, keep local selections, and surface the
  // retry UI (saveState === 'error').
  const persistDay = useCallback(async (day, nextDayMap) => {
    if (!rid) return false;
    const map = nextDayMap || localByDay[day] || {};
    setSaveState('saving');
    const slots = Object.entries(map)
      .filter(([, l]) => l && l !== 'unknown')
      .map(([start, l]) => ({ start_time: start, end_time: endOf(start), demand_level: l }));
    try {
      const res = await saveDemandSlots(rid, null, day, slots);
      setLocalByDay((prev) => {
        const next = { ...prev };
        const m = {};
        (res.slots || []).forEach((s) => { m[s.start_time] = s.demand_level; });
        next[day] = m;
        return next;
      });
      if (res.summary) setSummary(res.summary);
      setSaveState('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2000);
      return true;
    } catch {
      setSaveState('error');
      return false;
    }
  }, [rid, localByDay]);

  const applyHour = (level) => {
    const start = hourSheet?.start;
    if (start == null) return;
    const dayMap = { ...(localByDay[selectedDay] || {}), [start]: level };
    setLocalByDay((prev) => ({ ...prev, [selectedDay]: dayMap }));
    setHourSheet(null);
    persistDay(selectedDay, dayMap);
  };

  const togglePaint = (start) => setPaintSel((prev) => {
    const s = new Set(prev);
    if (s.has(start)) s.delete(start); else s.add(start);
    return s;
  });
  const paintApply = () => {
    if (!paintSel.size) return;
    const dayMap = { ...(localByDay[selectedDay] || {}) };
    paintSel.forEach((start) => { dayMap[start] = paintLevel; });
    setLocalByDay((prev) => ({ ...prev, [selectedDay]: dayMap }));
    setPaintSel(new Set());
    persistDay(selectedDay, dayMap);
  };
  const applyPeriod = (p) => setPaintSel((prev) => {
    const s = new Set(prev);
    blocks.forEach((b) => { if (b.startMin >= p.from * 60 && b.startMin < p.to * 60) s.add(b.start); });
    return s;
  });

  const doCopy = async (toDays) => {
    if (!toDays.length) return;
    setSaveState('saving');
    try { await copyDemandDay(rid, null, selectedDay, toDays); setCopyOpen(false); await load(); setSaveState('saved'); }
    catch { setSaveState('error'); }
  };
  const onAcceptDay = async (day) => { setSaveState('saving'); try { await acceptDaySuggestion(rid, null, day); await load(); setSaveState('saved'); } catch { setSaveState('error'); } };
  const onSetDay = async (level) => {
    if (dayLevelDay == null) return;
    setSaveState('saving');
    try { await setDemandDayLevel(rid, null, dayLevelDay, level); setDayLevelDay(null); await load(); setSaveState('saved'); }
    catch { setSaveState('error'); }
  };

  const quietSlotToday = blocks.find((b) => (localByDay[selectedDay] || {})[b.start] === 'quiet');
  const requestIdea = async () => {
    if (!quietSlotToday) return;
    setReqMsg('sending');
    try { await requestDemandOpportunity(rid, null, { day_of_week: selectedDay, start_time: quietSlotToday.start, end_time: quietSlotToday.end }); setReqMsg('sent'); }
    catch { setReqMsg('error'); }
  };

  const handleBack = () => {
    if (saveState === 'saving' || saveState === 'error') { setBackGuard(true); return; }
    navigate(-1);
  };

  if (loading) return <div className="p-4 space-y-3"><div className="h-16 skeleton-t rounded-2xl" /><div className="h-64 skeleton-t rounded-2xl" /></div>;
  if (denied) return (
    <div className="p-6 text-center" dir="rtl">
      <span className="material-symbols-outlined text-[36px] text-tamam-text-muted">lock</span>
      <p className="text-tamam-text font-bold mt-2">ما عندك صلاحية تعديل جدول الحركة.</p>
      <button onClick={handleBack} className="mt-4 h-11 px-4 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">رجوع</button>
    </div>
  );
  if (error) return (
    <div className="p-6 text-center" dir="rtl">
      <p className="text-tamam-text font-bold">ما قدرنا نحمّل الجدول.</p>
      <button onClick={load} className="mt-4 h-11 px-4 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm">حاول مرة ثانية</button>
    </div>
  );

  const dp = (dayProfiles || []).find((d) => d.day_of_week === selectedDay);
  const saveMeta = { idle: 'text-tamam-text-muted', saving: 'text-tamam-gold', saved: 'text-tamam-green-bright', error: 'text-tamam-error' };
  const openHour = toMin(operating.open) != null ? Math.floor(toMin(operating.open) / 60) : 10;

  return (
    <div className="pb-6" dir="rtl">
      <div className="sticky top-0 z-20 bg-tamam-bg/95 backdrop-blur-xl border-b border-tamam-outline/20 px-3 py-2 flex items-center gap-2">
        <button onClick={handleBack} aria-label="رجوع" className="w-10 h-10 flex items-center justify-center rounded-xl bg-tamam-surface"><span className="material-symbols-outlined text-tamam-text text-[22px]">arrow_forward</span></button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm text-tamam-text leading-tight">حركة المطعم بالأسبوع</h1>
          <span className="text-[10px] text-tamam-text-muted truncate block">{activeRestaurant?.name_ar || activeRestaurant?.name || '—'} · الفرع الرئيسي</span>
        </div>
        <span className={`text-[10px] font-bold ${saveMeta[saveState]}`}>{SAVE_LABEL[saveState]}</span>
        <button onClick={() => setHelpOpen(true)} aria-label="مساعدة" className="w-10 h-10 flex items-center justify-center rounded-xl bg-tamam-surface"><span className="material-symbols-outlined text-tamam-text text-[22px]">help</span></button>
      </div>

      <div className="px-4 pt-3">
        <p className="text-[12px] text-tamam-text-muted leading-snug mb-3">علّمنا متى الحركة هادئة، متوسطة أو ضغط. بتقدر تغيّرها بأي وقت.</p>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
          {DAY_NAMES.map((name, d) => {
            const on = selectedDay === d;
            const w = (summary?.week || [])[d];
            const done = w && w.classified > 0;
            return (
              <button key={d} onClick={() => { if (saveState !== 'saving') { setSelectedDay(d); setPaintSel(new Set()); } }} aria-pressed={on}
                className={`shrink-0 min-w-[48px] h-12 px-3 rounded-xl flex flex-col items-center justify-center border transition ${on ? 'bg-tamam-green text-tamam-ink border-tamam-green' : 'bg-tamam-surface text-tamam-text border-tamam-outline/30'}`}>
                <span className="text-[12px] font-bold leading-none">{name}</span>
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${done ? (on ? 'bg-tamam-ink' : 'bg-tamam-green-bright') : 'bg-tamam-text-muted/40'}`} />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-2 mt-1">
          <h2 className="font-bold text-base text-tamam-text">{DAY_NAMES[selectedDay]}</h2>
          <button onClick={() => setPaintActive((v) => !v)} className={`text-[11px] font-bold h-9 px-3 rounded-xl border ${paintActive ? 'bg-tamam-green/15 text-tamam-green-bright border-tamam-green/40' : 'bg-tamam-surface text-tamam-text-muted border-tamam-outline/30'}`}>
            <span className="material-symbols-outlined text-[14px] align-middle">grid_view</span> حدد أكثر من ساعة
          </button>
        </div>

        <div className="text-[11px] text-tamam-text-muted mb-2 flex items-center justify-between">
          <span>ساعات العمل: {operating.open} – {operating.close}</span>
          <button onClick={() => setShowAll24((v) => !v)} className="text-tamam-green-bright font-bold">{showAll24 ? 'ساعات العمل فقط' : 'كل 24 ساعة'}</button>
        </div>

        {paintActive && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button onClick={() => applyPeriod({ from: openHour, to: 12 })} className="text-[10px] font-bold h-8 px-2.5 rounded-lg bg-tamam-surface text-tamam-text-muted border border-tamam-outline/30">كل الصبح</button>
            <button onClick={() => applyPeriod({ from: 12, to: 15 })} className="text-[10px] font-bold h-8 px-2.5 rounded-lg bg-tamam-surface text-tamam-text-muted border border-tamam-outline/30">وقت الغدا</button>
            <button onClick={() => applyPeriod({ from: 15, to: 18 })} className="text-[10px] font-bold h-8 px-2.5 rounded-lg bg-tamam-surface text-tamam-text-muted border border-tamam-outline/30">بعد الظهر</button>
            <button onClick={() => applyPeriod({ from: 18, to: 22 })} className="text-[10px] font-bold h-8 px-2.5 rounded-lg bg-tamam-surface text-tamam-text-muted border border-tamam-outline/30">المساء</button>
            <button onClick={() => setPaintSel(new Set(blocks.map((b) => b.start)))} className="text-[10px] font-bold h-8 px-2.5 rounded-lg bg-tamam-surface text-tamam-text-muted border border-tamam-outline/30">كل ساعات العمل</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {blocks.map((b) => {
            const level = (localByDay[selectedDay] || {})[b.start] || 'unknown';
            const m = levelMeta(level);
            const sel = paintSel.has(b.start);
            return (
              <button key={b.start} onClick={() => (paintActive ? togglePaint(b.start) : setHourSheet({ start: b.start, end: b.end, level }))}
                aria-label={accessibleName(DAY_NAMES[selectedDay], b.start, b.end, level)}
                className={`relative h-14 rounded-xl border flex flex-col items-center justify-center text-center transition ${paintActive && sel ? 'ring-2 ring-tamam-green' : ''} ${level === 'unknown' ? 'bg-tamam-surface-low border-tamam-outline/30' : `${m.bg} ${m.border}`}`}>
                <span className="text-[11px] font-bold text-tamam-text">{b.start}</span>
                <span className={`text-[10px] flex items-center gap-0.5 ${m.text}`}><span className="material-symbols-outlined text-[12px]">{m.icon}</span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {dp && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-tamam-text-muted">
            <span className="material-symbols-outlined text-[14px]">info</span>
            <span>تصنيف اليوم: {levelMeta(dp.effective_demand_level).label} · {SOURCE_LABEL[dp.source] || 'حددته أنت'}{dp.explanation ? ` · ${dp.explanation}` : ''}</span>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={() => setCopyOpen(true)} className="flex-1 h-11 rounded-xl bg-tamam-surface border border-tamam-outline/30 text-tamam-text font-bold text-sm">انسخ هذا اليوم</button>
          {quietSlotToday && (
            <button onClick={requestIdea} disabled={reqMsg === 'sending'} className="flex-1 h-11 rounded-xl bg-tamam-green/15 text-tamam-green-bright border border-tamam-green/40 font-bold text-sm">
              {reqMsg === 'sent' ? 'وصل طلبك ✓' : reqMsg === 'sending' ? 'جاري…' : 'اطلب اقتراح لوقت هادئ'}
            </button>
          )}
        </div>
        {reqMsg === 'sent' && <p className="text-[11px] text-tamam-green-bright mt-2 text-center">وصل طلبك لتمام. بنجهز الاقتراح ومنخبرك لما يصير جاهز.</p>}
        {reqMsg === 'error' && <p className="text-[11px] text-tamam-error mt-2 text-center">ما قدرنا نرسل الطلب، جرّب مرة ثانية.</p>}

        {saveState === 'error' && (
          <div className="mt-3 bg-tamam-error/10 border border-tamam-error/30 rounded-xl p-3 text-center">
            <p className="text-[11px] text-tamam-error font-bold mb-2">ما قدرنا نحفظ التعديل. اختياراتك ضلت موجودة.</p>
            <button onClick={() => persistDay(selectedDay, { ...(localByDay[selectedDay] || {}) })} className="h-10 px-4 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-xs">حاول مرة ثانية</button>
          </div>
        )}
      </div>

      <div className="px-4 mt-5">
        <h2 className="font-bold text-base text-tamam-text mb-1">قوة الأيام</h2>
        <p className="text-[11px] text-tamam-text-muted mb-3">حدد الأيام اللي عادة بتكون هادئة أو متوسطة أو ضغط.</p>
        <div className="space-y-2">
          {DAY_NAMES.map((_, d) => (
            <DemandDayStrengthRow key={d} day={d} dayProfile={(dayProfiles || []).find((x) => x.day_of_week === d)} weekItem={(summary?.week || [])[d]} onAccept={onAcceptDay} onSet={(day) => setDayLevelDay(day)} />
          ))}
        </div>
      </div>

      {paintActive && <DemandPaintBar activeLevel={paintLevel} setLevel={setPaintLevel} count={paintSel.size} onApply={paintApply} onExit={() => { setPaintActive(false); setPaintSel(new Set()); }} />}

      <DemandHourSheet open={!!hourSheet} dayName={DAY_NAMES[selectedDay]} start={hourSheet?.start} end={hourSheet?.end} level={hourSheet?.level} onApply={applyHour} onClose={() => setHourSheet(null)} />
      <DemandCopySheet open={copyOpen} fromDay={selectedDay} onApply={doCopy} onClose={() => setCopyOpen(false)} />
      <DayLevelSheet open={dayLevelDay != null} day={dayLevelDay} current={(dayProfiles || []).find((x) => x.day_of_week === dayLevelDay)?.effective_demand_level} onApply={onSetDay} onClose={() => setDayLevelDay(null)} />

      <Sheet open={backGuard} onOpenChange={(o) => !o && setBackGuard(false)}>
        <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
          <h2 className="font-bold text-base">في تعديلات لسه ما انحفظت</h2>
          <div className="flex flex-col gap-2 mt-4">
            <button onClick={async () => { setBackGuard(false); const ok = await persistDay(selectedDay, { ...(localByDay[selectedDay] || {}) }); if (ok) navigate(-1); }} disabled={saveState === 'saving'} className="h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm disabled:opacity-50 disabled:active:scale-100">احفظ واطلع</button>
            <button onClick={() => setBackGuard(false)} className="h-12 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">كمّل التعديل</button>
            <button onClick={() => { setBackGuard(false); navigate(-1); }} className="h-12 rounded-xl bg-tamam-surface text-tamam-text-muted font-bold text-sm">اطلع بدون حفظ</button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={helpOpen} onOpenChange={(o) => !o && setHelpOpen(false)}>
        <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
          <h2 className="font-bold text-base mb-3">المعنى والألوان</h2>
          <div className="space-y-2">
            {LEVEL_ORDER.map((k) => {
              const m = LEVELS[k];
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center ${m.bg} ${m.text}`}><span className="material-symbols-outlined text-[20px]">{m.icon}</span></span>
                  <div><p className="text-sm font-bold">{m.label}</p><p className="text-[11px] text-tamam-text-muted">{m.sub}</p></div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-tamam-outline/30 text-[11px] text-tamam-text-muted space-y-1">
            <p><b className="text-tamam-text">المصدر:</b> كل تصنيف بيبيّن منين جاء — {Object.values(SOURCE_LABEL).join('، ')}.</p>
            <p>هالألوان معناها داخل جدول الحركة بس.</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}