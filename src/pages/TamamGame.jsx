import { useState, useEffect } from 'react';
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

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const m = await getPlayableMoods();
      setMoods(m || []);
    } catch (e) {
      console.error('TamamGame load error', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const go = (mood) => {
    if (!mood?.id) return;
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

  const n = moods.length;
  const R = 132;

  if (loading) {
    return (
      <div className="relative min-h-[calc(100dvh-56px)] flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-on-surface-variant text-sm">عم نجهّز المودات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-[calc(100dvh-56px)] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="font-bold mb-2">ما قدرنا نحمّل اللعبة.</p>
        <p className="text-on-surface-variant text-sm mb-5">صار خطأ بتحميل المودات.</p>
        <button onClick={load} className="bg-primary text-on-primary font-bold px-6 py-3 rounded-full active:scale-95 transition-transform">حاول مرة ثانية</button>
      </div>
    );
  }

  if (!n) {
    return (
      <div className="relative min-h-[calc(100dvh-56px)] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl mb-3">✨</div>
        <p className="font-bold mb-2">ما في اقتراحات متاحة هسا.</p>
        <p className="text-on-surface-variant text-sm mb-6">جرّب لاحقًا أو تصفّح المطاعم مباشرة.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => navigate('/tamam-suggestions?package=all')} className="h-12 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-transform">شوف كل الاقتراحات</button>
          <button onClick={() => navigate('/restaurants')} className="h-12 bg-surface border border-outline-variant/30 font-bold rounded-xl active:scale-95 transition-transform">تصفح المطاعم</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100dvh-56px)] flex flex-col items-center overflow-hidden pt-6 pb-10">
      {/* ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-1/4 -right-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(137,219,120,0.08)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#071312] to-transparent" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center flex-1 justify-center px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2 text-white">شو مودك هسا؟</h1>
          <p className="text-on-surface-variant text-sm">اختار أو اضغط انطلق لنفاجئك بالخيار الأنسب</p>
        </div>

        <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center">
          <div className="absolute inset-0 border border-primary/20 rounded-full" />
          <div className="absolute inset-0 border border-primary/10 rounded-full scale-[0.6]" />
          {moods.map((m, i) => {
            const angle = (360 / n) * i;
            const rad = (angle - 90) * Math.PI / 180;
            const x = 50 + (R / 160) * 50 * Math.cos(rad);
            const y = 50 + (R / 160) * 50 * Math.sin(rad);
            return (
              <button key={m.id} type="button" onClick={() => go(m)}
                className="absolute w-20 h-20 -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${x}%`, top: `${y}%` }}>
                <div className="w-20 h-20 bg-surface-container-high border-2 border-outline/30 rounded-full flex flex-col items-center justify-center p-2 text-center group-hover:border-primary/60 group-active:scale-95 transition-all overflow-hidden">
                  {m.image_url ? (
                    <img
                      src={resolvePublicImage(m.image_url)}
                      alt={m.name_ar}
                      className="absolute inset-0 w-full h-full object-cover rounded-full opacity-30"
                      onError={handleImageError}
                    />
                  ) : null}
                  <Icon name={moodIconFor(m)} className="text-primary text-2xl mb-1 relative z-10" />
                  <span className="text-[10px] font-medium leading-tight relative z-10">{m.name_ar}</span>
                </div>
              </button>
            );
          })}
          <button onClick={startRandom} disabled={selecting} type="button"
            className="relative z-40 w-32 h-32 rounded-full bg-primary flex flex-col items-center justify-center text-on-primary shadow-[0_0_40px_rgba(137,219,120,0.3)] active:scale-95 transition-all disabled:opacity-80">
            <span className="text-xl font-bold">{selecting ? 'لحظة...' : 'انطلق'}</span>
            <span className="text-[10px] opacity-70">{selecting ? 'بنختار المود' : 'اضغط هنا'}</span>
          </button>
        </div>

        {selecting && (
          <div className="mt-10 text-center">
            <p className="text-primary font-medium mb-3">جاري اختيار المود المناسب...</p>
            <div className="h-1 w-24 bg-primary/20 mx-auto rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}