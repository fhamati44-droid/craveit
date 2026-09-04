import { useState, useEffect } from 'react';
import { getPublishedConfig } from '@/lib/homepageApi';
import { getTimeAwareHomepage, clearTimeAwareCache } from '@/lib/homepageTimeApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ErrorState } from '@/components/tamam/customer/States';
import { track } from '@/lib/analytics';
import HomePageContent from '@/components/homepage/HomePageContent';

/**
 * Home — public customer homepage.
 * Loads the PUBLISHED homepage configuration (active HomepageVersion) and
 * renders it through HomePageContent — the SAME component the admin preview
 * uses. Only the data source differs (published vs draft).
 */
export default function Home() {
  const { locale } = useLanguage();
  const [config, setConfig] = useState(null);
  const [timeData, setTimeData] = useState(null);
  const [dealView, setDealView] = useState(null);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const [cfg, deals, timeContent] = await Promise.all([
        getPublishedConfig().catch(() => null),
        listPublicDeals().catch(() => []),
        getTimeAwareHomepage().catch(() => null),
      ]);
      setConfig(cfg || { sections: [], items: [] });
      setTimeData(timeContent);
      if (timeContent?.current_period) {
        track('homepage_time_period_viewed', { period_id: timeContent.current_period.id, locale });
      }
      const active = (deals || []).find((v) => v.status === 'active');
      setDealView(active ? { deal: active.deal, thresholds: active.thresholds, participants: active.participants } : null);
    } catch (e) { console.error(e); setError(true); }
  };

  useEffect(() => { load(); }, [locale]);

  // Refresh time-aware content when browser returns to foreground
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeAwareCache();
        getTimeAwareHomepage().then((td) => {
          setTimeData(td);
          if (td?.current_period) track('homepage_time_period_changed', { period_id: td.current_period.id, locale });
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [locale]);

  if (error) return <ErrorState title="ما قدرنا نحمّل البيانات" onRetry={load} />;

  return <HomePageContent config={config} mode="published" timeData={timeData} dealView={dealView} />;
}