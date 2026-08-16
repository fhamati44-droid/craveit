import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayableMoods, trackEvent } from '@/lib/tamamApi';
import { moodIconFor } from '@/lib/moodIcons';
import { resolvePublicImage, handleImageError } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';

/**
 * HomeTamamGamePreview — a mini, playable version of the TAMAM mood-orbit
 * game (جيم تمام: "شو مودك هسا؟") shown directly on Home. The user picks a
 * real mood (or taps "انطلق" for a random pick) right here, then continues to
 * the suggestion sets — mirroring how HomeMoodGamePreview lets the first move
 * happen on Home. Reuses real moods; no navigation to /tamam-game needed.
 */
const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function HomeTamamGamePreview() {
  const navigate = useNavigate();
  const [moods, setMoods] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [selecting, setSelecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);
  const [orbitSize, setOrbitSize] = useState(210);

  const load = async () => {
    setStatus('loading');
    try {
      const m = await getPlayableMoods();
      setMoods(m || []);
      setStatus((m || []).length ? 'ready' : 'empty');
    } catch (e) {
      setStatus('error');
    }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const calc = () => {
      const w = containerRef.current?.clientWidth || window.innerWidth;
      setOrbitSize(Math.min(240, Math.max(200, Math.min(w - 32, 232))));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    if (status === 'ready') track('home_tamam_game_preview_viewed', {});
  }, [status]);

  const go = (mood, src = 'tap') => {
    if (!mood?.id || selecting) return;
    track('home_tamam_game_mood_picked', { mood_id: mood.id, source: src });
    trackEvent({ action: 'mood_selected', mood_id: mood.id, source: src });
    navigate(`/tamam-suggestions/${mood.id}`);
  };

  const startRandom = () => {
    if (!moods.length || selecting) return;
    setSelecting(true); setProgress(0);
    const start = Date.now();
    const duration = 1100;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      if (p < 100) {
        requestAnimationFrame(tick);
      } else {
        const mood = moods[Math.floor(Math.random() * moods.length)];
        setSelecting(false);
        if (mood?.id) go(mood, 'tamam_random');
      }
    };
    requestAnimationFrame(tick);
  };

  const displayMoods = moods.slice(0, 6);
  const n = displayMoods.length;
  const radius = orbitSize / 2 - 38;
  const center = orbitSize / 2;
  const circleSize = 56;
  const centerBtn = 78;

  const positionForIndex = (index, total) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    return {
      left: `${center + Math.cos(angle) * radius - circleSize / 2}px`,
      top: `${center + Math.sin(angle) * radius - circleSize / 2}px`,
      width: `${circleSize}px`,
      height: `${circleSize}px`,
    };
  };

  return (
    <section ref={containerRef} className="px-4 pt-1 pb-1" dir="rtl">
      <div className="relative rounded-2xl overflow-hidden border border-tamam-outline/30 bg-tamam-surface p-4"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 18%, rgba(137,219,120,0.08) 0%, transparent 60%)' }}>

        {/* Header */}
        <div className="text-center mb-3">
          <span className="inline-flex items-center gap-1 text-tamam-gold text-[10px] font-bold">
            <Icon name="auto_awesome" className="text-[13px]" />جيم تمام
          </span>
          <h2 className="text-tamam-text font-bold text-[18px] leading-snug mt-1">شو مودك اليوم؟</h2>
          <p className="text-tamam-text-muted text-[11px] leading-snug mt-0.5">اختَر مود، وإحنا منرتّبلك الخيارات.</p>
        </div>

        {/* Body */}
        {status === 'loading' ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-12 h-12 border-2 border-tamam-green border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-tamam-text-muted text-[11px]">عم نجهّز المودات...</p>
          </div>
        ) : status === 'error' ? (
          <div className="text-center py-6">
            <p className="text-tamam-text-muted text-[11px] mb-3">ما قدرنا نحمّل المودات إسا.</p>
            <button onClick={load} className="h-10 px-4 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-xs active:scale-95 transition-transform">حاول مرة ثانية</button>
          </div>
        ) : status === 'empty' ? (
          <div className="text-center py-6">
            <p className="text-tamam-text font-bold text-sm mb-1">ما في مودات جاهزة إسا</p>
            <p className="text-tamam-text-muted text-[11px] mb-3">تصفّح الاقتراحات أو المطاعم مباشرة.</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => navigate('/tamam-suggestions?package=all')} className="h-10 px-4 rounded-xl bg-tamam-green text-tamam-ink font-bold text-xs active:scale-95 transition-transform">كل الاقتراحات</button>
              <button onClick={() => navigate('/restaurants')} className="h-10 px-4 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-xs active:scale-95 transition-transform">تصفّح المطاعم</button>
            </div>
          </div>
        ) : (
          <>
            {/* Orbit */}
            <div className="relative mx-auto" style={{ width: `${orbitSize}px`, height: `${orbitSize}px`, overflow: 'visible' }}>
              <div className="absolute inset-0 border border-tamam-green/20 rounded-full pointer-events-none" />
              <div className="absolute rounded-full border border-tamam-green/10 pointer-events-none" style={{ inset: '20%' }} />

              {displayMoods.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => go(m, 'tap')}
                  disabled={selecting}
                  style={{ position: 'absolute', ...positionForIndex(i, n), zIndex: 5 }}
                  className="bg-tamam-surface-high border-2 border-tamam-outline/40 rounded-full flex flex-col items-center justify-center p-1 text-center active:scale-90 active:border-tamam-green-bright transition-transform disabled:opacity-60"
                  aria-label={m.name_ar || 'مود'}
                >
                  {m.image_url ? (
                    <img
                      src={resolvePublicImage(m.image_url)}
                      alt={m.name_ar || ''}
                      className="absolute inset-0 w-full h-full object-cover rounded-full opacity-25"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                    />
                  ) : null}
                  <Icon name={moodIconFor(m)} className="text-tamam-green-bright text-[18px] mb-0.5 relative z-10" />
                  <span className="text-[8px] font-medium leading-tight relative z-10 line-clamp-2 px-0.5 text-tamam-text">{m.name_ar}</span>
                </button>
              ))}

              {/* Center "انطلق" */}
              <button
                 onClick={startRandom}
                 disabled={selecting}
                 type="button"
                 className="absolute rounded-full bg-tamam-green flex flex-col items-center justify-center text-tamam-ink active:scale-90 transition-all disabled:opacity-80"
                 style={{ left: `${center - centerBtn / 2}px`, top: `${center - centerBtn / 2}px`, width: `${centerBtn}px`, height: `${centerBtn}px`, zIndex: 10, boxShadow: '0 0 32px rgba(137,219,120,0.45), inset 0 0 12px rgba(255,255,255,0.15)' }}
               >
                 <span className="material-symbols-outlined text-[22px] mb-0.5">{selecting ? 'hourglass_top' : 'auto_awesome'}</span>
                 <span className="text-[13px] font-bold leading-none">{selecting ? 'لحظة' : 'انطلق'}</span>
                 <span className="text-[9px] opacity-80 mt-0.5">{selecting ? 'بنختار' : 'فاجئني'}</span>
               </button>
            </div>

            {/* Selecting progress */}
            {selecting && (
              <div className="mt-3 text-center">
                <p className="text-tamam-green-bright text-[11px] font-medium mb-2">جاري اختيار المود المناسب...</p>
                <div className="h-1 w-24 bg-tamam-green/20 mx-auto rounded-full overflow-hidden">
                  <div className="h-full bg-tamam-green transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {!selecting && moods.length > 6 && (
              <button
                type="button"
                onClick={() => navigate('/tamam-suggestions?package=all')}
                className="mt-3 block mx-auto text-tamam-green-bright text-[11px] font-bold"
              >
                كل المودات ({moods.length})
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}