import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminGetMoodGamePosts, adminHidePost } from '@/lib/moodGameAdminApi';
import { adminApproveProposal, adminRejectProposal } from '@/lib/communityMoodApi';
import { PUBLISH_STATUS_META } from '@/lib/moodGameAdminApi';

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

// Publication-moderation tabs (NOT the 100-like review workflow)
const TABS = [
  { key: 'pending', label: 'بانتظار الموافقة', status: 'pending_review' },
  { key: 'published', label: 'منشورة', status: 'published' },
  { key: 'rejected', label: 'مرفوضة', status: 'rejected' },
];

export default function MoodGamePosts() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const t = TABS.find((x) => x.key === tab) || TABS[0];
    adminGetMoodGamePosts({ status: t.status, review_status: 'all' })
      .then((data) => {
        const list = data || [];
        // Strict client-side enforcement of the publication-moderation definition
        if (tab === 'published') setPosts(list.filter((p) => p.status === 'published' && p.moderation_status === 'approved'));
        else if (tab === 'rejected') setPosts(list.filter((p) => p.status === 'rejected' || p.moderation_status === 'rejected'));
        else setPosts(list.filter((p) => p.status === 'pending_review'));
      })
      .catch((e) => {
        console.error('[MoodGamePosts] load failed', e);
        setError({ msg: 'صار خطأ بتحميل المودات', detail: e?.message || String(e), raw: e?.raw });
        setPosts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const publish = async (id) => {
    setBusy(id);
    try {
      await adminApproveProposal(id, null);
      load();
    } catch (e) { console.error('[MoodGamePosts] publish failed', e); alert('ما قدرنا ننشر المود'); }
    finally { setBusy(null); }
  };

  const reject = async (id) => {
    const note = prompt('سبب الرفض؟ (اختياري)') || '';
    setBusy(id);
    try {
      await adminRejectProposal(id, note || null);
      load();
    } catch (e) { console.error('[MoodGamePosts] reject failed', e); alert('ما قدرنا نرفض المود'); }
    finally { setBusy(null); }
  };

  const hide = async (id) => {
    if (!confirm('إخفاء المود؟')) return;
    setBusy(id);
    try { await adminHidePost(id); load(); }
    finally { setBusy(null); }
  };

  const t = TABS.find((x) => x.key === tab) || TABS[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Icon name="stadia_controller" className="text-primary" /> طلبات النشر
        </h1>
        <Link to="/admin/mood-game" className="text-sm text-on-surface-variant flex items-center gap-1">
          <Icon name="arrow_forward" className="text-[18px]" /> لعبة المود
        </Link>
      </div>

      {/* Publication-moderation tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold ${tab === tb.key ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-on-surface-variant py-10">جاري التحميل...</p>
      ) : error ? (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-center text-error text-sm space-y-2">
          <p>{error.msg}</p>
          <p className="text-[11px] text-on-surface-variant" dir="ltr">تفاصيل تقنية: {error.detail}</p>
          {error.raw && <p className="text-[10px] text-on-surface-variant break-all" dir="ltr">{JSON.stringify(error.raw).slice(0, 300)}</p>}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="inbox" className="text-5xl text-on-surface-variant" />
          <p className="text-on-surface-variant mt-2 text-sm">
            {tab === 'pending' ? 'ما في مودات بانتظار الموافقة' : tab === 'published' ? 'ما في مودات منشورة' : 'ما في مودات مرفوضة'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const meals = p.meal_snapshots || [];
            const img = p.cover_image_url || meals[0]?.image_url;
            return (
              <div key={p.id} className="bg-surface-container rounded-2xl p-3 border border-outline-variant/20">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0">
                    {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{p.mood_title_ar}</h3>
                    <p className="text-xs text-on-surface-variant truncate">{p.creator_display_name || 'مستخدم'} · {timeAgo(p.created_date)}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(PUBLISH_STATUS_META[p.status] || PUBLISH_STATUS_META.pending_review).tone}`}>
                        {(PUBLISH_STATUS_META[p.status] || PUBLISH_STATUS_META.pending_review).label}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">{meals.length} وجبة</span>
                    </div>
                  </div>
                </div>

                {/* Food thumbnails */}
                {meals.length > 0 && (
                  <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                    {meals.slice(0, 6).map((m, i) => (
                      <div key={i} className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high" title={m.name}>
                        {m.image_url ? <img src={m.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">🍽️</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button onClick={() => navigate(`/admin/mood-game/posts/${p.id}`)} className="text-xs bg-surface-container-high text-on-surface font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <Icon name="open_in_new" className="text-[14px]" /> فتح
                  </button>
                  {tab === 'pending' && (
                    <>
                      <button onClick={() => publish(p.id)} disabled={busy === p.id} className="text-xs bg-primary text-on-primary font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">
                        <Icon name="publish" className="text-[14px]" /> نشر
                      </button>
                      <button onClick={() => reject(p.id)} disabled={busy === p.id} className="text-xs bg-error/10 text-error font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">
                        <Icon name="block" className="text-[14px]" /> رفض
                      </button>
                      <button onClick={() => hide(p.id)} disabled={busy === p.id} className="text-xs bg-surface-container-high text-on-surface-variant font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">
                        <Icon name="visibility_off" className="text-[14px]" /> إخفاء
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}