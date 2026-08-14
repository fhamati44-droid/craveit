import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listMenuCandidates, updateMenuCandidate, resolveDuplicate, publishMenuCandidates } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const TABS = [
  { key: 'needs_review', label: 'محتاج مراجعة' },
  { key: 'ready', label: 'جاهز للنشر' },
  { key: 'imported', label: 'منشور' },
  { key: 'issues', label: 'فيه مشكلة' },
];
const FIELD_LABEL = { name: 'الاسم', price: 'السعر', image: 'الصورة', category: 'التصنيف' };

export default function PartnerMenuDrafts() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [tab, setTab] = useState('needs_review');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [dup, setDup] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    if (!rid) return;
    setLoading(true);
    listMenuCandidates(rid, null, tab).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  };
  useEffect(load, [rid, tab]);

  const readyItems = useMemo(() => items.filter((c) => c.review_status === 'ready'), [items]);

  const publishReady = async () => {
    if (!readyItems.length) return;
    setPublishing(true); setMsg(null);
    try {
      const res = await publishMenuCandidates(rid, readyItems.map((c) => c.id));
      setMsg(`تم نشر ${res.created} صنف${res.skipped ? ` · ${res.skipped} متخطى` : ''}`);
      load();
    } catch (e) { setMsg('ما قدرنا ننشر. جرّب مرة ثانية.'); }
    finally { setPublishing(false); }
  };

  return (
    <div className="pb-28" dir="rtl">
      <div className="sticky top-0 z-20 bg-tamam-bg/95 backdrop-blur-xl border-b border-tamam-outline/20 px-3 py-2 flex items-center gap-2">
        <button onClick={() => navigate('/partner/menu')} aria-label="رجوع" className="w-10 h-10 flex items-center justify-center rounded-xl bg-tamam-surface"><span className="material-symbols-outlined text-tamam-text text-[22px]">arrow_forward</span></button>
        <div className="flex-1"><h1 className="font-bold text-sm text-tamam-text">مراجعة الأصناف</h1><p className="text-[10px] text-tamam-text-muted">كل صنف بيدخل كمسودة قبل النشر.</p></div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 pt-3">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 h-9 px-3 rounded-full text-xs font-bold ${tab === t.key ? 'bg-tamam-green-bright text-tamam-ink' : 'bg-tamam-surface text-tamam-text-muted'}`}>{t.label}</button>
        ))}
      </div>

      <div className="px-4 mt-3 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton-t rounded-2xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon="📝" title="ما في أصناف بهالتبويب" subtitle="لمّا تختار أصناف من الكتالوج رح تظهر هون للمراجعة." actionLabel="أضف أصناف" onAction={() => navigate('/partner/menu/add/catalog')} />
        ) : (
          items.map((c) => <CandidateCard key={c.id} c={c} onEdit={() => setEdit(c)} onDup={() => setDup(c)} />)
        )}
      </div>

      {readyItems.length > 0 && tab !== 'imported' && (
        <div className="fixed bottom-16 inset-x-0 z-30 pointer-events-none">
          <div className="max-w-[430px] mx-auto px-3 flex justify-center">
            <button onClick={publishReady} disabled={publishing} className="pointer-events-auto h-12 px-5 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">publish</span>{publishing ? 'جاري النشر…' : `انشر الأصناف الجاهزة (${readyItems.length})`}
            </button>
          </div>
        </div>
      )}
      {msg && <div className="fixed bottom-28 inset-x-0 text-center px-4"><span className="bg-tamam-surface border border-tamam-outline/40 text-tamam-text text-xs font-bold px-3 py-1.5 rounded-full">{msg}</span></div>}

      <CandidateEditSheet open={!!edit} c={edit} rid={rid} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      <DuplicateSheet open={!!dup} c={dup} rid={rid} onClose={() => setDup(null)} onResolved={() => { setDup(null); load(); }} />
    </div>
  );
}

function CandidateCard({ c, onEdit, onDup }) {
  const u = c.user_changes || {};
  const name = u.name || c.detected_name || 'صنف';
  const price = u.price != null ? u.price : c.detected_price;
  const img = u.image || c.detected_image;
  const missing = c.missing_fields || [];
  const mapped = !!c.mapped_master_catalog_product_id;
  const dupWarn = c.duplicate_status === 'exact' || c.duplicate_status === 'likely' || c.duplicate_status === 'unresolved';
  const rightsWarn = c.usage_permission_status !== 'approved';

  let action = 'كمّل الصنف';
  if (c.review_status === 'imported') action = 'تم النشر ✓';
  else if (dupWarn && c.duplicate_status !== 'unresolved') action = 'حل التكرار';
  else if (!img) action = 'راجع الصورة';
  else if (c.review_status === 'ready') action = 'جاهز للنشر';

  return (
    <div className={`bg-tamam-surface-low rounded-2xl border p-3 ${c.review_status === 'ready' ? 'border-tamam-green/40' : c.review_status === 'imported' ? 'border-tamam-outline/20 opacity-70' : 'border-tamam-outline/30'}`}>
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-xl bg-tamam-surface overflow-hidden shrink-0 flex items-center justify-center">{img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-tamam-text-muted/40 text-[20px]">fastfood</span>}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-tamam-text truncate">{name}</p>
            {mapped && <span className="text-[9px] bg-tamam-green/15 text-tamam-green-bright px-1.5 py-0.5 rounded shrink-0">مربوط</span>}
          </div>
          <p className="text-[11px] text-tamam-text-muted">{u.category || c.detected_category || '—'} · {price != null ? `${Math.round(price)} ₪` : 'بدون سعر'}</p>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {missing.map((m) => <span key={m} className="text-[9px] bg-tamam-error/15 text-tamam-error px-1.5 py-0.5 rounded">ناقص {FIELD_LABEL[m] || m}</span>)}
            {dupWarn && <span className="text-[9px] bg-tamam-gold/15 text-tamam-gold px-1.5 py-0.5 rounded">في صنف مشابه موجود</span>}
            {rightsWarn && <span className="text-[9px] bg-tamam-error/15 text-tamam-error px-1.5 py-0.5 rounded">الصورة محتاجة تأكيد</span>}
          </div>
        </div>
      </div>
      {c.review_status !== 'imported' && (
        <div className="flex gap-2 mt-2.5">
          {dupWarn ? (
            <button onClick={onDup} className="flex-1 h-10 rounded-xl bg-tamam-gold/15 text-tamam-gold border border-tamam-gold/40 font-bold text-xs">حل التكرار</button>
          ) : (
            <button onClick={onEdit} className="flex-1 h-10 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-xs">{action}</button>
          )}
          <button onClick={onEdit} className="h-10 px-3 rounded-xl bg-tamam-surface text-tamam-text-muted font-bold text-xs">تعديل</button>
        </div>
      )}
    </div>
  );
}

function CandidateEditSheet({ open, c, rid, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (c) setForm({ ...(c.user_changes || {}) }); }, [c]);
  if (!c) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true);
    try { await updateMenuCandidate(rid, c.id, form); onSaved?.(); } catch {} finally { setSaving(false); }
  };
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <h2 className="font-bold text-base mb-1">راجع الصنف</h2>
        <p className="text-[11px] text-tamam-text-muted mb-3">{c.detected_name}</p>
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
          <Field label="اسم الصنف عندك"><input value={form.name || ''} onChange={(e) => set('name', e.target.value)} className="ipt" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="السعر ₪"><input value={form.price ?? ''} onChange={(e) => set('price', e.target.value)} inputMode="decimal" className="ipt" /></Field>
            <Field label="التصنيف"><input value={form.category || ''} onChange={(e) => set('category', e.target.value)} className="ipt" /></Field>
          </div>
          <Field label="الوصف"><textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={2} className="ipt resize-none" /></Field>
          <Field label="رابط الصورة"><input value={form.image || ''} onChange={(e) => set('image', e.target.value)} dir="ltr" className="ipt" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="وقت التحضير (دقيقة)"><input value={form.prep_time ?? ''} onChange={(e) => set('prep_time', e.target.value)} inputMode="numeric" className="ipt" /></Field>
            <Field label="أقصى كمية يومية"><input value={form.max_daily_quantity ?? ''} onChange={(e) => set('max_daily_quantity', e.target.value)} inputMode="numeric" className="ipt" /></Field>
          </div>
          <label className="flex items-center justify-between"><span className="text-[12px] text-tamam-text">سماح لتمام تستخدمه بالحملات</span><input type="checkbox" checked={form.campaign_permission !== false} onChange={(e) => set('campaign_permission', e.target.checked)} className="w-5 h-5 accent-tamam-green" /></label>
          {(!form.image) && <p className="text-[10px] text-tamam-error flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">warning</span>الصورة محتاجة تأكيد قبل النشر — ارفع صورة مطعمك.</p>}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving} className="flex-1 h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform">{saving ? 'جاري…' : 'حفظ'}</button>
          <button onClick={onClose} className="flex-1 h-12 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">إلغاء</button>
        </div>
        <style>{`.ipt{width:100%;height:44px;background:#181D1A;border:1px solid rgba(64,73,60,.3);border-radius:12px;padding:8px 12px;font-size:14px;color:#DFE3E0;outline:none}`}</style>
      </SheetContent>
    </Sheet>
  );
}

function DuplicateSheet({ open, c, rid, onClose, onResolved }) {
  if (!c) return null;
  const decide = async (decision) => {
    try { await resolveDuplicate(rid, c.id, decision); onResolved?.(); } catch {}
  };
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <h2 className="font-bold text-base mb-1">هل هدول نفس الصنف؟</h2>
        <p className="text-[11px] text-tamam-text-muted mb-3">لقطينا صنف مشابه موجود بمنيوك: «{c.detected_name}».</p>
        <div className="space-y-2">
          <button onClick={() => decide('update')} className="w-full h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm">نفس الصنف — حدّث الموجود</button>
          <button onClick={() => decide('new')} className="w-full h-12 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">صنف مختلف — أنشئ جديد</button>
          <button onClick={() => decide('later')} className="w-full h-12 rounded-xl bg-tamam-surface text-tamam-text-muted font-bold text-sm">راجع لاحقًا</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }) {
  return (<div><span className="block text-[11px] text-tamam-text-muted mb-1">{label}</span>{children}</div>);
}