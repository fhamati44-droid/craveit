import { useState, useEffect } from 'react';
import { getDraftConfig } from '@/lib/homepageApi';
import { getTimeAwareHomepage } from '@/lib/homepageTimeApi';
import { listPublicDeals } from '@/lib/groupDealApi';
import HomePageContent from '@/components/homepage/HomePageContent';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const DEVICES = [{ w: 360, l: '360' }, { w: 375, l: '375' }, { w: 390, l: '390' }, { w: 430, l: '430' }];

/**
 * HomepagePreview — admin draft preview.
 * Renders the DRAFT configuration through the SAME HomePageContent component
 * the public Home uses, with identical runtime data (time-aware content,
 * active deals) so preview and live match 1:1 for the same configuration.
 */
export default function HomepagePreview() {
  const [config, setConfig] = useState(null);
  const [timeData, setTimeData] = useState(null);
  const [dealView, setDealView] = useState(null);
  const [device, setDevice] = useState(390);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getDraftConfig().catch(() => null),
      getTimeAwareHomepage().catch(() => null),
      listPublicDeals().catch(() => []),
    ]).then(([draft, timeContent, deals]) => {
      if (!alive) return;
      setConfig(draft || { sections: [], items: [] });
      setTimeData(timeContent);
      const active = (deals || []).find((v) => v.status === 'active');
      setDealView(active ? { deal: active.deal, thresholds: active.thresholds, participants: active.participants } : null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return (
    <div dir="rtl" className="font-tamam min-h-[100dvh] bg-background text-on-surface">
      {/* Toolbar */}
      <div className="sticky top-0 bg-background/90 backdrop-blur z-20 border-b border-outline-variant/20 px-4 py-3 flex items-center gap-2 max-w-2xl mx-auto">
        <a href="/admin/homepage" className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center"><Icon name="arrow_back" /></a>
        <h1 className="font-bold text-base flex-1">معاينة المسودة</h1>
        <span className="bg-tertiary/20 text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded-full">مسودة</span>
        <div className="flex gap-1">
          {DEVICES.map((d) => (
            <button key={d.w} onClick={() => setDevice(d.w)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${device === d.w ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{d.l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center py-16 text-on-surface-variant">عم نحمّل...</p>
      ) : (
        <div className="mx-auto transition-all duration-300" style={{ maxWidth: device }}>
          <HomePageContent config={config} mode="draft" timeData={timeData} dealView={dealView} />
        </div>
      )}
    </div>
  );
}