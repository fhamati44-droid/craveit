import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, MessageCircle, Facebook, Download } from 'lucide-react';
import { recordShare } from '@/lib/communityMoodApi';
import { track } from '@/lib/analytics';

export default function ShareSheet({ proposal, open, onClose }) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (proposal) {
      setShareUrl(`${window.location.origin}/community-moods/${proposal.id}`);
    }
  }, [proposal]);

  if (!proposal) return null;

  const shareText = `شوف مود ${proposal.mood_title_ar} وادعمه بلايك 👇`;
  const fullUrl = `${window.location.origin}/community-moods/${proposal.id}`;

  const handleShare = async (channel) => {
    recordShare(proposal.id, channel).catch(() => {});
    track('community_mood_shared', { proposal_id: proposal.id, channel });

    switch (channel) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
        break;
      case 'native':
        if (navigator.share) {
          navigator.share({ title: proposal.mood_title_ar, text: shareText, url: fullUrl }).catch(() => {});
        }
        break;
      case 'copy_link':
        navigator.clipboard.writeText(fullUrl).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
        break;
      case 'download':
        // TODO: Generate mood card image
        track('community_mood_shared', { proposal_id: proposal.id, channel: 'download_initiated' });
        break;
    }
  };

  const channels = [
    { key: 'whatsapp', label: 'واتساب', icon: <MessageCircle size={20} />, color: 'bg-[#25D366] text-white' },
    { key: 'facebook', label: 'فيسبوك', icon: <Facebook size={20} />, color: 'bg-[#1877F2] text-white' },
    { key: 'native', label: 'مشاركة', icon: <ShareIcon />, color: 'bg-tamam-surface-high text-tamam-text' },
    { key: 'copy_link', label: copied ? 'تم النسخ' : 'نسخ الرابط', icon: copied ? <Check size={20} /> : <Copy size={20} />, color: 'bg-tamam-surface-high text-tamam-text' },
    { key: 'download', label: 'حفظ الكارت', icon: <Download size={20} />, color: 'bg-tamam-surface-high text-tamam-text' },
  ];

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-tamam-surface rounded-t-3xl pb-safe"
            dir="rtl"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-tamam-outline/20">
              <h2 className="text-tamam-text font-bold text-base">شارك المود</h2>
              <button onClick={onClose} className="p-1.5 rounded-full bg-tamam-surface-high text-tamam-text-muted">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <div className="bg-tamam-surface-low rounded-xl p-3 mb-3">
                <p className="text-tamam-text-muted text-xs">{shareText}</p>
                <p className="text-tamam-green-bright text-[11px] mt-1 break-all">{fullUrl}</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {channels.map((ch) => (
                  <button
                    key={ch.key}
                    onClick={() => handleShare(ch.key)}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${ch.color}`}>
                      {ch.icon}
                    </div>
                    <span className="text-tamam-text-muted text-[10px] text-center">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}