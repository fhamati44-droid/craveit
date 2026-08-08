import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  adminGetMoodGamePostDetail, adminStartReview, adminSaveReviewDecision,
  adminHidePost, adminUnhidePost, adminSimulate100Likes,
  PUBLISH_STATUS_META, REVIEW_STATUS_META,
} from '@/lib/moodGameAdminApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} دقيقة`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} ساعة`;
  return `${Math.floor(h / 24)} يوم`;
}

export default function MoodGamePostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [feasible, setFeasible] = useState(null);
  const [needsAdjust, setNeedsAdjust] = useState(null);
  const [componentNotes, setComponentNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const load = () => {
    setLoading(true);
    adminGetMoodGamePostDetail(postId)
      .then((d) => {
        setData(d);
        if (d?.reviews?.length) {
          setReviewNotes(d.reviews[0].admin_notes || '');
          setComponentNotes(d.reviews[0].component_notes || '');
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [postId]);

  const startReview = async () => {
    setSaving(true);
    try { await adminStartReview(postId); setActionMsg('بدأت المراجعة — الحالة صارت "قيد مراجعة TAMAM"'); load(); }
    finally { setSaving(false); }
  };

  const saveDecision = async (status) => {
    setSaving(true);
    try {
      await adminSaveReviewDecision(postId, {
        status, admin_notes: reviewNotes, feasible, needs_adjustment: needsAdjust, component_notes: componentNotes,
      });
      setActionMsg(status === 'approved' ? 'تم اعتماد الفكرة' : status === 'rejected' ? 'تم تسجيل عدم التنفيذ' : 'تم تسجيل الحاجة لتعديل');
      load();
    } finally { setSaving(false); }
  };

  const hide = async () => {
    if (!confirm('إخفاء المنشور من الموقع؟')) return;
    await adminHidePost(postId); setActionMsg('تم إخفاء المنشور'); load();
  };
  const unhide = async () => {
    await adminUnhidePost(postId); setActionMsg('تم إعادة نشر المنشور'); load();
  };
  const simulate100 = async () => {
    if (!confirm('محاكاة وصول المنشور لـ 100 لايك لأغراض الاختبار؟')) return;
    setSaving(true);
    try { await adminSimulate100Likes(postId); setActionMsg('تمت محاكاة 100 لايك — المنشور صار "وصل 100 لايك"'); load(); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-center text-on-surface-variant py-16">جاري التحميل...</p>;
  if (!data) return (
    <div className="text-center py-16">
      <p className="text-on-surface-variant mb-3">المنشور غير موجود</p>
      <Link to="/admin/mood-game/posts" className="text-primary font-bold">رجوع للقائمة</Link>
    </div>
  );

  const meals = data.meal_snapshots || [];
  const rests = data.restaurant_snapshots || [];
  const pubMeta = PUBLISH_STATUS_META[data.status] || PUBLISH_STATUS_META.draft;
  const revMeta = REVIEW_STATUS_META[data.review_status] || REVIEW_STATUS_META.normal;
  const target = data.target_likes || 100;
  const percent = Math.min(100, Math.round(((data.valid_likes_count || 0) / target) * 100));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 text-sm text-on-surface-variant">
        <Link to="/admin/mood-game/posts" className="hover:text-primary">مودات المجتمع</Link>
        <Icon name="chevron_left" className="text-[16px]" />
        <span className="text-primary font-medium">تفاصيل المنشور</span>
      </div>

      {actionMsg && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-sm text-primary flex items-center gap-2">
          <Icon name="check_circle" className="text-[20px]" /> {actionMsg}
        </div>
      )}

      {/* Post info */}
      <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0">
            {data.cover_image_url || meals[0]?.image_url
              ? <img src={data.cover_image_url || meals[0]?.image_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl">🎨</div>}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">{data.mood_title_ar}</h1>
            {data.description_ar && <p className="text-sm text-on-surface-variant mt-0.5">{data.description_ar}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${pubMeta.tone}`}>{pubMeta.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${revMeta.tone}`}>{revMeta.label}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Info label="ID" value={data.id} />
          <Info label="المستخدم" value={data.creator_display_name || '—'} />
          <Info label="User ID" value={data.creator_user_id || '—'} />
          <Info label="تاريخ الإنشاء" value={timeAgo(data.created_date)} />
          <Info label="الباقة" value={data.package_type || 'classic'} />
          <Info label="المشاهدات" value={data.views_count || 0} />
          {data.qualified_at && <Info label="وصل 100 في" value={timeAgo(data.qualified_at)} />}
          {data.linked_offer_id && <Info label="العرض المرتبط" value={data.linked_offer_id} />}
        </div>
      </div>

      {/* Social activity */}
      <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20">
        <h2 className="font-bold text-sm mb-3">النشاط الاجتماعي</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat icon="favorite" value={data.valid_likes_count || 0} label="لايك" />
          <Stat icon="chat_bubble" value={data.comments_count || 0} label="تعليق" />
          <Stat icon="share" value={data.shares_count || 0} label="مشاركة" />
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-on-surface-variant">{data.valid_likes_count || 0} / {target}</span>
            <span className="text-primary font-bold">{percent}%</span>
          </div>
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      {/* Selected foods */}
      {meals.length > 0 && (
        <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20">
          <h2 className="font-bold text-sm mb-3">الوجبات المختارة</h2>
          <div className="space-y-2">
            {meals.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {m.image_url ? <img src={m.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">🍽️</div>}
                <span className="flex-1 truncate">{m.name}</span>
                {m.price != null && <span className="text-primary font-bold">₪{Math.round(m.price)}</span>}
              </div>
            ))}
          </div>
          {rests.length > 0 && (
            <p className="text-[11px] text-on-surface-variant mt-2">المطاعم: {rests.map((r) => r.name).join('، ')}</p>
          )}
        </div>
      )}

      {/* Comments */}
      {data.comments?.length > 0 && (
        <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20">
          <h2 className="font-bold text-sm mb-3">التعليقات ({data.comments.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.comments.map((c) => (
              <div key={c.id} className={`p-2 rounded-lg text-xs ${c.status === 'hidden' ? 'bg-error/10 opacity-60' : 'bg-surface-container-low'}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold">{c.user_display_name || 'مستخدم'}</span>
                  <span className="text-[10px] text-on-surface-variant">{timeAgo(c.created_date)}</span>
                </div>
                <p className="text-on-surface">{c.body}</p>
                {c.status !== 'active' && <span className="text-[10px] text-error">({c.status})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review workspace */}
      <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20">
        <h2 className="font-bold text-sm mb-3 flex items-center gap-1">
          <Icon name="rate_review" className="text-primary" /> مراجعة TAMAM
        </h2>

        {data.reviews?.length > 0 && (
          <div className="space-y-2 mb-3">
            {data.reviews.map((r) => (
              <div key={r.id} className="bg-surface-container-low rounded-lg p-2 text-xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold">{r.admin_name || 'مشرف'}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(REVIEW_STATUS_META[r.status] || REVIEW_STATUS_META.normal).tone}`}>{(REVIEW_STATUS_META[r.status] || REVIEW_STATUS_META.normal).label}</span>
                </div>
                {r.admin_notes && <p className="text-on-surface-variant">{r.admin_notes}</p>}
                <span className="text-[10px] text-on-surface-variant">{timeAgo(r.created_date)}</span>
              </div>
            ))}
          </div>
        )}

        {(data.review_status === 'qualified' || data.review_status === 'under_review') && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-on-surface-variant block mb-1">ملاحظات الفريق</label>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} placeholder="اكتب ملاحظات المراجعة..." className="w-full bg-surface-container-low rounded-lg p-2 text-sm border border-outline-variant/30 resize-none" />
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant block mb-1">ملاحظات على المكونات</label>
              <textarea value={componentNotes} onChange={(e) => setComponentNotes(e.target.value)} rows={2} placeholder="مكونات، تعديلات، إلخ..." className="w-full bg-surface-container-low rounded-lg p-2 text-sm border border-outline-variant/30 resize-none" />
            </div>
            <div className="flex gap-3">
              <TogglePair label="قابل للتنفيذ؟" value={feasible} onChange={setFeasible} />
              <TogglePair label="يحتاج تعديل؟" value={needsAdjust} onChange={setNeedsAdjust} />
            </div>

            {data.review_status === 'qualified' && (
              <button onClick={startReview} disabled={saving} className="w-full bg-primary text-on-primary font-bold text-sm py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1">
                <Icon name="play_arrow" /> بدء مراجعة TAMAM
              </button>
            )}
            {data.review_status === 'under_review' && (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => saveDecision('approved')} disabled={saving} className="bg-primary text-on-primary font-bold text-xs py-2.5 rounded-xl disabled:opacity-50">اعتماد الفكرة</button>
                <button onClick={() => saveDecision('needs_changes')} disabled={saving} className="bg-tertiary/20 text-tertiary font-bold text-xs py-2.5 rounded-xl disabled:opacity-50">يحتاج تعديل</button>
                <button onClick={() => saveDecision('rejected')} disabled={saving} className="bg-error/10 text-error font-bold text-xs py-2.5 rounded-xl disabled:opacity-50">ما قدرنا ننفذها</button>
              </div>
            )}
          </div>
        )}

        {data.review_status === 'normal' && (
          <div className="text-center py-3">
            <p className="text-xs text-on-surface-variant mb-2">المنشور لم يصل لـ 100 لايك بعد. استخدم المحاكاة للاختبار.</p>
            <button onClick={simulate100} disabled={saving} className="text-xs bg-tertiary/20 text-tertiary font-bold px-4 py-2 rounded-xl disabled:opacity-50">
              🧪 محاكاة 100 لايك (اختبار)
            </button>
          </div>
        )}

        {(data.review_status === 'approved' || data.review_status === 'rejected' || data.review_status === 'converted') && (
          <div className="text-center py-2">
            <p className="text-xs text-on-surface-variant">المراجعة مكتملة — الحالة: <span className="font-bold">{revMeta.label}</span></p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {data.status === 'hidden'
          ? <button onClick={unhide} className="text-xs bg-primary/10 text-primary font-bold px-4 py-2 rounded-xl flex items-center gap-1"><Icon name="visibility" /> إعادة النشر</button>
          : <button onClick={hide} className="text-xs bg-error/10 text-error font-bold px-4 py-2 rounded-xl flex items-center gap-1"><Icon name="visibility_off" /> إخفاء المنشور</button>
        }
        <button onClick={simulate100} disabled={saving} className="text-xs bg-surface-container-high text-on-surface font-bold px-4 py-2 rounded-xl flex items-center gap-1"><Icon name="science" /> محاكاة 100 لايك</button>
        <Link to={`/community-moods/${data.id}`} className="text-xs bg-surface-container-high text-on-surface font-bold px-4 py-2 rounded-xl flex items-center gap-1"><Icon name="open_in_new" /> عرض عام</Link>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-surface-container-low rounded-lg p-2">
      <p className="text-[10px] text-on-surface-variant">{label}</p>
      <p className="text-xs font-bold truncate" dir="ltr">{value}</p>
    </div>
  );
}
function Stat({ icon, value, label }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-2">
      <Icon name={icon} className="text-primary text-[20px]" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-on-surface-variant">{label}</p>
    </div>
  );
}
function TogglePair({ label, value, onChange }) {
  return (
    <div className="flex-1">
      <p className="text-[11px] text-on-surface-variant mb-1">{label}</p>
      <div className="flex gap-1">
        <button onClick={() => onChange(true)} className={`flex-1 text-xs py-1.5 rounded-lg font-bold ${value === true ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>نعم</button>
        <button onClick={() => onChange(false)} className={`flex-1 text-xs py-1.5 rounded-lg font-bold ${value === false ? 'bg-error text-on-error' : 'bg-surface-container-high text-on-surface-variant'}`}>لا</button>
      </div>
    </div>
  );
}