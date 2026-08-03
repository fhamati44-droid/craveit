import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveMoods } from '@/lib/tamamApi';
import { getMoodRoute } from '@/lib/moodRoutes';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';

/**
 * Clickable mood banner cards — loads active TAMAM moods and renders
 * them as a horizontal scrollable list. Each card navigates to the
 * mood-specific suggestions page via getMoodRoute().
 */
export default function HomeMoodBanners() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getActiveMoods()
      .then((list) => { if (!cancelled) setMoods(list || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (!loading && moods.length === 0) return null;

  const openMood = (mood) => {
    track('mood_banner_clicked', { mood_id: mood.id, mood_slug: mood.slug, locale });
    navigate(getMoodRoute(mood));
  };

  return (
    <section className="px-4 py-4">
      <h2 className="text-headline-sm font-bold mb-1">{t('home.moods.title')}</h2>
      <p className="text-body-sm text-on-surface-variant mb-3">{t('home.moods.subtitle')}</p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {loading
          ? [1, 2, 3, 4].map((i) => <div key={i} className="h-20 w-32 skeleton-t rounded-2xl flex-shrink-0" />)
          : moods.map((mood) => (
              <button
                key={mood.id}
                type="button"
                onClick={() => openMood(mood)}
                aria-label={`${t('home.moods.title')} — ${mood.name_ar}`}
                className="relative h-20 w-32 rounded-2xl overflow-hidden flex-shrink-0 bg-surface-container border border-outline-variant/30 active:scale-95 transition-transform text-right"
              >
                <div className="absolute inset-0 flex flex-col justify-between p-2.5">
                  <span className="text-2xl">{mood.icon || '🍽️'}</span>
                  <span className="text-[11px] font-bold leading-tight line-clamp-2">{mood.name_ar}</span>
                </div>
                <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[12px]">arrow_back</span>
                </div>
              </button>
            ))
        }
      </div>
    </section>
  );
}