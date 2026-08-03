import { useState, useEffect } from 'react';
import { getCompositionStats } from '@/lib/homepageTimeApi';
import CompositionBanner from '@/components/admin/homepage-time/CompositionBanner';
import TimePeriodsTab from '@/components/admin/homepage-time/TimePeriodsTab';
import SlotRulesTab from '@/components/admin/homepage-time/SlotRulesTab';
import TimePreviewTab from '@/components/admin/homepage-time/TimePreviewTab';
import TimeAuditTab from '@/components/admin/homepage-time/TimeAuditTab';

const TABS = [
  { key: 'periods', label: 'الفترات الزمنية' },
  { key: 'hero', label: 'البانر الرئيسي' },
  { key: 'suggestions', label: 'اقتراحات TAMAM' },
  { key: 'banners', label: 'البنرات' },
  { key: 'carousels', label: 'الكروسولات' },
  { key: 'preview', label: 'المعاينة' },
  { key: 'audit', label: 'سجل التغييرات' },
];

export default function HomepageTimeAdmin() {
  const [tab, setTab] = useState('periods');
  const [stats, setStats] = useState(null);

  const loadStats = () => getCompositionStats().then(setStats).catch(() => {});
  useEffect(() => { loadStats(); }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-1">إدارة محتوى الهوم حسب الوقت</h1>
        <p className="text-sm text-gray-500 mb-4">تحكّم بالمحتوى المتغيّر حسب الفترة الزمنية (≈25% من الصفحة). 75% من الصفحة يبقى ثابتًا.</p>

        <CompositionBanner stats={stats} />

        {/* Tab navigation */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4 pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {tab === 'periods' && <TimePeriodsTab onPeriodsChange={loadStats} />}
          {tab === 'hero' && <SlotRulesTab slotKeys={['homepage_hero']} />}
          {tab === 'suggestions' && <SlotRulesTab slotKeys={['homepage_top_suggestions']} />}
          {tab === 'banners' && <SlotRulesTab slotKeys={['homepage_time_banner_1', 'homepage_time_banner_2']} />}
          {tab === 'carousels' && <SlotRulesTab slotKeys={['homepage_time_carousel_1', 'homepage_time_carousel_2']} />}
          {tab === 'preview' && <TimePreviewTab />}
          {tab === 'audit' && <TimeAuditTab />}
        </div>
      </div>
    </div>
  );
}