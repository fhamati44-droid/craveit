import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Send, Trash2 } from 'lucide-react';
import TamamAvatar from './TamamAvatar';
import { addComment, deleteComment } from '@/lib/communityMoodApi';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/i18n/LanguageContext';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `${days} يوم`;
}

export default function CommentSection({ proposalId, comments = [], currentUserId, onUpdate }) {
  const { t } = useLanguage();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [list, setList] = useState(comments);

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const comment = await addComment(proposalId, body.trim());
      setList([{ ...comment, user_display_name: comment.user_display_name }, ...list]);
      setBody('');
      track('community_mood_commented', { proposal_id: proposalId });
      if (onUpdate) onUpdate(list.length + 1);
    } catch (err) {
      setError(err?.error === 'auth_required' ? 'سجّل أولًا عشان تعلّق' : 'صار خطأ، جرّب مرة ثانية');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      setList(list.filter((c) => c.id !== commentId));
      if (onUpdate) onUpdate(list.length - 1);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* Comment input */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 300))}
            placeholder="اكتب تعليق..."
            rows={2}
            className="w-full bg-tamam-surface-low text-tamam-text text-sm rounded-xl px-3 py-2 border border-tamam-outline/30 focus:outline-none focus:border-tamam-green resize-none"
          />
          <span className="absolute bottom-1.5 left-2 text-[9px] text-tamam-text-muted">{body.length}/300</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || submitting}
          className="bg-tamam-green text-tamam-ink p-2.5 rounded-xl disabled:opacity-40 active:scale-95 transition-transform"
        >
          <Send size={16} />
        </button>
      </div>
      {error && <p className="text-tamam-error text-xs">{error}</p>}

      {/* Comments list */}
      <div className="space-y-2">
        {list.length === 0 && (
          <p className="text-center text-tamam-text-muted text-xs py-4">لسه ما في تعليقات. كن أول واحد!</p>
        )}
        {list.map((c) => (
          <div key={c.id} className="flex gap-2 bg-tamam-surface-low rounded-xl p-2.5">
            <TamamAvatar
              type={c.user_avatar_type}
              avatarKey={c.user_avatar_key}
              url={c.user_avatar_url}
              size={28}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-tamam-text text-xs font-bold truncate">{c.user_display_name}</span>
                <span className="text-tamam-text-muted text-[10px]">{timeAgo(c.created_date)}</span>
                {c.user_id === currentUserId && (
                  <button onClick={() => handleDelete(c.id)} className="mr-auto text-tamam-text-muted hover:text-tamam-error">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="text-tamam-text-muted text-xs leading-snug mt-0.5 break-words">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}