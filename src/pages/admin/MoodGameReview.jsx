import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminGetMoodGamePosts, REVIEW_STATUS_META } from '@/lib/moodGameAdminApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function MoodGameReview() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminGetMoodGamePosts('all', 'qualified')
      .then((data) => setPosts(data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Icon name="trophy" className="text-tertiary" /> وصلت 100 لايك
        </h1>
        <Link to="/admin/mood-game" className="text-sm text-on-surface-variant flex items-center gap-1">
          <Icon name="arrow_forward" className="text-[18px]" /> لعبة المود
        </Link>
      </div>

      <p className="text-sm text-on-surface-variant">مودات وصلت لـ 100 إعجاب وجاهزة لمراجعة TAMAM. اضغط على أي مود لبدء المراجعة.</p>

      {loading ? (
        <p className="text-center text-on-surface-variant py-10">جاري التحميل...</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="trophy" className="text-5xl text-on-surface-variant" />
          <p className="text-on-surface-variant mt-2 text-sm">لا يوجد مودات وصلت لـ 100 لايك بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const meals = p.meal_snapshots || [];
            const revMeta = REVIEW_STATUS_META[p.review_status] || REVIEW_STATUS_META.qualified;
            return (
              <button key={p.id} onClick={() => navigate(`/admin/mood-game/posts/${p.id}`)}
                className="w-full text-right bg-surface-container rounded-2xl p-4 border border-tertiary/30 hover:border-primary/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0">
                    {p.cover_image_url || meals[0]?.image_url
                      ? <img src={p.cover_image_url || meals[0]?.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{p.mood_title_ar}</h3>
                    <p className="text-xs text-on-surface-variant truncate">{p.creator_display_name || 'مستخدم'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${revMeta.tone}`}>{revMeta.label}</span>
                      <span className="text-[11px] text-tertiary font-bold flex items-center gap-0.5">
                        <Icon name="favorite" className="text-[14px]" /> {p.valid_likes_count}/{p.target_likes || 100}
                      </span>
                    </div>
                    {p.qualified_at && <p className="text-[10px] text-on-surface-variant mt-1">وصل في: {new Date(p.qualified_at).toLocaleDateString('ar')}</p>}
                  </div>
                  <Icon name="chevron_left" className="text-on-surface-variant mt-6" />
                </div>
                <div className="mt-2 bg-primary/10 text-primary text-xs font-bold py-2 rounded-lg text-center flex items-center justify-center gap-1">
                  <Icon name="play_arrow" /> فتح للمراجعة
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}