import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveMoods } from '@/lib/tamamApi';
import { trackEvent } from '@/lib/tamamApi';
import { moodIconFor } from '@/lib/moodIcons';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function TamamGame() {
  const navigate = useNavigate();
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => { getActiveMoods().then(m => { setMoods(m || []); }).finally(() => setLoading(false)); }, []);

  const go = (mood) => {
    trackEvent({ action: 'mood_selected', mood_id: mood?.id });
    navigate(`/tamam-suggestions/${mood.id}`);
  };
  const startRandom = () => {
    if (!moods.length || selecting) return;
    setSelecting(true); setProgress(0);
    const start = Date.now();
    const tick = () => {
      const p = Math.min(100, (Date.now() - start) / 12);
      setProgress(p);
      if (p < 100) requestAnimationFrame(tick);
      else {
        const mood = moods[Math.floor(Math.random() * moods.length)];
        trackEvent({ action: 'mood_selected', mood_id: mood?.id, source: 'tamam_random' });
        navigate(`/tamam-suggestions/${mood.id}`);
      }
    };
    requestAnimationFrame(tick);
  };

  const n = moods.length;
  const R = 132;

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

        {loading ? (
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center">
            <div className="absolute inset-0 border border-primary/20 rounded-full" />
            <div className="absolute inset-0 border border-primary/10 rounded-full scale-[0.6]" />
            {moods.map((m, i) => {
              const angle = (360 / n) * i;
              const rad = (angle - 90) * Math.PI / 180;
              const x = 50 + (R / 160) * 50 * Math.cos(rad);
              const y = 50 + (R / 160) * 50 * Math.sin(rad);
              return (
                <button key={m.id} onClick={() => go(m)}
                  className="absolute w-20 h-20 -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${x}%`, top: `${y}%` }}>
                  <div className="w-20 h-20 bg-surface-container-high border-2 border-outline/30 rounded-full flex flex-col items-center justify-center p-2 text-center group-hover:border-primary/60 group-active:scale-95 transition-all">
                    <Icon name={moodIconFor(m)} className="text-primary text-2xl mb-1" />
                    <span className="text-[10px] font-medium leading-tight">{m.name_ar}</span>
                  </div>
                </button>
              );
            })}
            <button onClick={startRandom} disabled={selecting}
              className="relative z-40 w-32 h-32 rounded-full bg-primary flex flex-col items-center justify-center text-on-primary shadow-[0_0_40px_rgba(137,219,120,0.3)] active:scale-95 transition-all disabled:opacity-80">
              <span className="text-xl font-bold">{selecting ? 'لحظة...' : 'انطلق'}</span>
              <span className="text-[10px] opacity-70">{selecting ? 'بنختار المود' : 'اضغط هنا'}</span>
            </button>
          </div>
        )}

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