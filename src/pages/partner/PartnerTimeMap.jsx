import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getPartnerTimeMap } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import { TRAFFIC_DOT, TRAFFIC_LABEL_AR, DAY_AR } from '@/lib/partnerDemoLabels';

export default function PartnerTimeMap() {
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const navigate = useNavigate();
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    getPartnerTimeMap(rid).then(setMap).catch(() => setError(true)).finally(() => setLoading(false));
  }, [rid]);

  if (loading) return <div className="p-4 space-y-3"><div className="h-32 skeleton-t rounded-2xl" /><div className="h-32 skeleton-t rounded-2xl" /></div>;
  if (error || !map) return <EmptyState icon="⚠️" title="ما قدرنا نحمّل الخريطة" />;

  const legend = [
    { light: 'GREEN', label: TRAFFIC_LABEL_AR.GREEN },
    { light: 'YELLOW', label: TRAFFIC_LABEL_AR.YELLOW },
    { light: 'RED', label: TRAFFIC_LABEL_AR.RED },
  ];

  return (
    <div className="px-4 py-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-tamam-surface flex items-center justify-center">
          <span className="material-symbols-outlined text-tamam-text text-[20px]">arrow_forward</span>
        </button>
        <h1 className="font-bold text-lg text-tamam-text">ساعات الشغل مع TAMAM</h1>
      </div>

      {/* Legend */}
      <div className="bg-tamam-surface rounded-2xl p-3 flex justify-around border border-tamam-outline/30">
        {legend.map((l) => (
          <div key={l.light} className="flex flex-col items-center gap-1">
            <span className="text-xl">{TRAFFIC_DOT[l.light]}</span>
            <span className="text-[10px] text-tamam-text-muted text-center max-w-[80px] leading-tight">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Weekly map */}
      <div className="space-y-3">
        {Object.values(map).map((day) => (
          <div key={day.day} className="bg-tamam-surface rounded-2xl p-3 border border-tamam-outline/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-tamam-text">{day.day_label}</h3>
              <span className="text-2xl">{TRAFFIC_DOT[day.traffic_light]}</span>
            </div>
            <div className="space-y-1.5">
              {day.blocks.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base">{TRAFFIC_DOT[b.light]}</span>
                  <span className="text-tamam-text text-xs font-bold w-14">{b.time}</span>
                  <span className="text-tamam-text-muted text-xs leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-tamam-surface rounded-2xl p-4 border border-tamam-outline/30 flex items-start gap-2">
        <span className="material-symbols-outlined text-tamam-green-bright text-[20px]">info</span>
        <p className="text-tamam-text-muted text-xs leading-snug">TAMAM بتفهم إمتى المطعم بيضغط وإمتى بيهدى، عشان تشتغل ذكي وما تجيب طلبات بوقت ضغط.</p>
      </div>
    </div>
  );
}