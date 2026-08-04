import { useState, useEffect } from 'react';
import { Check, X, Pause, Star, Flag, Award, Archive, Settings, FileText, Heart, Eye } from 'lucide-react';
import {
  adminGetProposals, adminGetReports, adminGetComments, adminGetAuditLog,
  adminApproveProposal, adminRejectProposal, adminPauseProposal, adminFeatureProposal,
  adminSetTarget, adminModerateComment, adminInvalidateLikes, adminApproveReward,
  adminRejectReward, adminArchiveProposal, adminSaveConfig, getConfig,
  adminTestProposalVisibility,
  adminTestPublishFlow,
} from '@/lib/communityMoodApi';
import { useNavigate } from 'react-router-dom';
import TamamAvatar from '@/components/community/TamamAvatar';

const TABS = [
  { key: 'pending', label: 'اقتراحات جديدة', icon: FileText },
  { key: 'published', label: 'منشورة', icon: Check },
  { key: 'reached', label: 'وصلت للهدف', icon: Heart },
  { key: 'rewards', label: 'مراجعة المكافآت', icon: Award },
  { key: 'comments', label: 'التعليقات', icon: FileText },
  { key: 'reports', label: 'المبلّغ عنها', icon: Flag },
  { key: 'settings', label: 'الإعدادات', icon: Settings },
  { key: 'audit', label: 'سجل التغييرات', icon: Eye },
];

export default function CommunityMoodsAdmin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    if (tab === 'pending') adminGetProposals('pending_review').then(setData).finally(() => setLoading(false));
    else if (tab === 'published') adminGetProposals('published').then(setData).finally(() => setLoading(false));
    else if (tab === 'reached') adminGetProposals('all').then((p) => setData((p || []).filter((x) => x.valid_likes_count >= x.target_likes))).finally(() => setLoading(false));
    else if (tab === 'rewards') adminGetProposals('all').then((p) => setData((p || []).filter((x) => x.reward_status === 'pending'))).finally(() => setLoading(false));
    else if (tab === 'comments') adminGetComments().then(setData).finally(() => setLoading(false));
    else if (tab === 'reports') adminGetReports().then(setData).finally(() => setLoading(false));
    else if (tab === 'audit') adminGetAuditLog().then(setData).finally(() => setLoading(false));
    else if (tab === 'settings') getConfig().then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const action = async (fn, ...args) => { await fn(...args); load(); };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">إدارة مودات المجتمع</h1>
          <button onClick={() => navigate('/admin/community-moods/game-references')} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg">
            فيديوهات المرجع
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto mb-4 pb-1 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold ${tab === t.key ? 'bg-tamam-green text-white' : 'bg-white text-gray-600'}`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {loading ? <p className="text-center text-gray-500 py-8">جاري التحميل...</p> : (
          <>
            {(tab === 'pending' || tab === 'published' || tab === 'reached' || tab === 'rewards') && (
              <ProposalList tab={tab} proposals={data || []} onAction={action} />
            )}
            {tab === 'comments' && <CommentList comments={data || []} onAction={action} />}
            {tab === 'reports' && <ReportList reports={data || []} onAction={action} />}
            {tab === 'audit' && <AuditList logs={data || []} />}
            {tab === 'settings' && <ConfigEditor config={data} onSave={action} />}
          </>
        )}
      </div>
    </div>
  );
}

function ProposalList({ tab, proposals, onAction }) {
  if (!proposals.length) return <p className="text-center text-gray-500 py-8">لا يوجد اقتراحات</p>;
  return (
    <div className="space-y-3">
      {proposals.map((p) => (
        <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-start gap-3">
            <TamamAvatar type={p.creator_avatar_type} avatarKey={p.creator_avatar_key} url={p.creator_avatar_url} size={36} />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">{p.mood_title_ar}</h3>
              <p className="text-gray-500 text-xs">{p.creator_display_name} · {new Date(p.created_date).toLocaleDateString('ar')}</p>
              {p.description_ar && <p className="text-gray-600 text-xs mt-1 line-clamp-2">{p.description_ar}</p>}
              <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
                <span className={`px-1.5 py-0.5 rounded font-bold ${p.status === 'published' ? 'bg-green-100 text-green-700' : p.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                <span className={`px-1.5 py-0.5 rounded ${p.moderation_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{p.moderation_status}</span>
                {p.is_featured && <span className="text-yellow-500 font-bold">⭐ مميز</span>}
                <span className="text-gray-500">♥ {p.valid_likes_count}/{p.target_likes}</span>
                <span className="text-gray-500">💬 {p.comments_count}</span>
                <span className="text-gray-500">🔗 {p.shares_count}</span>
                <span className="font-bold text-tamam-green">{p.package_type}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tab === 'pending' && (
              <>
                <button onClick={() => onAction(adminApproveProposal, p.id)} className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Check size={12} /> موافقة ونشر</button>
                <button onClick={() => onAction(adminRejectProposal, p.id, prompt('سبب الرفض؟'))} className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><X size={12} /> ارفض</button>
              </>
            )}
            {tab === 'published' && (
              <>
                <button onClick={() => onAction(adminPauseProposal, p.id)} className="bg-gray-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Pause size={12} /> إيقاف</button>
                <button onClick={() => onAction(adminFeatureProposal, p.id)} className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 ${p.is_featured ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700'}`}><Star size={12} /> {p.is_featured ? 'إلغاء التمييز' : 'ميّز'}</button>
                <button onClick={() => onAction(adminArchiveProposal, p.id)} className="bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Archive size={12} /> أرشفة</button>
              </>
            )}
            {tab === 'reached' && (
              <button onClick={() => onAction(adminSetTarget, p.id, Number(prompt('الهدف الجديد؟', p.target_likes)), p.target_likes)} className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg">تغيير الهدف</button>
            )}
            {tab === 'rewards' && (
              <>
                <button onClick={() => onAction(adminApproveReward, p.id, 'coupon')} className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Award size={12} /> اعتمد مكافأة</button>
                <button onClick={() => onAction(adminRejectReward, p.id)} className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg">رفض مكافأة</button>
              </>
            )}
            <button onClick={() => onAction(adminInvalidateLikes, p.id)} className="bg-orange-100 text-orange-700 text-xs px-3 py-1.5 rounded-lg">إبطال الإعجابات</button>
            <button onClick={() => window.open(`/community-moods/${p.id}`, '_blank')} className="bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-lg">فتح الصفحة العامة</button>
            <TestVisibilityButton proposalId={p.id} />
            <PublishFlowButton proposalId={p.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentList({ comments, onAction }) {
  if (!comments.length) return <p className="text-center text-gray-500 py-8">لا يوجد تعليقات</p>;
  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-xs">{c.user_display_name}</span>
            <span className="text-gray-400 text-[10px]">{new Date(c.created_date).toLocaleDateString('ar')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
          </div>
          <p className="text-sm text-gray-700">{c.body}</p>
          <div className="flex gap-2 mt-2">
            {c.status === 'active' && <button onClick={() => onAction(adminModerateComment, c.id, 'hidden')} className="text-xs text-red-500">إخفاء</button>}
            {c.status === 'hidden' && <button onClick={() => onAction(adminModerateComment, c.id, 'active')} className="text-xs text-green-500">إظهار</button>}
            <button onClick={() => onAction(adminModerateComment, c.id, 'deleted')} className="text-xs text-gray-500">حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportList({ reports, onAction }) {
  if (!reports.length) return <p className="text-center text-gray-500 py-8">لا يوجد بلاغات</p>;
  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-xs">{r.reason}</span>
            <span className="text-gray-400 text-[10px]">{new Date(r.created_date).toLocaleDateString('ar')}</span>
          </div>
          {r.details && <p className="text-sm text-gray-600">{r.details}</p>}
          <p className="text-[10px] text-gray-400 mt-1">مود: {r.proposal_id}</p>
        </div>
      ))}
    </div>
  );
}

function AuditList({ logs }) {
  if (!logs.length) return <p className="text-center text-gray-500 py-8">لا يوجد سجلات</p>;
  return (
    <div className="space-y-1">
      {logs.map((l, i) => (
        <div key={l.id || i} className="bg-white rounded-lg p-2 text-xs shadow-sm flex items-center justify-between">
          <div>
            <span className="font-bold">{l.action}</span>
            {l.admin_name && <span className="text-gray-500"> · {l.admin_name}</span>}
          </div>
          <span className="text-gray-400">{new Date(l.created_date).toLocaleString('ar')}</span>
        </div>
      ))}
    </div>
  );
}

function ConfigEditor({ config, onSave }) {
  const [form, setForm] = useState(config || {});

  useEffect(() => { if (config) setForm(config); }, [config]);

  const update = (key, val) => setForm({ ...form, [key]: val });

  const save = async () => {
    await onSave(adminSaveConfig, form);
    alert('تم الحفظ');
  };

  if (!form.id && !form.section_title_ar) return null;

  return (
    <div className="bg-white rounded-xl p-4 space-y-3 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">إعدادات قسم اللعبة</h2>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={form.is_enabled !== false} onChange={(e) => update('is_enabled', e.target.checked)} />
          مفعّل
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={form.section_title_ar || ''} onChange={(e) => update('section_title_ar', e.target.value)} placeholder="عنوان عربي" className="border rounded-lg px-2 py-1.5 text-sm" />
        <input value={form.section_title_he || ''} onChange={(e) => update('section_title_he', e.target.value)} placeholder="כותרת עברית" className="border rounded-lg px-2 py-1.5 text-sm" />
        <input value={form.section_subtitle_ar || ''} onChange={(e) => update('section_subtitle_ar', e.target.value)} placeholder="عنوان فرعي عربي" className="border rounded-lg px-2 py-1.5 text-sm col-span-2" />
        <input value={form.cta_primary_ar || ''} onChange={(e) => update('cta_primary_ar', e.target.value)} placeholder="زر رئيسي عربي" className="border rounded-lg px-2 py-1.5 text-sm" />
        <input value={form.cta_secondary_ar || ''} onChange={(e) => update('cta_secondary_ar', e.target.value)} placeholder="زر ثانوي عربي" className="border rounded-lg px-2 py-1.5 text-sm" />
        <input value={form.banner_poster_url || ''} onChange={(e) => update('banner_poster_url', e.target.value)} placeholder="رابط صورة البانر" className="border rounded-lg px-2 py-1.5 text-sm col-span-2" />
        <input value={form.preview_media_url || ''} onChange={(e) => update('preview_media_url', e.target.value)} placeholder="رابط فيديو المعاينة" className="border rounded-lg px-2 py-1.5 text-sm col-span-2" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-1 text-xs">
          <select value={form.selection_mode || 'automatic'} onChange={(e) => update('selection_mode', e.target.value)} className="border rounded px-2 py-1">
            <option value="automatic">تلقائي</option>
            <option value="manual">يدوي</option>
          </select>
          وضع الاختيار
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="number" value={form.max_cards || 6} onChange={(e) => update('max_cards', Number(e.target.value))} className="border rounded px-2 py-1 w-16" />
          أقصى عدد بطاقات
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="number" value={form.default_target_likes || 100} onChange={(e) => update('default_target_likes', Number(e.target.value))} className="border rounded px-2 py-1 w-16" />
          الهدف الافتراضي
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={form.multi_restaurant_enabled || false} onChange={(e) => update('multi_restaurant_enabled', e.target.checked)} />
          متعدد المطاعم
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={form.trusted_user_auto_publish || false} onChange={(e) => update('trusted_user_auto_publish', e.target.checked)} />
          نشر تلقائي للمستخدمين الموثوقين
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={form.avatar_profile_image_enabled || false} onChange={(e) => update('avatar_profile_image_enabled', e.target.checked)} />
          السماح بالصور الشخصية
        </label>
      </div>
      <button onClick={save} className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-lg w-full">حفظ الإعدادات</button>
    </div>
  );
}

function TestVisibilityButton({ proposalId }) {
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);

  const run = async () => {
    const r = await adminTestProposalVisibility(proposalId);
    setResult(r);
    setOpen(true);
  };

  return (
    <>
      <button onClick={run} className="bg-purple-100 text-purple-700 text-xs px-3 py-1.5 rounded-lg">فحص ظهور المود</button>
      {open && result && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-3">فحص ظهور المود</h3>
            <div className="space-y-1.5 text-xs">
              <Row label="معتمد؟" ok={result.is_approved} />
              <Row label="منشور؟" ok={result.is_published} />
              <Row label="عام؟" ok={result.is_public} />
              <Row label="صلاحية سارية؟" ok={!result.is_expired} />
              <Row label="وجبات صالحة؟" ok={result.has_valid_meal} />
              <Row label="مطعم صالح؟" ok={result.has_valid_restaurant} />
              <Row label="يظهر بالهوم؟" ok={result.included_by_homepage} />
            </div>
            {result.reason_if_excluded && (
              <p className="text-red-600 text-xs mt-3 bg-red-50 p-2 rounded">سبب الاستبعاد: {result.reason_if_excluded}</p>
            )}
            <button onClick={() => setOpen(false)} className="mt-3 w-full bg-gray-100 text-gray-700 text-xs py-2 rounded-lg">إغلاق</button>
          </div>
        </div>
      )}
    </>
  );
}

function PublishFlowButton({ proposalId }) {
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const r = await adminTestPublishFlow(proposalId);
      setResult(r);
      setOpen(true);
    } catch (e) {
      setResult({ error: e?.message || 'فشل الفحص' });
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={run} disabled={loading} className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50">
        {loading ? '...' : 'فحص مسار النشر'}
      </button>
      {open && result && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-3">فحص مسار النشر</h3>
            {result.error ? (
              <p className="text-red-600 text-xs">{result.error}</p>
            ) : (
              <div className="space-y-1.5 text-xs">
                <Row label="تم إنشاء السجل؟" ok={result.record_created} />
                <Row label="المنشئ صالح؟" ok={result.creator_valid} />
                <Row label="الوجبات صالحة؟" ok={result.meals_valid} />
                <Row label="المطعم صالح؟" ok={result.restaurant_valid} />
                <Row label="صورة الغلاف موجودة؟" ok={result.cover_generated} />
                <div className="flex items-center justify-between"><span className="text-gray-600">الحالة الحالية</span><span className="font-bold text-gray-800">{result.current_status}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-600">حالة المراجعة</span><span className="font-bold text-gray-800">{result.moderation_status}</span></div>
                <Row label="عام؟" ok={result.is_public} />
                <Row label="مدرج بالهوم؟" ok={result.included_in_homepage} />
              </div>
            )}
            {result?.reason_if_excluded && (
              <p className="text-red-600 text-xs mt-3 bg-red-50 p-2 rounded">سبب الاستبعاد: {result.reason_if_excluded}</p>
            )}
            <button onClick={() => setOpen(false)} className="mt-3 w-full bg-gray-100 text-gray-700 text-xs py-2 rounded-lg">إغلاق</button>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, ok }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={ok ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{ok ? '✓ نعم' : '✗ لا'}</span>
    </div>
  );
}