import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminGetMoodGamePosts, adminGetMoodGameComments } from '@/lib/moodGameAdminApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function MoodGameAdmin() {
  const [stats, setStats] = useState({ total: 0, published: 0, qualified: 0, under_review: 0, approved: 0, comments: 0 });

  useEffect(() => {
    Promise.all([
      adminGetMoodGamePosts('all', 'all').catch(() => []),
      adminGetMoodGameComments().catch(() => []),
    ]).then(([posts, comments]) => {
      const p = posts || [];
      setStats({
        total: p.length,
        published: p.filter((x) => x.status === 'published').length,
        qualified: p.filter((x) => x.review_status === 'qualified').length,
        under_review: p.filter((x) => x.review_status === 'under_review').length,
        approved: p.filter((x) => x.review_status === 'approved').length,
        comments: (comments || []).filter((c) => c.status === 'active').length,
      });
    });
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Icon name="stadia_controller" className="text-primary" /> لعبة المود
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="edit_note" value={stats.total} label="إجمالي المودات" />
        <StatCard icon="favorite" value={stats.qualified} label="وصل 100 لايك" tone="tertiary" />
        <StatCard icon="rate_review" value={stats.under_review} label="قيد المراجعة" tone="primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NavCard to="/admin/mood-game/posts" icon="grid_view" title="مودات المجتمع" desc="جميع المودات المنشورة والمعلّقة" />
        <NavCard to="/admin/mood-game/review" icon="trophy" title="وصلت 100 لايك" desc="مودات وصلت للهدف وجاهزة للمراجعة" tone="tertiary" />
        <NavCard to="/admin/mood-game/comments" icon="chat" title="التعليقات" desc="مراقبة وإدارة تعليقات المجتمع" />
        <NavCard to="/admin/mood-game/posts?filter=approved" icon="verified" title="العروض المحولة" desc="مودات تم تحويلها لعروض حقيقية" tone="primary" />
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, tone = 'primary' }) {
  const toneCls = tone === 'tertiary' ? 'text-tertiary' : 'text-primary';
  return (
    <div className="bg-surface-container rounded-2xl p-3 text-center">
      <Icon name={icon} className={`${toneCls} text-[24px]`} />
      <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
      <div className="text-[11px] text-on-surface-variant mt-0.5">{label}</div>
    </div>
  );
}
function NavCard({ to, icon, title, desc, tone = 'default' }) {
  const toneCls = tone === 'tertiary' ? 'text-tertiary' : tone === 'primary' ? 'text-primary' : 'text-on-surface-variant';
  return (
    <Link to={to} className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20 hover:border-primary/40 transition-colors flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
        <Icon name={icon} className={`${toneCls} text-[22px]`} />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-xs text-on-surface-variant mt-0.5">{desc}</p>
      </div>
      <Icon name="chevron_left" className="text-on-surface-variant mt-2" />
    </Link>
  );
}