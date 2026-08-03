import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Flag, ChevronLeft, ShoppingBag, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getProposalDetail, toggleLike, recordShare, reportProposal } from '@/lib/communityMoodApi';
import { resolvePublicImage } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';
import TamamAvatar from '@/components/community/TamamAvatar';
import SupporterAvatarStack from '@/components/community/SupporterAvatarStack';
import CommentSection from '@/components/community/CommentSection';
import ShareSheet from '@/components/community/ShareSheet';
import { ErrorState } from '@/components/tamam/customer/States';

const PACKAGE_LABELS = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };
const PACKAGE_COLORS = {
  classic: 'bg-tamam-green/20 text-tamam-green-bright',
  mix: 'bg-tamam-teal/40 text-tamam-cream',
  plus: 'bg-tamam-gold/20 text-tamam-gold',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} س`;
  return `${Math.floor(hours / 24)} ي`;
}

export default function CommunityMoodDetail() {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const load = () => {
    setLoading(true); setError(false);
    getProposalDetail(proposalId)
      .then((data) => {
        setProposal(data);
        setLiked(data.user_liked || false);
        setLikeCount(data.valid_likes_count || 0);
        track('community_mood_viewed', { proposal_id: proposalId, source: 'detail_page' });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    base44.auth.me().then((u) => setCurrentUserId(u?.id || null)).catch(() => {});
  }, [proposalId]);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1);
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 600);
    try {
      await toggleLike(proposalId);
      track('community_mood_liked', { proposal_id: proposalId, action: wasLiked ? 'unliked' : 'liked' });
    } catch (err) {
      if (err?.error === 'auth_required') {
        base44.auth.redirectToLogin(`/community-moods/${proposalId}`);
        return;
      }
      setLiked(wasLiked);
      setLikeCount(wasLiked ? likeCount : likeCount - 1);
    }
  };

  const handleShare = () => {
    setShowShare(true);
    recordShare(proposalId, 'native').catch(() => {});
  };

  const handleOrder = (meal) => {
    if (meal?.restaurant_id) {
      track('community_mood_order_clicked', { proposal_id: proposalId, meal_id: meal.id });
      navigate(`/restaurants/${meal.restaurant_id}?meal=${meal.id}`);
    }
  };

  if (loading) return <div className="min-h-screen bg-tamam-bg flex items-center justify-center text-tamam-text-muted" dir="rtl">جاري التحميل...</div>;
  if (error || !proposal) return <div className="min-h-screen bg-tamam-bg flex items-center justify-center" dir="rtl"><ErrorState title="المود غير متاح" onAction={() => navigate('/community-moods')} actionLabel="رجوع" /></div>;

  const meals = proposal.meal_snapshots || [];
  const restaurants = proposal.restaurant_snapshots || [];
  const target = proposal.target_likes || 100;
  const percent = Math.min(100, Math.round((likeCount / target) * 100));
  const coverImage = resolvePublicImage(proposal.cover_image_url || (meals[0] && meals[0].image_url), null);

  return (
    <div className="min-h-screen bg-tamam-bg text-tamam-text font-tamam pb-safe" dir="rtl">
      <div className="max-w-[430px] mx-auto">
        {/* Cover */}
        <div className="relative h-56 bg-tamam-surface-low">
          {coverImage && <img src={coverImage} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-tamam-bg via-tamam-ink/40 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 right-3 p-2 rounded-full bg-tamam-ink/60 text-white backdrop-blur"
          >
            <ChevronLeft size={20} className="rotate-180" />
          </button>
          <span className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${PACKAGE_COLORS[proposal.package_type] || PACKAGE_COLORS.classic}`}>
            {PACKAGE_LABELS[proposal.package_type] || 'كلاسيك'}
          </span>
          <div className="absolute bottom-3 right-3 left-3">
            <h1 className="text-white font-bold text-xl mb-1">{proposal.mood_title_ar}</h1>
            {proposal.description_ar && <p className="text-tamam-text-muted text-sm">{proposal.description_ar}</p>}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Creator */}
          <div className="flex items-center gap-3">
            <TamamAvatar
              type={proposal.creator_avatar_type}
              avatarKey={proposal.creator_avatar_key}
              url={proposal.creator_avatar_url}
              size={40}
              ring
            />
            <div className="flex-1">
              <p className="text-tamam-text font-bold text-sm">{proposal.creator_display_name}</p>
              <p className="text-tamam-text-muted text-[11px]">{timeAgo(proposal.created_date)} · {proposal.views_count || 0} مشاهدة</p>
            </div>
            <button onClick={() => setShowReport(true)} className="p-2 rounded-full bg-tamam-surface-high text-tamam-text-muted">
              <Flag size={16} />
            </button>
          </div>

          {/* Progress */}
          <div className="bg-tamam-surface rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SupporterAvatarStack supporters={proposal.supporters || []} size={24} extraCount={Math.max(0, (proposal.total_supporters || 0) - 5)} />
                <span className="text-tamam-text-muted text-xs">{likeCount} إعجاب</span>
              </div>
              <span className="text-tamam-green-bright text-xs font-bold">{percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={likeCount}
              aria-valuemin={0}
              aria-valuemax={target}
              aria-label="تقدم الإعجابات نحو الهدف"
              className="h-2 bg-tamam-surface-high rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-gradient-to-l from-tamam-green to-tamam-green-bright rounded-full"
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-tamam-text-muted text-[10px] mt-1.5 text-center">
              {likeCount >= target ? 'وصل المود للهدف وبستنى مراجعة TAMAM' : `باقي ${target - likeCount} إعجاب للهدف`}
            </p>
          </div>

          {/* Meals */}
          <div>
            <h3 className="text-tamam-text font-bold text-sm mb-2">وجبات المود</h3>
            <div className="space-y-2">
              {meals.map((meal, i) => (
                <div key={i} className="flex items-center gap-3 bg-tamam-surface rounded-xl p-2.5">
                  {meal.image_url && <img src={resolvePublicImage(meal.image_url)} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-tamam-text text-sm font-semibold truncate">{meal.name}</p>
                    <p className="text-tamam-text-muted text-[11px] truncate">
                      {restaurants.find((r) => r.id === meal.restaurant_id)?.name || meal.restaurant_name}
                    </p>
                    <p className="text-tamam-green-bright text-xs font-bold">₪{Math.round(meal.price)}</p>
                  </div>
                  {meal.is_available !== false && (
                    <button
                      onClick={() => handleOrder(meal)}
                      className="bg-tamam-green/10 text-tamam-green-bright p-2 rounded-lg"
                      aria-label="اطلب هذا الطبق"
                    >
                      <ShoppingBag size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Restaurant link */}
          {restaurants[0] && (
            <button
              onClick={() => navigate(`/restaurants/${restaurants[0].id}`)}
              className="w-full flex items-center gap-2 bg-tamam-surface rounded-xl p-3 border border-tamam-outline/20"
            >
              <Store size={16} className="text-tamam-green-bright" />
              <span className="text-tamam-text text-sm font-semibold">شوف مطعم {restaurants[0].name}</span>
              <ChevronLeft size={16} className="mr-auto text-tamam-text-muted" />
            </button>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-tamam-text font-bold text-sm mb-2">التعليقات ({proposal.comments?.length || 0})</h3>
            <CommentSection
              proposalId={proposalId}
              comments={proposal.comments || []}
              currentUserId={currentUserId}
              onUpdate={() => load()}
            />
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-tamam-surface/95 backdrop-blur border-t border-tamam-outline/20 px-4 py-3 pb-safe max-w-[430px] mx-auto flex items-center gap-2">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold flex-1 ${liked ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text'}`}
          >
            <motion.span animate={likeAnimating ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.4 }}>
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            </motion.span>
            {likeCount}
          </button>
          <button
            onClick={() => document.querySelector('[data-comments]')?.scrollIntoView({ behavior: 'smooth' })}
            className="p-2.5 rounded-xl bg-tamam-surface-high text-tamam-text"
          >
            <MessageCircle size={18} />
          </button>
          <button onClick={handleShare} className="p-2.5 rounded-xl bg-tamam-surface-high text-tamam-text">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      <ShareSheet proposal={proposal} open={showShare} onClose={() => setShowShare(false)} />
      <ReportSheet proposalId={proposalId} open={showReport} onClose={() => setShowReport(false)} />
    </div>
  );
}

function ReportSheet({ proposalId, open, onClose }) {
  const [reason, setReason] = useState('other');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await reportProposal(proposalId, reason, details);
      onClose();
      setDetails('');
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-tamam-surface rounded-t-3xl p-4 pb-safe" dir="rtl">
            <h2 className="text-tamam-text font-bold text-base mb-3">تبليغ عن المود</h2>
            <div className="space-y-2 mb-3">
              {[
                { key: 'spam', label: 'سبام' },
                { key: 'inappropriate', label: 'محتوى غير مناسب' },
                { key: 'misleading', label: 'معلومات مضللة' },
                { key: 'other', label: 'سبب آخر' },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => setReason(r.key)}
                  className={`w-full text-right p-2.5 rounded-lg text-sm ${reason === r.key ? 'bg-tamam-green/20 text-tamam-green-bright font-bold' : 'bg-tamam-surface-high text-tamam-text-muted'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              placeholder="تفاصيل إضافية (اختياري)"
              rows={2}
              className="w-full bg-tamam-surface-low text-tamam-text text-sm rounded-lg px-3 py-2 border border-tamam-outline/30 resize-none mb-3"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
            </button>
          </div>
        </>
      )}
    </>
  );
}