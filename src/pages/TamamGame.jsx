import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayableMoods, trackEvent } from '@/lib/tamamApi';
import { moodIconFor } from '@/lib/moodIcons';
import { resolvePublicImage, handleImageError } from '@/lib/imageUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function TamamGame() {
  const navigate = useNavigate();
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);
  const [orbitSize, setOrbitSize] = useState(300);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const m = await getPlayableMoods();
      setMoods(m || []);
    } catch (e) {
      console.error('PUBLIC_MOODS_LOAD_FAILED', {
        entityName: 'TamamMood',
        errorName: e?.name,
        errorMessage: e?.message,
        status: e?.status,
        code: e?.code,
      });
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Responsive orbit size — smaller on narrow screens, cap mood count to fit
  useEffect(() => {
    const calc = () => {
      const w = containerRef.current?.clientWidth || window.innerWidth;
      setOrbitSize(Math.min(300, Math.max(240, w - 24)));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const go = (mood) => {
    if (!mood?.id || selecting) return;
    trackEvent({ action: 'mood_selected', mood_id: mood.id });
    navigate(`/tamam-suggestions/${mood.id}`);
  };

  const startRandom = () => {
    if (!moods.length || selecting) return;
    setSelecting(true); setProgress(0);
    const start = Date.now();
    const duration = 1200;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      if (p < 100) {
        requestAnimationFrame(tick);
      } else {
        const mood = moods[Math.floor(Math.random() * moods.length)];
        if (!mood?.id) { setSelecting(false); return; }
        trackEvent({ action: 'mood_selected', mood_id: mood.id, source: 'tamam_random' });
        navigate(`/tamam-suggestions/${mood.id}`);
      }
    };
    requestAnimationFrame(tick);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-32">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-on-surface-variant text-sm">عم نجهّز المودات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="font-bold mb-2">ما قدرنا نحمّل المودات.</p>
        <p className="text-on-surface-variant text-sm mb-5">صار خطأ بتحميل المودات.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button type="button" onClick={load} className="h-12 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-transform">حاول مرة ثانية</button>
          <button type="button" onClick={() => navigate('/restaurants')} className="h-12 bg-surface border border-outline-variant/30 font-bold rounded-xl active:scale-95 transition-transform">تصفح المطاعم</button>
        </div>
      </div>
    );
  }

  if (!moods.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <div className="text-4xl mb-3">✨</div>
        <p className="font-bold mb-2">ما في اقتراحات جاهزة هسا.</p>
        <p className="text-on-surface-variant text-sm mb-6">جرّب لاحقًا أو تصفّح المطاعم مباشرة.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button type="button" onClick={() => navigate('/tamam-suggestions?package=all')} className="h-12 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-transform">كل الاقتراحات</button>
          <button type="button" onClick={() => navigate('/restaurants')} className="h-12 bg-surface border border-outline-variant/30 font-bold rounded-xl active:scale-95 transition-transform">تصفح المطاعم</button>
        </div>
      </div>
    );
  }

  // Cap moods to safe orbit capacity (max 8 for good spacing)
  const displayMoods = moods.slice(0, 8);
  const n = displayMoods.length;
  const radius = orbitSize / 2 - 44; // leave room for circle (76px/2 + a bit)
  const center = orbitSize / 2;
  const circleSize = 76;

  // Position helper — uses inline styles (no dynamic Tailwind classes)
  const positionForIndex = (index, total) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    return {
      position: 'absolute',
      left: `${center + Math.cos(angle) * radius - circleSize / 2}px`,
      top: `${center + Math.sin(angle) * radius - circleSize / 2}px`,
      width: `${circleSize}px`,
      height: `${circleSize}px`,
      zIndex: 5,
    };
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center px-4 pt-6 pb-10" style={{ overflow: 'visible' }}>
      {/* ambient — no overflow:hidden, so mood circles render fully */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-1/4 -right-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(137,219,120,0.08)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#071312] to-transparent" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">شو مودك هسا؟</h1>
          <p className="text-on-surface-variant text-sm">اختار أو اضغط انطلق لنفاجئك بالخيار الأنسب</p>
        </div>

        {/* Orbit container — overflow:visible so mood circles aren't clipped */}
        <div className="relative mx-auto" style={{ width: `${orbitSize}px`, height: `${orbitSize}px`, overflow: 'visible' }}>
          {/* Decorative rings */}
          <div className="absolute inset-0 border border-primary/20 rounded-full pointer-events-none" />
          <div className="absolute rounded-full border border-primary/10 pointer-events-none" style={{ inset: '20%' }} />

          {/* Mood circles */}
          {displayMoods.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => go(m)}
              style={positionForIndex(i, n)}
              className="bg-surface-container-high border-2 border-outline/30 rounded-full flex flex-col items-center justify-center p-1.5 text-center active:scale-90 transition-transform"
            >
              {m.image_url ? (
                <img
                  src={resolvePublicImage(m.image_url)}
                  alt={m.name_ar}
                  className="absolute inset-0 w-full h-full object-cover rounded-full opacity-25"
                  onError={handleImageError}
                />
              ) : null}
              <Icon name={moodIconFor(m)} className="text-primary text-xl mb-0.5 relative z-10" />
              <span className="text-[9px] font-medium leading-tight relative z-10 line-clamp-2 px-0.5">{m.name_ar}</span>
            </button>
          ))}

          {/* Start button — center */}
          <button
            onClick={startRandom}
            disabled={selecting}
            type="button"
            className="absolute rounded-full bg-primary flex flex-col items-center justify-center text-on-primary shadow-[0_0_40px_rgba(137,219,120,0.3)] active:scale-95 transition-all disabled:opacity-80"
            style={{
              left: `${center - 56}px`,
              top: `${center - 56}px`,
              width: '112px',
              height: '112px',
              zIndex: 10,
            }}
          >
            <span className="text-lg font-bold">{selecting ? 'لحظة...' : 'انطلق'}</span>
            <span className="text-[10px] opacity-70">{selecting ? 'بنختار المود' : 'اضغط هنا'}</span>
          </button>
        </div>

        {selecting && (
          <div className="mt-8 text-center">
            <p className="text-primary font-medium mb-3">جاري اختيار المود المناسب...</p>
            <div className="h-1 w-24 bg-primary/20 mx-auto rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {moods.length > 8 && (
          <button
            type="button"
            onClick={() => navigate('/tamam-suggestions?package=all')}
            className="mt-6 text-primary text-sm font-bold"
          >
            كل المودات ({moods.length})
          </button>
        )}
      </div>
    </div>
  );
}