import { useState } from 'react';
import { Power, RefreshCw, Search, Calendar, Sparkles, Trash2, ShieldAlert, Activity } from 'lucide-react';
import { TABS, COLOR_CLS, STATUS_COLOR, fmtWin } from '@/lib/executionLabels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

// ---------- Header + kill switch ----------
export function ExecutionHeader({ control, onToggle, onSeed, onReset, onRefresh, loading }) {
  const [confirm, setConfirm] = useState(null); // 'pause' | 'resume'
  const [reason, setReason] = useState('');
  const paused = !!control?.paused;
  const submit = () => { onToggle(confirm === 'pause', reason || (confirm === 'pause' ? 'manual_pause' : 'manual_resume')); setConfirm(null); setReason(''); };
  return (
    <div className="bg-[#0B0F0D] text-tamam-text border-b border-tamam-outline">
      <div className="max-w-[1400px] mx-auto px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tamam-green/15 flex items-center justify-center"><Activity className="w-5 h-5 text-tamam-green-bright" /></div>
          <div>
            <h1 className="text-lg font-bold text-white font-tamam">مركز تنفيذ الطلب</h1>
            <p className="text-[11px] text-tamam-text-muted">غرفة عمليات TAMAM — مراقبة وتدخّل آمن</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setConfirm(paused ? 'resume' : 'pause')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition active:scale-95 ${paused ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-green-500/15 text-green-300 border-green-500/40'}`}>
            <Power className="w-4 h-4" /> التشغيل الآلي: {paused ? 'موقوف' : 'مفعّل'}
          </button>
          <button onClick={onSeed} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-tamam-green text-tamam-ink disabled:opacity-50 active:scale-95"><Sparkles className="w-4 h-4" /> بيانات تجريبية</button>
          <button onClick={onReset} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-tamam-outline text-tamam-text-muted disabled:opacity-50 active:scale-95"><Trash2 className="w-4 h-4" /> تصفير</button>
          <button onClick={onRefresh} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-tamam-outline text-tamam-text-muted disabled:opacity-50 active:scale-95"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث</button>
        </div>
      </div>
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">{confirm === 'pause' ? 'إيقاف التشغيل الآلي' : 'استئناف التشغيل الآلي'}</DialogTitle>
            <DialogDescription className="text-right">{confirm === 'pause' ? 'هاد رح يمنع أي تفعيل آلي جديد. الطلبات المدفوعة ما تتأثر.' : 'رح يسمح بتفعيل الحملات الآلية ضمن الحدود من جديد.'}</DialogDescription>
          </DialogHeader>
          {confirm === 'pause' && (
            <div className="py-2">
              <label className="text-xs font-bold text-gray-500">السبب (اختياري)</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: مراجعة شاملة" dir="rtl" className="mt-1" />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>إلغاء</Button>
            <Button className={confirm === 'pause' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} onClick={submit}>{confirm === 'pause' ? 'أوقف' : 'استأنف'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Tabs ----------
export function ExecutionTabs({ active, counts, onChange }) {
  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-[1400px] mx-auto px-5 flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const c = COLOR_CLS[t.color];
          const n = counts[t.key] || 0;
          const on = active === t.key;
          return (
            <button key={t.key} onClick={() => onChange(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition ${on ? c.text + ' border-current' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              {t.label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${on ? c.bg + ' ' + c.text : 'bg-gray-100 text-gray-500'}`}>{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Filters ----------
export function ExecutionFilters({ filters, onChange, restaurants }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  const sel = (k, opts, placeholder) => (
    <select value={filters[k] || ''} onChange={(e) => set(k, e.target.value)}
      className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700">
      <option value="">{placeholder}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const hasFilters = filters.search || filters.restaurant_id || filters.objective || filters.mechanism || filters.automation || filters.period || filters.needs_approval;
  return (
    <div className="flex items-center gap-2 flex-wrap px-5 py-3 bg-gray-50 border-b border-gray-200">
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={filters.search || ''} onChange={(e) => set('search', e.target.value)} placeholder="ابحث: مطعم، حملة، منتج، عرض…"
          className="pr-9 pl-3 py-2 rounded-lg border border-gray-200 text-sm w-64 bg-white" dir="rtl" />
      </div>
      {sel('restaurant_id', (restaurants || []).map((r) => [r.id, r.name]), 'كل المطاعم')}
      {sel('objective', Object.entries({ NEW_CUSTOMERS: 'زباين جدد', REACTIVATION: 'إعادة زباين', SURPLUS: 'فائض', LOYALTY_ENGAGEMENT: 'ولاء', INCREASE_AOV: 'رفع السلة', IMMEDIATE_DEMAND: 'طلب فوري', CONVERSION_RECOVERY: 'استرداد نية', STRENGTHEN_ITEM: 'تقوية صنف' }), 'كل الأهداف')}
      {sel('mechanism', Object.entries({ FIRST_TRIAL: 'تجربة أولى', VALUE_ADD: 'قيمة مضافة', TIME_AND_QUANTITY: 'وقت وكمية', POINT_LOCKED: 'نقاط', PERSONALIZED_VALUE: 'قيمة شخصية', PLUS_UPSELL: 'بلس' }), 'كل الاستراتيجيات')}
      {sel('automation', [['MANUAL', 'يدوي'], ['AUTO', 'تلقائي ضمن الحدود']], 'يدوي/تلقائي')}
      {sel('period', [['today', 'اليوم'], ['week', 'هالأسبوع']], 'الفترة')}
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input type="checkbox" checked={!!filters.needs_approval} onChange={(e) => set('needs_approval', e.target.checked)} className="w-4 h-4 accent-tamam-green" />
        تحتاج موافقة
      </label>
      {hasFilters && <button onClick={() => onChange({})} className="text-xs text-gray-500 underline">مسح الفلاتر</button>}
    </div>
  );
}

// ---------- Today timeline ----------
export function TodayTimeline({ timeline, onPick }) {
  if (!timeline || !timeline.length) return <div className="px-5 py-8 text-center text-sm text-gray-400">ما في حملات بهالفترة</div>;
  return (
    <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-tamam-green-dark" /><span className="text-sm font-bold text-gray-700">خط الزمن</span></div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {timeline.map((t) => {
          const c = COLOR_CLS[STATUS_COLOR[t.status]] || COLOR_CLS.gray;
          const dot = t.health?.color === 'green' ? '#2DB34A' : t.health?.color === 'amber' ? '#F59E0B' : t.health?.color === 'red' ? '#E53E3E' : '#9CA3AF';
          return (
            <button key={t.plan_id} onClick={() => onPick(t.plan_id)}
              className={`flex-shrink-0 text-right rounded-xl border ${c.border} ${c.soft} px-3 py-2 w-44 hover:shadow-sm transition active:scale-95`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${c.text}`}>{t.status_ar}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
              </div>
              <p className="text-xs font-bold text-gray-800 mt-1 truncate">{t.restaurant_name}</p>
              <p className="text-[11px] text-gray-500 truncate">{t.product_label}</p>
              <p className="text-[11px] text-gray-600 mt-1">{fmtWin(t.start_at, t.end_at)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Empty / Error ----------
export function CenterEmptyState({ tab }) {
  const map = { READY: 'ما في خطط جاهزة للتنفيذ', SCHEDULED: 'ما في حملات مجدولة', EXECUTED: 'ما في حملات شغالة هسّا', PAUSED: 'ما في حملات موقوفة', APPROVAL_REQUIRED: 'ما في خطط تحتاج موافقة', COMPLETED: 'ما في حملات منتهية' };
  return (
    <div className="px-5 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Calendar className="w-7 h-7 text-gray-400" /></div>
      <p className="text-gray-500 font-bold">{map[tab] || 'ما في بيانات'}</p>
      <p className="text-xs text-gray-400 mt-1">اضغط «بيانات تجريبية» لتجهيز بطاقات العرض</p>
    </div>
  );
}

export function CenterErrorState({ message, onRetry }) {
  return (
    <div className="px-5 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><ShieldAlert className="w-7 h-7 text-red-500" /></div>
      <p className="text-red-600 font-bold">صار خطأ بالتحميل</p>
      <p className="text-xs text-gray-500 mt-1">{message || 'حاول مرة ثانية'}</p>
      <button onClick={onRetry} className="mt-4 px-4 py-2 rounded-xl bg-tamam-green text-tamam-ink text-sm font-bold active:scale-95">حدّث وحاول مرة ثانية</button>
    </div>
  );
}