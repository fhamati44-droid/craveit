import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import CommunityMoodCard from './CommunityMoodCard';
import ShareSheet from './ShareSheet';
import { getHomepageSection } from '@/lib/communityMoodApi';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// Community Mood preview on Home — "see what other people built".
// The game-entry banner was removed to avoid competing with HomeMoodGamePreview;
// the game is still reachable via the "اعمل مودك" action below.
const TEXT = {
  ar: {
    headerTitle: 'شو الناس طالبة اليوم؟',
    headerSubtitle: 'مودات حقيقية عملها الناس — شوف وشجّع اللي عجبك.',
    makeMood: 'اعمل مودك',
    viewAllMoods: 'شوف مودات الناس',
    listHeading: '',
    listSubtitle: '',
    empty: 'أول مود للناس لسه بالطريق 👀',
    emptyCta: 'ابدأ اللعبة',
    errorRetry: 'إعادة المحاولة',
    proposalsError: 'ما قدرنا نحمّل المودات',
  },
  he: {
    headerTitle: 'מה הקהילה סידרה על השולחן',
    headerSubtitle: 'מודים אמיתיים של הקהילה. תמכו במוד שאהבתם בלייק או תגובה.',
    makeMood: 'צרו מוד',
    viewAllMoods: 'צפו בכולם',
    listHeading: 'מודים שהקהילה יצרה',
    listSubtitle: 'תמכו במוד שאהבתם בלייק או תגובה.',
    empty: 'לא פורסם מוד ראשון עדיין',
    emptyCta: 'התחילו את המשחק',
    errorRetry: 'נסה שוב',
    proposalsError: 'לא הצלחנו לטעון את המודים',
  },
};

export default function CommunityMoodGameSection() {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const [proposals, setProposals] = useState([]);
  const [proposalsError, setProposalsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inView, setInView] = useState(false);
  const [shareProposal, setShareProposal] = useState(null);
  const sectionRef = useRef(null);
  const t = locale === 'he' ? TEXT.he : TEXT.ar;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const loadProposals = () => {
    setProposalsError(false);
    getHomepageSection()
      .then((res) => {
        setProposals(res?.proposals || []);
        track('community_game_banner_viewed', { has_proposals: (res?.proposals?.length || 0) > 0 });
      })
      .catch(() => setProposalsError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (inView) loadProposals(); }, [inView, locale]);

  const makeMood = () => { track('community_game_started', { source: 'community_section' }); navigate('/mood-game'); };
  const viewAll = () => { track('home_community_mood_opened', { source: 'community_section' }); navigate('/community-moods'); };

  return (
    <section ref={sectionRef} className="px-4 py-4" dir="rtl">
      {/* Compact header — no large competing banner */}
      <div className="mb-3">
        <h3 className="text-tamam-text font-bold text-sm">{t.headerTitle}</h3>
        <p className="text-tamam-text-muted text-[11px] mt-0.5 leading-snug">{t.headerSubtitle}</p>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={viewAll} className="h-9 px-3 rounded-full bg-tamam-surface-high text-tamam-text font-bold text-xs active:scale-95 transition-transform">{t.viewAllMoods}</button>
          <button onClick={makeMood} className="h-9 px-3 rounded-full bg-tamam-green text-tamam-ink font-bold text-xs active:scale-95 transition-transform flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">play_arrow</span>{t.makeMood}
          </button>
        </div>
      </div>

      {/* Lazy-loaded community mood list */}
      {!inView ? (
        <div className="min-h-[120px]" />
      ) : loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[1, 2].map((i) => (
            <div key={i} className="flex-shrink-0 w-[280px] h-[200px] skeleton-t rounded-2xl" />
          ))}
        </div>
      ) : proposalsError ? (
        <div className="flex flex-col items-center py-6">
          <p className="text-tamam-text-muted text-sm mb-3">{t.proposalsError}</p>
          <button onClick={loadProposals} className="flex items-center gap-1.5 bg-tamam-surface text-tamam-text font-bold text-xs px-4 py-2 rounded-full">
            <RefreshCw size={12} /> {t.errorRetry}
          </button>
        </div>
      ) : proposals.length > 0 ? (
        <div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {proposals.slice(0, 2).map((p) => (
              <CommunityMoodCard key={p.id} proposal={p} onShare={setShareProposal} />
            ))}
          </div>
          <button onClick={viewAll} className="mt-3 w-full h-10 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5">
            {t.viewAllMoods} <ChevronLeft size={14} />
          </button>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-tamam-text-muted text-sm mb-3">{t.empty}</p>
          <button onClick={makeMood} className="bg-tamam-green text-tamam-ink font-bold text-xs px-5 py-2 rounded-full min-h-[36px]">{t.emptyCta}</button>
        </div>
      )}

      <ShareSheet proposal={shareProposal} open={!!shareProposal} onClose={() => setShareProposal(null)} />
    </section>
  );
}