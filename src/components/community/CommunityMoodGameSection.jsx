import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronLeft, Play, RefreshCw } from 'lucide-react';
import CommunityMoodCard from './CommunityMoodCard';
import ShareSheet from './ShareSheet';
import { getHomepageSection } from '@/lib/communityMoodApi';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// Exact production text — config overrides if admin edits
const TEXT = {
  ar: {
    title: 'مود جيم TAMAM',
    subtitle: 'اختار المطاعم والوجبات، رتّبها على الطاولة، واعمل المود بطريقتك.',
    ctaPrimary: 'ادخل على مود جيم',
    ctaSecondary: 'شوف مودات الناس',
    listHeading: 'مودات مولّعة 🔥',
    listSubtitle: 'شوف المودات اللي عملها الناس وادعم المود اللي عجبك.',
    viewAll: 'شوف كل مودات الناس',
    empty: 'أول مود للناس لسه بالطريق 👀',
    emptyCta: 'ابدأ اللعبة',
    errorRetry: 'إعادة المحاولة',
    proposalsError: 'ما قدرنا نحمّل المودات',
  },
  he: {
    title: 'משחק המוד של TAMAM',
    subtitle: 'בוחרים מנות, מסדרים על השולחן ויוצרים מוד.',
    ctaPrimary: 'היכנסו למשחק',
    ctaSecondary: 'צפו במודים של הקהילה',
    listHeading: 'מודים שהקהילה יצרה',
    listSubtitle: 'תמכו במוד שאהבתם בלייק, תגובה או שיתוף.',
    viewAll: 'צפו בכולם',
    empty: 'לא פורסם מוד ראשון עדיין. המוד שלך יכול להיות הראשון.',
    emptyCta: 'צרו את המוד הראשון',
    errorRetry: 'נסה שוב',
    proposalsError: 'לא הצלחנו לטעון את המודים',
  },
};

export default function CommunityMoodGameSection() {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const [config, setConfig] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [proposalsError, setProposalsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inView, setInView] = useState(false);
  const [shareProposal, setShareProposal] = useState(null);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  const t = locale === 'he' ? TEXT.he : TEXT.ar;
  const isRTL = true;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const loadProposals = () => {
    setProposalsError(false);
    getHomepageSection()
      .then((res) => {
        setConfig(res?.config || null);
        setProposals(res?.proposals || []);
        if (res?.enabled !== false) {
          track('community_game_banner_viewed', { has_proposals: (res?.proposals?.length || 0) > 0 });
        }
      })
      .catch(() => setProposalsError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!inView) return;
    loadProposals();
  }, [inView, locale]);

  // Pause video when out of view or tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden || !inView) {
        videoRef.current?.pause();
      } else if (inView && config?.preview_media_url) {
        videoRef.current?.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [inView, config]);

  return (
    <section ref={sectionRef} id="community-mood-home-section" className="px-4 py-4" dir="rtl">
      {/* ===== GAME ENTRY BANNER — always visible, hardcoded, no config/login/condition ===== */}
      <section id="mood-game-entry-banner" className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-tamam-surface-low via-tamam-teal to-tamam-surface-lowest border border-tamam-outline/30">
        <div className="relative h-[180px] overflow-hidden">
          <AnimatedTablePreview />
          <div className="absolute inset-0 bg-gradient-to-t from-tamam-ink/80 via-tamam-ink/20 to-transparent" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-4 pointer-events-none">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={14} className="text-tamam-gold" />
            <span className="text-tamam-gold text-[10px] font-bold uppercase tracking-wide">TAMAM طاولة</span>
          </div>
          <h2 className="text-white font-bold text-lg leading-tight mb-1">{t.title}</h2>
          <p className="text-tamam-text-muted text-xs leading-snug mb-3 line-clamp-2">{t.subtitle}</p>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              id="open-mood-game-button"
              onClick={(e) => { e.stopPropagation(); track('community_game_started', { source: 'homepage_banner' }); navigate('/mood-game'); }}
              className="bg-tamam-green text-tamam-ink font-bold text-xs px-4 py-2 rounded-full active:scale-95 transition-transform flex items-center gap-1 min-h-[44px]"
            >
              <Play size={12} fill="currentColor" /> {t.ctaPrimary}
            </button>
            <button
              id="open-community-moods-button"
              onClick={(e) => { e.stopPropagation(); navigate('/community-moods'); }}
              className="bg-tamam-surface-high/80 text-tamam-text font-bold text-xs px-4 py-2 rounded-full active:scale-95 transition-transform min-h-[36px]"
            >
              {t.ctaSecondary}
            </button>
          </div>
        </div>
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start pointer-events-none">
          <FloatingHearts />
          <div className="bg-tamam-surface/90 rounded-lg px-2 py-1 text-[9px] text-tamam-text-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-tamam-green" /> معاينة
          </div>
        </div>
      </section>

      {/* ===== COMMUNITY MOOD LIST (lazy-loaded below the banner) ===== */}
      {!inView ? (
        <div className="mt-4 min-h-[120px]" />
      ) : loading ? (
        <div className="mt-4">
          <div className="h-4 w-32 skeleton-t rounded mb-2" />
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map((i) => (
              <div key={i} className="flex-shrink-0 w-[280px] h-[200px] skeleton-t rounded-2xl" />
            ))}
          </div>
        </div>
      ) : proposalsError ? (
        <div className="mt-4 flex flex-col items-center py-6">
          <p className="text-tamam-text-muted text-sm mb-3">{t.proposalsError}</p>
          <button onClick={loadProposals} className="flex items-center gap-1.5 bg-tamam-surface text-tamam-text font-bold text-xs px-4 py-2 rounded-full">
            <RefreshCw size={12} /> {t.errorRetry}
          </button>
        </div>
      ) : proposals.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-tamam-text font-bold text-sm">{t.listHeading}</h3>
              <button onClick={() => navigate('/community-moods')} className="text-tamam-green-bright text-[11px] font-bold flex items-center gap-0.5">
                {t.viewAll} <ChevronLeft size={12} />
              </button>
            </div>
            {t.listSubtitle && <p className="text-tamam-text-muted text-[10px] mt-0.5">{t.listSubtitle}</p>}
          </div>
          <div id="community-mood-list" className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {proposals.slice(0, 3).map((p) => (
              <CommunityMoodCard key={p.id} proposal={p} onShare={setShareProposal} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 text-center py-6">
          <p className="text-tamam-text-muted text-sm mb-3">{t.empty}</p>
          <button
            onClick={() => { track('community_game_started', { source: 'empty_state' }); navigate('/mood-game'); }}
            className="bg-tamam-green text-tamam-ink font-bold text-xs px-5 py-2 rounded-full min-h-[36px]"
          >
            {t.emptyCta}
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