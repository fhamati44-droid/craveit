import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, CheckCircle2, XCircle, Trophy, Gift, FileText } from 'lucide-react';
import { getMyProposals } from '@/lib/communityMoodApi';
import { REVIEW_STATUS_META } from '@/lib/moodGameAdminApi';
import TamamAvatar from '@/components/community/TamamAvatar';
import { resolvePublicImage } from '@/lib/imageUtils';

const STATUS_META = {
  draft: { label: 'مسودة', color: 'text-tamam-text-muted bg-tamam-surface-high', icon: FileText },
  pending_review: { label: 'بانتظار النشر', color: 'text-tamam-gold bg-tamam-gold/15', icon: Clock },
  published: { label: 'منشور', color: 'text-tamam-green-bright bg-tamam-green/15', icon: CheckCircle2 },
  rejected: { label: 'مرفوض', color: 'text-tamam-error bg-tamam-error/15', icon: XCircle },
  paused: { label: 'موقوف', color: 'text-tamam-text-muted bg-tamam-surface-high', icon: Clock },
  archived: { label: 'مؤرشف', color: 'text-tamam-text-muted bg-tamam-surface-high', icon: FileText },
  hidden: { label: 'مخفي', color: 'text-tamam-error bg-tamam-error/15', icon: XCircle },
};

const REVIEW_LABEL_AR = {
  normal: 'منشور',
  qualified: 'وصل 100 لايك',
  under_review: 'قيد مراجعة TAMAM',
  approved: 'تم اعتماد الفكرة',
  rejected: 'ما قدرنا ننفذها هالمرة',
  converted: 'صار عرض حقيقي',
};

function statusOf(p) {
  if (p.status === 'published' && (p.valid_likes_count || 0) >= (p.target_likes || 100)) return 'reached';
  if (p.reward_status === 'pending') return 'reward';
  return p.status;
}

export default function AccountCommunityMoods() {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true); setError(false);
    getMyProposals().then((d) => setProposals(Array.isArray(d) ? d : []))
      .catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-tamam-bg text-tamam-text font-tamam" dir="rtl">
        <div className="max-w-[480px] mx-auto p-4 pt-8">
          <h1 className="text-lg font-bold mb-4">موداتي</h1>
          {[1, 2].map((i) => <div key={i} className="h-20 skeleton-t rounded-2xl mb-3" />)}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-tamam-bg text-tamam-text font-tamam flex flex-col items-center justify-center" dir="rtl">
        <p className="text-tamam-text-muted text-sm mb-3">ما قدرنا نحمّل موداتك</p>
        <button onClick={load} className="bg-tamam-green text-tamam-ink font-bold text-sm px-5 py-2 rounded-full">إعادة المحاولة</button>
      </div>
    );
  }

  // Detail view
  if (proposalId) {
    const p = proposals.find((x) => x.id === proposalId);
    if (!p) {
      return (
        <div className="min-h-screen bg-tamam-bg text-tamam-text font-tamam flex flex-col items-center justify-center p-6" dir="rtl">
          <p className="text-tamam-text-muted text-sm mb-4">ما لقينا المود</p>
          <button onClick={() => navigate('/account/community-moods')} className="bg-tamam-green text-tamam-ink font-bold text-sm px-5 py-2 rounded-full">ارجع لموداتي</button>
        </div>
      );
    }
    const meta = STATUS_META[p.status] || STATUS_META.draft;
    const reached = p.status === 'published' && (p.valid_likes_count || 0) >= (p.target_likes || 100);
    const target = p.target_likes || 100;
    const percent = Math.min(100, Math.round(((p.valid_likes_count || 0) / target) * 100));
    const meals = p.meal_snapshots || [];
    const rests = p.restaurant_snapshots || [];
    return (
      <div className="min-h-screen bg-tamam-bg text-tamam-text font-tamam" dir="rtl">
        <div className="max-w-[480px] mx-auto p-4">
          <button onClick={() => navigate('/account/community-moods')} className="flex items-center gap-1 text-tamam-text-muted text-xs mb-3">
            <ArrowRight size={14} /> موداتي
          </button>
          <div className="bg-tamam-surface rounded-2xl p-4 border border-tamam-outline/20">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${meta.color}`}>
              <meta.icon size={14} /> {meta.label}
            </div>
            <h1 className="text-lg font-bold mb-1">{p.mood_title_ar}</h1>
            {p.description_ar && <p className="text-tamam-text-muted text-xs mb-3">{p.description_ar}</p>}
            {p.status === 'rejected' && p.moderation_note && (
              <div className="bg-tamam-error/10 border border-tamam-error/30 rounded-lg p-3 mb-3">
                <p className="text-tamam-error text-[11px] font-bold mb-0.5">سبب الرفض</p>
                <p className="text-tamam-text-muted text-xs">{p.moderation_note}</p>
              </div>
            )}
            {p.status === 'pending_review' && (
              <div className="bg-tamam-gold/10 border border-tamam-gold/20 rounded-lg p-3 mb-3">
                <p className="text-tamam-gold text-xs font-bold">المود بالمراجعة</p>
                <p className="text-tamam-text-muted text-[11px] mt-0.5">بنخبرك لما يصير جاهز للنشر.</p>
              </div>
            )}
            {p.status === 'published' && (
              <div className="bg-tamam-green/10 border border-tamam-green/20 rounded-lg p-3 mb-3">
                <p className="text-tamam-green-bright text-xs font-bold">المود منشور</p>
                <button onClick={() => navigate(`/community-moods/${p.id}`)} className="text-tamam-green-bright text-[11px] underline mt-1">شوف الصفحة العامة</button>
              </div>
            )}
            {p.review_status && p.review_status !== 'normal' && (
              <div className={`rounded-lg p-3 mb-3 ${p.review_status === 'qualified' ? 'bg-tamam-gold/10 border border-tamam-gold/20' : p.review_status === 'under_review' ? 'bg-tamam-green/10 border border-tamam-green/20' : p.review_status === 'rejected' ? 'bg-tamam-error/10 border border-tamam-error/30' : 'bg-tamam-surface-high'}`}>
                <p className={`text-xs font-bold ${p.review_status === 'qualified' ? 'text-tamam-gold' : p.review_status === 'under_review' ? 'text-tamam-green-bright' : p.review_status === 'rejected' ? 'text-tamam-error' : 'text-tamam-text'}`}>
                  {REVIEW_LABEL_AR[p.review_status] || p.review_status}
                </p>
                {p.review_status === 'qualified' && <p className="text-tamam-text-muted text-[11px] mt-0.5">مودك دخل مراجعة TAMAM. بنخبرك لما يصير جاهز.</p>}
                {p.review_status === 'under_review' && <p className="text-tamam-text-muted text-[11px] mt-0.5">فريقنا يدرس إمكانية تنفيذ المود.</p>}
                {p.review_status === 'rejected' && <p className="text-tamam-text-muted text-[11px] mt-0.5">ما قدرنا ننفذه هالمرة، بس جرّب مود تاني!</p>}
              </div>
            )}
            {reached && (
              <div className="flex items-center gap-1.5 text-tamam-gold text-xs font-bold mb-3">
                <Trophy size={14} /> وصل للهدف
              </div>
            )}
            {p.reward_status === 'pending' && (
              <div className="flex items-center gap-1.5 text-tamam-gold text-xs font-bold mb-3">
                <Gift size={14} /> مراجعة المكافأة
              </div>
            )}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-[11px]"><span className="text-tamam-text-muted">الإعجابات</span><span className="font-bold">{p.valid_likes_count || 0} / {target}</span></div>
              <div className="h-1.5 bg-tamam-surface-high rounded-full overflow-hidden">
                <div className="h-full bg-tamam-green rounded-full" style={{ width: `${percent}%` }} />
              </div>
            </div>
            {meals.length > 0 && (
              <div className="mb-3">
                <p className="text-tamam-text-muted text-[11px] mb-1">الوجبات</p>
                <div className="space-y-1">
                  {meals.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-[11px]">
                      {resolvePublicImage(m.image_url, null) ? <img src={resolvePublicImage(m.image_url, null)} alt="" className="w-7 h-7 rounded object-cover" /> : <div className="w-7 h-7 rounded bg-tamam-surface-high flex items-center justify-center text-xs">🍽️</div>}
                      <span className="flex-1 truncate">{m.name}</span>
                      {m.price != null && <span className="text-tamam-green-bright font-bold">₪{Math.round(m.price)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {rests.length > 0 && (
              <div>
                <p className="text-tamam-text-muted text-[11px] mb-1">المطاعم</p>
                <p className="text-tamam-text text-xs">{rests.map((r) => r.name).join('، ')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-tamam-bg text-tamam-text font-tamam" dir="rtl">
      <div className="max-w-[480px] mx-auto p-4">
        <h1 className="text-lg font-bold mb-4">موداتي</h1>
        {proposals.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-tamam-text-muted text-sm mb-4">لسه ما عندك مودات. ابدأ أول مود!</p>
            <button onClick={() => navigate('/mood-game')} className="bg-tamam-green text-tamam-ink font-bold text-sm px-6 py-2.5 rounded-full">ابدأ اللعبة</button>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => {
              const meta = STATUS_META[p.status] || STATUS_META.draft;
              const reached = p.status === 'published' && (p.valid_likes_count || 0) >= (p.target_likes || 100);
              return (
                <button key={p.id} onClick={() => navigate(`/account/community-moods/${p.id}`)} className="w-full text-right bg-tamam-surface rounded-2xl p-3 border border-tamam-outline/20 active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-2 mb-2">
                    <TamamAvatar type={p.creator_avatar_type} avatarKey={p.creator_avatar_key} url={p.creator_avatar_url} size={28} />
                    <h3 className="font-bold text-sm flex-1 truncate">{p.mood_title_ar}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.color}`}>
                      <meta.icon size={11} /> {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-tamam-text-muted">
                    <span>♥ {p.valid_likes_count || 0}/{p.target_likes || 100}</span>
                    <span>💬 {p.comments_count || 0}</span>
                    <span>🔗 {p.shares_count || 0}</span>
                    {reached && <span className="text-tamam-gold font-bold">🏆 وصل للهدف</span>}
                    {p.status === 'published' && <span className="text-tamam-green-bright font-bold">شوف الصفحة</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}