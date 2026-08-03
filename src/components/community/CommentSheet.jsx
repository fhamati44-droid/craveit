import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CommentSection from './CommentSection';
import { getProposalDetail } from '@/lib/communityMoodApi';

export default function CommentSheet({ proposal, open, onClose, onCountChange }) {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && proposal?.id) {
      setLoading(true);
      getProposalDetail(proposal.id)
        .then((d) => {
          const c = d?.comments || [];
          setComments(c);
          setCount(c.length);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, proposal?.id]);

  if (!proposal) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-tamam-surface rounded-t-3xl pb-safe max-h-[75vh] flex flex-col"
            dir="rtl"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-tamam-outline/20">
              <div>
                <h2 className="text-tamam-text font-bold text-sm line-clamp-1">{proposal.mood_title_ar}</h2>
                <p className="text-tamam-text-muted text-[10px]">{count} تعليق</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full bg-tamam-surface-high text-tamam-text-muted">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {loading ? (
                <p className="text-center text-tamam-text-muted text-xs py-4">جاري التحميل...</p>
              ) : (
                <CommentSection
                  proposalId={proposal.id}
                  comments={comments}
                  onUpdate={(newCount) => { setCount(newCount); onCountChange?.(newCount); }}
                />
              )}
            </div>
            <button
              onClick={() => { onClose(); navigate(`/community-moods/${proposal.id}`); }}
              className="border-t border-tamam-outline/20 px-4 py-3 flex items-center justify-center gap-1 text-tamam-green-bright text-xs font-bold"
            >
              عرض كل التعليقات <ChevronLeft size={14} />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}