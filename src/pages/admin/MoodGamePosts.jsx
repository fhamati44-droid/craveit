import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminGetMoodGamePosts, PUBLISH_STATUS_META, REVIEW_STATUS_META } from '@/lib/moodGameAdminApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

const FILTERS = [
  { key: 'all', label: 'الكل', status: 'all', review: 'all' },
  { key: 'published', label: 'منشور', status: 'published', review: 'all' },
  { key: 'qualified', label: 'وصل 100', status: 'all', review: 'qualified' },
  { key: 'under_review', label: 'قيد المراجعة', status: 'all', review: 'under_review' },
  { key: 'approved', label: 'تم اعتماده', status: 'all', review: 'approved' },
  { key: 'hidden', label: 'مخفي', status: 'hidden', review: 'all' },
];

export default function MoodGamePosts() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const f = FILTERS.find((x) => x.key === filter) || FILTERS[0];
    adminGetMoodGamePosts(f.status, f.review)
      .then((data) => setPosts(data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Icon name="stadia_controller" className="text-primary" /> مودات المجتمع
        </h1>
        <Link to="/admin/mood-game" className="text-sm text-on-surface-variant flex items-center gap-1">
          <Icon name="arrow_forward" className="text-[18px]" /> لعبة المود
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${filter === f.key ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-on-surface-variant py-10">جاري التحميل...</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="sentiment_dissatisfied" className="text-5xl text-on-surface-variant" />
          <p className="text-on-surface-variant mt-2 text-sm">لا يوجد مودات في هذا التصنيف</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const meals = p.meal_snapshots || [];
            const pubMeta = PUBLISH_STATUS_META[p.status] || PUBLISH_STATUS_META.draft;
            const revMeta = REVIEW_STATUS_META[p.review_status] || REVIEW_STATUS_META.normal;
            return (
              <button key={p.id} onClick={() => navigate(`/admin/mood-game/posts/${p.id}`)}
                className="w-full text-right bg-surface-container rounded-2xl p-3 border border-outline-variant/20 hover:border-primary/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0">
                    {p.cover_image_url || meals[0]?.image_url
                      ? <img src={p.cover_image_url || meals[0]?.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{p.mood_title_ar}</h3>
                    <p className="text-xs text-on-surface-variant truncate">{p.creator_display_name || 'مستخدم'}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pubMeta.tone}`}>{pubMeta.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${revMeta.tone}`}>{revMeta.label}</span>
                    </div>
                  </div>
                  <div className="text-left text-[11px] text-on-surface-variant flex-shrink-0 space-y-0.5">
                    <div className="flex items-center gap-0.5"><Icon name="favorite" className="text-[14px]" /> {p.valid_likes_count || 0}</div>
                    <div className="flex items-center gap-0.5"><Icon name="chat_bubble" className="text-[14px]" /> {p.comments_count || 0}</div>
                    <div className="flex items-center gap-0.5"><Icon name="share" className="text-[14px]" /> {p.shares_count || 0}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}