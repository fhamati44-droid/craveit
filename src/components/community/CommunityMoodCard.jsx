import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, ChevronLeft } from 'lucide-react';
import TamamAvatar from './TamamAvatar';
import SupporterAvatarStack from './SupporterAvatarStack';
import { toggleLike, recordShare } from '@/lib/communityMoodApi';
import { resolvePublicImage } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const PACKAGE_LABELS = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };
const PACKAGE_COLORS = {
  classic: 'bg-tamam-green/20 text-tamam-green-bright',
  mix: 'bg-tamam-teal/40 text-tamam-cream',
  plus: 'bg-tamam-gold/20 text-tamam-gold',
};

export default function CommunityMoodCard({ proposal, onShare }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(proposal.valid_likes_count || 0);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const meals = proposal.meal_snapshots || [];
  const restaurants = proposal.restaurant_snapshots || [];
  const mainMeal = meals[0] || null;
  const restaurant = restaurants[0] || null;
  const coverImage = resolvePublicImage(proposal.cover_image_url || (mainMeal && mainMeal.image_url), null);
  const target = proposal.target_likes || 100;
  const percent = Math.min(100, Math.round((likeCount / target) * 100));

  const handleLike = async (e) => {
    e.stopPropagation();
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 600);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1);
    try {
      await toggleLike(proposal.id);
      track('community_mood_liked', { proposal_id: proposal.id, action: wasLiked ? 'unliked' : 'liked' });
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount(wasLiked ? likeCount : likeCount - 1);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    recordShare(proposal.id, 'native').catch(() => {});
    track('community_mood_shared', { proposal_id: proposal.id, channel: 'card' });
    if (onShare) onShare(proposal);
    else if (navigator.share) {
      navigator.share({ title: proposal.mood_title_ar, url: `${window.location.origin}/community-moods/${proposal.id}` }).catch(() => {});
    }
  };

  const open = () => {
    track('community_mood_viewed', { proposal_id: proposal.id, source: 'homepage_card' });
    navigate(`/community-moods/${proposal.id}`);
  };

  return (
    <div
      onClick={open}
      className="flex-shrink-0 w-[280px] bg-tamam-surface rounded-2xl overflow-hidden border border-tamam-outline/20 active:scale-[0.98] transition-transform cursor-pointer"
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
          <TamamAvatar
            type={proposal.creator_avatar_type}
            avatarKey={proposal.creator_avatar_key}
            url={proposal.creator_avatar_url}
            size={24}
          />
          <span className="text-tamam-text-muted text-[11px] truncate flex-1">{proposal.creator_display_name}</span>
        </div>

        {mainMeal && (
          <div className="text-[11px] text-tamam-text-muted">
            <span className="text-tamam-text font-semibold">{mainMeal.name}</span>
            {restaurant && <span> · {restaurant.name}</span>}
          </div>
        )}

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-tamam-text-muted">{likeCount} / {target} إعجاب</span>
            <span className="text-[10px] text-tamam-green-bright font-bold">{percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={likeCount}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-label="تقدم الإعجابات نحو الهدف"
            className="h-1.5 bg-tamam-surface-high rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-l from-tamam-green to-tamam-green-bright rounded-full"
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Social stats */}
        <div className="flex items-center gap-3 text-[10px] text-tamam-text-muted">
          <span className="flex items-center gap-0.5"><MessageCircle size={11} /> {proposal.comments_count || 0}</span>
          <span className="flex items-center gap-0.5"><Share2 size={11} /> {proposal.shares_count || 0}</span>
          {proposal.supporters?.length > 0 && <SupporterAvatarStack supporters={proposal.supporters} size={18} />}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${liked ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text'}`}
          >
            <motion.span animate={likeAnimating ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.4 }}>
              <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
            </motion.span>
            {liked ? 'دعمنا' : 'ادعم المود'}
          </button>
          <button onClick={handleShare} className="p-1.5 rounded-lg bg-tamam-surface-high text-tamam-text-muted">
            <Share2 size={13} />
          </button>
          <button onClick={open} className="mr-auto flex items-center gap-0.5 text-tamam-green-bright text-[11px] font-bold px-2">
            فتح <ChevronLeft size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}