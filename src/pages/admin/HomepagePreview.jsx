import { useState, useEffect } from 'react';
import { getDraftConfig } from '@/lib/homepageApi';
import HomepageSectionRenderer from '@/components/homepage/HomepageSectionRenderer';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const DEVICES = [{ w: 360, l: '360' }, { w: 375, l: '375' }, { w: 390, l: '390' }, { w: 430, l: '430' }];

export default function HomepagePreview() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState(390);

  useEffect(() => { getDraftConfig().then((d) => setConfig(d)).finally(() => setLoading(false)); }, []);

  const sections = (config?.sections || []).filter((s) => s.enabled).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const items = config?.items || [];

  return (
    <div dir="rtl" className="font-tamam min-h-[100dvh] bg-background text-on-surface">
      {/* Toolbar */}
      <div className="sticky top-0 bg-background/90 backdrop-blur z-20 border-b border-outline-variant/20 px-4 py-3 flex items-center gap-2 max-w-2xl mx-auto">
        <a href="/admin/homepage" className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center"><Icon name="arrow_back" /></a>
        <h1 className="font-bold text-base flex-1">معاينة الصفحة (مسودة)</h1>
        <div className="flex gap-1">
          {DEVICES.map((d) => (
            <button key={d.w} onClick={() => setDevice(d.w)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${device === d.w ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{d.l}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-center py-16 text-on-surface-variant">عم نحمّل...</p> : (
        <div className="mx-auto transition-all duration-300" style={{ maxWidth: device }}>
          {!sections.length ? (
            <div className="text-center py-16 px-4"><p className="text-on-surface-variant">لا توجد أقسام مفعّلة في المسودة</p></div>
          ) : (
            sections.map((s) => <HomepageSectionRenderer key={s.id} section={s} items={items} draft={true} />)
          )}
        </div>
      )}
    </div>
  );
}