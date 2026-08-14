import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayableMoods, trackEvent } from '@/lib/tamamApi';
import { moodIconFor } from '@/lib/moodIcons';
import { resolvePublicImage } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';

/**
 * HomeTamamGameEntry — compact, visible entry to the TAMAM mood-orbit game
 * (/tamam-game: "شو مودك هسا؟" → suggestion sets → order). Sits alongside the
 * Mood Game preview so both games are reachable from Home. Reuses real moods.
 */
export default function HomeTamamGameEntry() {
  const navigate = useNavigate();
  const [moods, setMoods] = useState([]);

  useEffect(() => {
    getPlayableMoods().then((m) => setMoods((m || []).slice(0, 3))).catch(() => {});
  }, []);

  const openGame = () => {
    track('home_tamam_game_opened', { source: 'home_entry' });
    navigate('/tamam-game');
  };
  const pickMood = (m) => {
    if (!m?.id) return;
    track('home_tamam_game_mood_picked', { mood_id: m.id });
    trackEvent({ action: 'mood_selected', mood_id: m.id });
    navigate(`/tamam-suggestions/${m.id}`);
  };

  return (
    <section className="px-4 pt-1 pb-1" dir="rtl">
      <div className="relative rounded-2xl overflow-hidden border border-tamam-outline/30 bg-gradient-to-br from-tamam-surface-low via-tamam-teal/40 to-tamam-surface-lowest p-4">
        <div className="flex items-center gap-3">
          {/* Mini orbit — signature of جيم تمام */}
          <div className="relative shrink-0" style={{ width: 84, height: 84 }} aria-hidden="true">
            <div className="absolute inset-0 rounded-full border border-tamam-green/25" />
            <div className="absolute rounded-full border border-tamam-green/10" style={{ inset: '22%' }} />
            <button
              onClick={openGame}
              className="absolute rounded-full bg-tamam-green text-tamam-ink flex items-center justify-center active:scale-95 transition-transform"
              style={{ left: 22, top: 22, width: 40, height: 40 }}
              aria-label="ابدأ جيم تمام"
            >
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </button>
            {moods.map((m, i) => {
              const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
              const r = 32; const cx = 42; const cy = 42;
              return (
                <button
                  key={m.id}
                  onClick={() => pickMood(m)}
                  className="absolute rounded-full overflow-hidden border border-tamam-outline/50 active:scale-90 transition-transform"
                  style={{ left: cx + Math.cos(angle) * r - 13, top: cy + Math.sin(angle) * r - 13, width: 26, height: 26 }}
                  aria-label={m.name_ar || 'مود'}
                >
                  {m.image_url ? (
                    <img src={resolvePublicImage(m.image_url)} alt={m.name_ar || ''} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="material-symbols-outlined text-[13px] text-tamam-green-bright w-full h-full flex items-center justify-center bg-tamam-surface-high">{moodIconFor(m)}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <span className="text-tamam-gold text-[10px] font-bold">جيم تمام</span>
            <h3 className="text-tamam-text font-bold text-[15px] leading-snug">شو مودك هسا؟</h3>
            <p className="text-tamam-text-muted text-[11px] leading-snug line-clamp-2">اختار مودك وإحنا بنجهّزلك اقتراحات جاهزة، أو خلّينا نفاجئك.</p>
          </div>
        </div>

        <button
          onClick={openGame}
          className="mt-3 w-full h-11 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          ابدأ جيم تمام
        </button>
      </div>
    </section>
  );
}