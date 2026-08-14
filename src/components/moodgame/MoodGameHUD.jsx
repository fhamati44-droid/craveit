import { Pause, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateMood, getStageNumber, calculateProgress } from '@/lib/moodGameEngine';

export default function MoodGameHUD({ placedMeals, score, combo, onPause }) {
  const mood = calculateMood(placedMeals);
  const stage = getStageNumber(placedMeals);
  const progress = calculateProgress(placedMeals);

  return (
    <div className="sticky top-0 z-20 bg-gradient-to-b from-tamam-bg via-tamam-bg/95 to-tamam-bg/60 backdrop-blur-md pt-safe" dir="rtl">
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={onPause} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-tamam-surface/60 active:bg-tamam-surface-high border border-tamam-outline/25 focus-visible:ring-2 focus-visible:ring-tamam-green/40" aria-label="إيقاف مؤقت">
          <Pause size={18} className="text-tamam-text" fill="currentColor" />
        </button>
        <div className="text-tamam-green-bright font-extrabold text-base tracking-[0.25em]" style={{ textShadow: '0 0 12px rgba(137,219,120,0.4)' }}>TAMAM</div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-tamam-surface-high/70 rounded-full px-2.5 py-1 border border-tamam-gold/25">
            <span className="text-tamam-gold text-sm">🪙</span>
            <span className="text-tamam-text font-bold text-sm tabular-nums">{(score || 0).toLocaleString()}</span>
          </div>
          <button className="w-7 h-7 rounded-full bg-tamam-gold text-tamam-ink flex items-center justify-center active:scale-90 transition-transform focus-visible:ring-2 focus-visible:ring-tamam-gold/40" aria-label="مكافأة">
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pb-2.5 gap-3">
        <div className="flex flex-col items-center w-12">
          <MoodMeter mood={mood} progress={progress} />
          <span className="text-[8px] text-tamam-text-muted mt-0.5 font-semibold">{mood.label}</span>
        </div>

        <div className="flex-1 text-center min-w-0">
          <p className="text-tamam-text font-bold text-[11px] mb-1">المرحلة {stage}</p>
          <div className="h-2 bg-tamam-surface-high rounded-full overflow-hidden border border-tamam-outline/20">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: progress >= 80 ? 'linear-gradient(90deg,#EAC45C,#FFD97A)' : 'linear-gradient(90deg,#89DB78,#A2F790)',
                boxShadow: progress >= 80 ? '0 0 10px rgba(234,196,92,0.5)' : '0 0 10px rgba(137,219,120,0.5)',
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-[9px] mt-1 font-semibold" style={{ color: progress >= 80 ? '#EAC45C' : '#C0CAB8' }}>
            {progress >= 80 ? 'لمسة أخيرة! ✨' : 'ركّب المود وكمل الترتيب ✨'}
          </p>
        </div>

        <div className="flex flex-col items-center w-12">
          <div className="flex items-center gap-0.5 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < combo ? 'bg-tamam-green-bright' : 'bg-tamam-surface-high'}`} style={i < combo ? { boxShadow: '0 0 6px rgba(137,219,120,0.6)' } : undefined} />
            ))}
          </div>
          <span className="text-tamam-text font-bold text-[9px]">سلسلة ×{combo}</span>
        </div>
      </div>
    </div>
  );
}

function MoodMeter({ mood, progress }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <div className="relative w-10 h-10">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#262B29" strokeWidth="2.5" />
        <motion.circle
          cx="18" cy="18" r={r} fill="none"
          stroke={mood.color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.4 }}
          style={{ filter: `drop-shadow(0 0 3px ${mood.color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm">{mood.emoji}</div>
    </div>
  );
}