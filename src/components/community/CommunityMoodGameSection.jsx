import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronLeft, Play } from 'lucide-react';
import CommunityMoodCard from './CommunityMoodCard';
import ShareSheet from './ShareSheet';
import { getHomepageSection } from '@/lib/communityMoodApi';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function CommunityMoodGameSection() {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inView, setInView] = useState(false);
  const [shareProposal, setShareProposal] = useState(null);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    getHomepageSection()
      .then((res) => {
        if (res?.enabled !== false) {
          setData(res);
          track('community_game_banner_viewed', { has_proposals: (res?.proposals?.length || 0) > 0 });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [inView, locale]);

  // Pause video when out of view or tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden || !inView) {
        videoRef.current?.pause();
      } else if (inView && data?.config?.preview_media_url) {
        videoRef.current?.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [inView, data]);

  if (!inView) {
    return <div ref={sectionRef} className="min-h-[200px]" />;
  }

  if (loading || !data || data.enabled === false) return null;

  const config = data.config || {};
  const proposals = data.proposals || [];
  const isRTL = locale === 'he' || locale === 'ar';
  const title = locale === 'he' ? config.section_title_he : config.section_title_ar;
  const subtitle = locale === 'he' ? config.section_subtitle_he : config.section_subtitle_ar;
  const ctaPrimary = locale === 'he' ? config.cta_primary_he : config.cta_primary_ar;
  const ctaSecondary = locale === 'he' ? config.cta_secondary_he : config.cta_secondary_ar;

  return (
    <section ref={sectionRef} className="px-4 py-4" dir="rtl">
      {/* Game Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-tamam-surface-low via-tamam-teal to-tamam-surface-lowest border border-tamam-outline/30">
        {/* Preview media (video or animated) */}
        <div className="relative h-[180px] overflow-hidden">
          {config.preview_media_url && inView ? (
            <video
              ref={videoRef}
              src={config.preview_media_url}
              poster={config.preview_poster_url || config.banner_poster_url}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          ) : (
            <AnimatedTablePreview />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-tamam-ink/80 via-tamam-ink/20 to-transparent" />
        </div>

        {/* Text overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={14} className="text-tamam-gold" />
            <span className="text-tamam-gold text-[10px] font-bold uppercase tracking-wide">TAMAM طاولة</span>
          </div>
          <h2 className="text-white font-bold text-lg leading-tight mb-1">{title}</h2>
          <p className="text-tamam-text-muted text-xs leading-snug mb-3 line-clamp-2">{subtitle}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { track('community_game_started', { source: 'homepage_banner' }); navigate('/mood-game'); }}
              className="bg-tamam-green text-tamam-ink font-bold text-xs px-4 py-2 rounded-full active:scale-95 transition-transform flex items-center gap-1"
            >
              <Play size={12} fill="currentColor" /> {ctaPrimary}
            </button>
            <button
              onClick={() => navigate('/community-moods')}
              className="bg-tamam-surface-high/80 text-tamam-text font-bold text-xs px-4 py-2 rounded-full active:scale-95 transition-transform"
            >
              {ctaSecondary}
            </button>
          </div>
        </div>

        {/* Floating preview elements */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start pointer-events-none">
          <FloatingHearts />
          <div className="bg-tamam-surface/90 rounded-lg px-2 py-1 text-[9px] text-tamam-text-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-tamam-green" /> معاينة
          </div>
        </div>
      </div>

      {/* Community Proposals Carousel */}
      {proposals.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-tamam-text font-bold text-sm">
              {locale === 'he' ? 'מודים שהקהילה יצרה' : 'مودات عملها الناس'}
            </h3>
            <button onClick={() => navigate('/community-moods')} className="text-tamam-green-bright text-[11px] font-bold flex items-center gap-0.5">
              شوف الكل <ChevronLeft size={12} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {proposals.map((p) => (
              <CommunityMoodCard key={p.id} proposal={p} onShare={setShareProposal} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 text-center py-6">
          <p className="text-tamam-text-muted text-sm mb-3">لسه ما نُشر أول مود. ممكن مودك يكون الأول.</p>
          <button
            onClick={() => { track('community_game_started', { source: 'empty_state' }); navigate('/mood-game'); }}
            className="bg-tamam-green text-tamam-ink font-bold text-xs px-5 py-2 rounded-full"
          >
            ابدأ اللعبة
          </button>
        </div>
      )}

      <ShareSheet
        proposal={shareProposal}
        open={!!shareProposal}
        onClose={() => setShareProposal(null)}
      />
    </section>
  );
}

function AnimatedTablePreview() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        className="relative"
        style={{ perspective: '800px' }}
        animate={{ rotateX: [15, 12, 15] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="w-48 h-24 rounded-lg bg-gradient-to-br from-tamam-surface-high to-tamam-surface border-2 border-tamam-outline/40 shadow-2xl"
          style={{ transform: 'rotateX(25deg)' }}
        >
          <div className="flex items-center justify-center gap-2 h-full px-3">
            {['🍔', '🍕', '🥗'].map((emoji, i) => (
              <motion.div
                key={i}
                className="w-10 h-10 rounded-lg bg-tamam-surface-low flex items-center justify-center text-lg shadow-lg"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              >
                {emoji}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FloatingHearts() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="text-tamam-green-bright text-xs"
          animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
        >
          ♥
        </motion.div>
      ))}
    </div>
  );
}