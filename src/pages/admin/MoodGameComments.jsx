import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminGetMoodGameComments, adminModerateComment } from '@/lib/moodGameAdminApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} د`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} س`;
  return `${Math.floor(h / 24)} ي`;
}

const COMMENT_STATUS = {
  active: { label: 'ظاهر', tone: 'text-primary bg-primary/15' },
  hidden: { label: 'مخفي', tone: 'text-error bg-error/15' },
  deleted: { label: 'محذوف', tone: 'text-on-surface-variant bg-surface-container-high' },
};

export default function MoodGameComments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    adminGetMoodGameComments()
      .then((data) => setComments(data || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const moderate = async (id, status) => {
    await adminModerateComment(id, status);
    load();
  };

  const filtered = filter === 'all' ? comments : comments.filter((c) => c.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Icon name="chat" className="text-primary" /> التعليقات
        </h1>
        <Link to="/admin/mood-game" className="text-sm text-on-surface-variant flex items-center gap-1">
          <Icon name="arrow_forward" className="text-[18px]" /> لعبة المود
        </Link>
      </div>

      <div className="flex gap-2">
        {[{ k: 'all', l: 'الكل' }, { k: 'active', l: 'ظاهر' }, { k: 'hidden', l: 'مخفي' }].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter === f.k ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-on-surface-variant py-10">جاري التحميل...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="forum" className="text-5xl text-on-surface-variant" />
          <p className="text-on-surface-variant mt-2 text-sm">لا يوجد تعليقات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const meta = COMMENT_STATUS[c.status] || COMMENT_STATUS.active;
            return (
              <div key={c.id} className="bg-surface-container rounded-xl p-3 border border-outline-variant/20">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{c.user_display_name || 'مستخدم'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${meta.tone}`}>{meta.label}</span>
                    </div>
                    <Link to={`/admin/mood-game/posts/${c.proposal_id}`} className="text-[11px] text-primary hover:underline">{c.post_title || 'مود'}</Link>
                  </div>
                  <span className="text-[10px] text-on-surface-variant">{timeAgo(c.created_date)}</span>
                </div>
                <p className="text-sm text-on-surface mb-2">{c.body}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Link to={`/admin/mood-game/posts/${c.proposal_id}`} className="text-[11px] bg-surface-container-high text-on-surface font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Icon name="open_in_new" className="text-[14px]" /> فتح المنشور</Link>
                  {c.status === 'active' && (
                    <button onClick={() => moderate(c.id, 'hidden')} className="text-[11px] bg-error/10 text-error font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Icon name="visibility_off" className="text-[14px]" /> إخفاء</button>
                  )}
                  {c.status === 'hidden' && (
                    <button onClick={() => moderate(c.id, 'active')} className="text-[11px] bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Icon name="visibility" className="text-[14px]" /> إظهار</button>
                  )}
                  {c.status !== 'deleted' && (
                    <button onClick={() => { if (confirm('حذف التعليق نهائيًا؟')) moderate(c.id, 'deleted'); }} className="text-[11px] bg-error/10 text-error font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Icon name="delete" className="text-[14px]" /> حذف</button>
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