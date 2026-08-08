import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, ChevronLeft } from 'lucide-react';
import TamamAvatar from './TamamAvatar';
import SupporterAvatarStack from './SupporterAvatarStack';
import CommentSheet from './CommentSheet';
import { base44 } from '@/api/base44Client';
import { toggleLike } from '@/lib/communityMoodApi';
import { resolvePublicImage } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';

const PACKAGE_LABELS = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };
const PACKAGE_COLORS = {
  classic: 'bg-tamam-green/20 text-tamam-green-bright',
  mix: 'bg-tamam-teal/40 text-tamam-cream',
  plus: 'bg-tamam-gold/20 text-tamam-gold',
};

export default function CommunityMoodCard({ proposal, onShare, variant = 'carousel' }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(proposal.valid_likes_count || 0);
  const [supporters, setSupporters] = useState(proposal.supporters || []);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(proposal.comments_count || 0);
  const likingRef = useRef(false);

  const meals = proposal.meal_snapshots || [];
  const restaurants = proposal.restaurant_snapshots || [];
  const mainMeal = meals[0] || null;
  const restaurant = restaurants[0] || null;
  const coverImage = resolvePublicImage(proposal.cover_image_url || (mainMeal && mainMeal.image_url), null);
  const target = proposal.target_likes || 100;
  const percent = Math.min(100, Math.round((likeCount / target) * 100));
  const reachedTarget = likeCount >= target;

  useEffect(() => {
    const pending = sessionStorage.getItem('pending_like_proposal');
    if (pending === proposal.id) {
      sessionStorage.removeItem('pending_like_proposal');
      base44.auth.isAuthenticated().then((ok) => {
        if (ok) doLike({ stopPropagation: () => {} });
      });
    }
  }, [proposal.id]);

  const doLike = async (e) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (e?.preventDefault) e.preventDefault();
    if (likingRef.current) return;
    likingRef.current = true;
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 600);
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, likeCount - 1) : likeCount + 1);
    try {
      const res = await toggleLike(proposal.id);
      setLiked(res.liked);
      setLikeCount(res.validLikesCount ?? res.count ?? likeCount);
      if (res.supporterAvatars) setSupporters(res.supporterAvatars);
      track('community_mood_liked', { proposal_id: proposal.id, action: res.liked ? 'liked' : 'unliked' });
    } catch (err) {
      if (err?.error === 'auth_required' || err?.status === 401) {
        sessionStorage.setItem('pending_like_proposal', proposal.id);
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      }
      setLiked(wasLiked);
      setLikeCount(prevCount);
    } finally {
      likingRef.current = false;
    }
  };

  const handleComment = (e) => {
    e.stopPropagation();
    setCommentOpen(true);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (onShare) onShare(proposal);
  };

  const open = () => {
    track('community_mood_viewed', { proposal_id: proposal.id, source: 'homepage_card' });
    navigate(`/community-moods/${proposal.id}`);
  };

  const openClick = (e) => {
    e.stopPropagation();
    open();
  };

  return (
    <>
      <div
        onClick={open}
        className={`${variant === 'feed' ? 'w-full' : 'flex-shrink-0 w-[280px]'} bg-tamam-surface rounded-2xl overflow-hidden border border-tamam-outline/20 active:scale-[0.98] transition-transform cursor-pointer`}
      >
        {/* Cover */}
        <div className="relative h-32 bg-tamam-surface-low">
          {coverImage ? (
            <img src={coverImage} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-tamam-ink/70 via-transparent to-transparent" />
          <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${PACKAGE_COLORS[proposal.package_type] || PACKAGE_COLORS.classic}`}>
            {PACKAGE_LABELS[proposal.package_type] || 'كلاسيك'}
          </span>
          <div className="absolute bottom-2 right-2 left-2">
            <h3 className="text-white font-bold text-sm leading-tight line-clamp-1">{proposal.mood_title_ar}</h3>
          </div>
        </div>

        {/* Creator + meal info */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <TamamAvatar type={proposal.creator_avatar_type} avatarKey={proposal.creator_avatar_key} url={proposal.creator_avatar_url} size={24} />
            <span className="text-tamam-text-muted text-[11px] truncate flex-1">{proposal.creator_display_name}</span>
          </div>

          {mainMeal && (
            <div className="flex items-center justify-between text-[11px]">
              <div className="min-w-0 flex-1">
                <span className="text-tamam-text font-semibold truncate">{mainMeal.name}</span>
                {restaurant && <span className="text-tamam-text-muted"> · {restaurant.name}</span>}
              </div>
              {mainMeal.price != null && (
                <span className="text-tamam-green-bright font-bold flex-shrink-0">₪{Math.round(mainMeal.price)}</span>
              )}
            </div>
          )}

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-tamam-text-muted">{likeCount} من {target} إعجاب</span>
              <span className="text-[10px] text-tamam-green-bright font-bold">{percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={likeCount}
              aria-valuemin={0}
              aria-valuemax={target}
              aria-label={`تقدم الإعجابات: ${likeCount} من ${target}`}
              className="h-1.5 bg-tamam-surface-high rounded-full overflow-hidden"
            >
              <motion.div className="h-full bg-gradient-to-l from-tamam-green to-tamam-green-bright rounded-full" animate={{ width: `${percent}%` }} transition={{ duration: 0.4 }} />
            </div>
            {reachedTarget && (
              <p className="text-[9px] text-tamam-gold font-bold mt-1 text-center">وصل المود للهدف وبستنى مراجعة TAMAM</p>
            )}
          </div>

          {/* Social stats + supporter avatars */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-tamam-text-muted">
              <span className="flex items-center gap-0.5"><MessageCircle size={11} /> {commentCount}</span>
              <span className="flex items-center gap-0.5"><Share2 size={11} /> {proposal.shares_count || 0}</span>
            </div>
            {supporters.length > 0 && <SupporterAvatarStack supporters={supporters} size={18} />}
          </div>

          {/* Actions — Like / Comment / Share / CTA */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={doLike}
              aria-label={liked ? 'إلغاء الإعجاب' : 'إعجاب'}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors min-h-[40px] ${liked ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text'}`}
            >
              <motion.span animate={likeAnimating ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.4 }}>
                <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
              </motion.span>
              {likeCount}
            </button>
            <button
              onClick={handleComment}
              aria-label="تعليق"
              className="p-2 rounded-lg bg-tamam-surface-high text-tamam-text-muted min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <MessageCircle size={15} />
            </button>
            <button
              onClick={handleShare}
              aria-label="مشاركة"
              className="p-2 rounded-lg bg-tamam-surface-high text-tamam-text-muted min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <Share2 size={15} />
            </button>
            <button
              onClick={openClick}
              className="mr-auto flex items-center gap-0.5 text-tamam-green-bright text-[11px] font-bold px-2 min-h-[40px]"
            >
              شوف المود <ChevronLeft size={13} />
            </button>
          </div>
        </div>
      </div>
      <CommentSheet
        proposal={proposal}
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        onCountChange={setCommentCount}
      />
    </>
  );
}