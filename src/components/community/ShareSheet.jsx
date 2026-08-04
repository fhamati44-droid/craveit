import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, MessageCircle, Facebook, Download, Instagram, Share2 } from 'lucide-react';
import { recordShare } from '@/lib/communityMoodApi';
import { track } from '@/lib/analytics';
import { resolvePublicImage } from '@/lib/imageUtils';

export default function ShareSheet({ proposal, open, onClose }) {
  const [copied, setCopied] = useState(false);
  const [instruction, setInstruction] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    if (open) { setInstruction(''); setCopied(false); }
  }, [open, proposal]);

  if (!proposal) return null;

  const restaurantName = proposal.restaurant_snapshots?.[0]?.name || '';
  const shareText = restaurantName
    ? `شوف مود ${proposal.mood_title_ar} من ${restaurantName} وادعمه بلايك 👇`
    : `شوف مود ${proposal.mood_title_ar} وادعمه بلايك 👇`;
  const fullUrl = `${window.location.origin}/community-moods/${proposal.id}`;

  const buildCardImage = async () => {
    if (!cardRef.current) return null;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2, useCORS: false, allowTaint: false, logging: false });
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  };

  const triggerDownload = (dataUrl) => {
    const link = document.createElement('a');
    link.download = `tamam-mood-${proposal.id}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShare = async (channel) => {
    switch (channel) {
      case 'whatsapp':
        recordShare(proposal.id, 'whatsapp').catch(() => {});
        track('community_mood_shared', { proposal_id: proposal.id, channel: 'whatsapp' });
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`, '_blank');
        break;
      case 'facebook':
        recordShare(proposal.id, 'facebook').catch(() => {});
        track('community_mood_shared', { proposal_id: proposal.id, channel: 'facebook' });
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
        break;
      case 'native':
        if (navigator.share) {
          recordShare(proposal.id, 'native').catch(() => {});
          track('community_mood_shared', { proposal_id: proposal.id, channel: 'native' });
          navigator.share({ title: proposal.mood_title_ar, text: shareText, url: fullUrl }).catch(() => {});
        } else {
          setInstruction('المشاركة المباشرة مش مدعومة على هالجهاز. استخدم نسخ الرابط أو واتساب.');
        }
        break;
      case 'copy_link':
        navigator.clipboard.writeText(fullUrl).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
        // copy_link does not count as a completed share
        track('community_mood_shared', { proposal_id: proposal.id, channel: 'copy_link' });
        break;
      case 'download': {
        const dataUrl = await buildCardImage();
        if (dataUrl) {
          triggerDownload(dataUrl);
          recordShare(proposal.id, 'download').catch(() => {});
          track('community_mood_shared', { proposal_id: proposal.id, channel: 'download' });
        } else {
          setInstruction('ما قدرنا نحفظ الكارت. جرّب نسخ الرابط بدل ذلك.');
        }
        break;
      }
      case 'instagram': {
        const dataUrl = await buildCardImage();
        // Copy share text first
        navigator.clipboard.writeText(`${shareText}\n${fullUrl}`).catch(() => {});
        if (dataUrl) {
          triggerDownload(dataUrl);
          setInstruction('حفظنا كارت المود ونسخنا النص. افتح انستغرام، الصق النص في ستوري/منشور، وأضف الكارت اللي تحمّل.');
        } else {
          setInstruction('نسخنا نص المشاركة. افتح انستغرام والصق النص في ستوري أو منشور.');
        }
        recordShare(proposal.id, 'instagram').catch(() => {});
        track('community_mood_shared', { proposal_id: proposal.id, channel: 'instagram' });
        // Open Instagram web (direct automatic posting is not supported by browsers)
        window.open('https://www.instagram.com/', '_blank');
        break;
      }
    }
  };

  const channels = [
    { key: 'whatsapp', label: 'واتساب', icon: <MessageCircle size={20} />, color: 'bg-[#25D366] text-white' },
    { key: 'facebook', label: 'فيسبوك', icon: <Facebook size={20} />, color: 'bg-[#1877F2] text-white' },
    { key: 'instagram', label: 'انستغرام', icon: <Instagram size={20} />, color: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white' },
    { key: 'native', label: 'مشاركة', icon: <Share2 size={20} />, color: 'bg-tamam-surface-high text-tamam-text' },
    { key: 'copy_link', label: copied ? 'تم النسخ' : 'نسخ الرابط', icon: copied ? <Check size={20} /> : <Copy size={20} />, color: 'bg-tamam-surface-high text-tamam-text' },
    { key: 'download', label: 'حفظ الكارت', icon: <Download size={20} />, color: 'bg-tamam-surface-high text-tamam-text' },
  ];

  const mainMeal = proposal.meal_snapshots?.[0];
  const cover = resolvePublicImage(proposal.cover_image_url || (mainMeal && mainMeal.image_url), null);
  const total = (proposal.meal_snapshots || []).reduce((s, m) => s + (m.price || 0), 0);

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-tamam-surface rounded-t-3xl pb-safe max-h-[85vh] overflow-y-auto"
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
              <div className="grid grid-cols-3 gap-3">
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
              {instruction && (
                <div className="mt-3 bg-tamam-green/10 border border-tamam-green/20 rounded-lg p-3">
                  <p className="text-tamam-green-bright text-[11px] leading-relaxed">{instruction}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Hidden card for html2canvas capture — no external images to avoid taint */}
          <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }} aria-hidden>
            <div ref={cardRef} dir="rtl" style={{ width: 360, height: 540, background: 'linear-gradient(160deg, #0B0F0D, #0E3B40)', borderRadius: 28, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'Alexandria, sans-serif' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <div style={{ width: 28, height: 6, borderRadius: 4, background: '#EAC45C' }} />
                  <span style={{ color: '#EAC45C', fontSize: 16, fontWeight: 700 }}>TAMAM طاولة</span>
                </div>
                <div style={{ width: 92, height: 92, borderRadius: 20, background: '#1C211E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 20 }}>
                  {mainMeal ? (cover ? '🍽️' : '🍽️') : '🍽️'}
                </div>
                <h1 style={{ color: '#DFE3E0', fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{proposal.mood_title_ar}</h1>
                {restaurantName && <p style={{ color: '#89DB78', fontSize: 16, fontWeight: 700, margin: '8px 0 0' }}>{restaurantName}</p>}
                <p style={{ color: '#C0CAB8', fontSize: 13, margin: '12px 0 0' }}>
                  {(proposal.meal_snapshots || []).slice(0, 3).map((m) => m.name).join(' · ') || 'مود TAMAM'}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #40493C', paddingTop: 16 }}>
                <div style={{ display: 'flex', gap: 16, color: '#C0CAB8', fontSize: 13 }}>
                  <span>♥ {proposal.valid_likes_count || 0}/{proposal.target_likes || 100}</span>
                  <span>💬 {proposal.comments_count || 0}</span>
                </div>
                <span style={{ color: '#EAC45C', fontSize: 18, fontWeight: 700 }}>₪{Math.round(total)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}