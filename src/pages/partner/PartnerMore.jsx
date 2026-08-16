import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getPartnerDataStatus } from '@/lib/partnerApi';

const LINKS = [
  { icon: 'swap_horiz', label: 'تبديل المطعم', to: '/partner/select-restaurant' },
  { icon: 'storefront', label: 'معلومات المطعم', to: '/partner/more/restaurant-profile' },
  { icon: 'account_tree', label: 'الفروع', to: null },
  { icon: 'schedule', label: 'ساعات العمل', to: '/partner/settings' },
  { icon: 'insights', label: 'حركة المطعم بالأسبوع', to: '/partner/demand-schedule' },
  { icon: 'bolt', label: 'عندي فرصة اليوم', to: '/partner/opportunity-signal' },
  { icon: 'campaign', label: 'TAMAM شغالة إسا', to: '/partner/campaigns' },
  { icon: 'shield', label: 'حدود الشغل', to: '/partner/guardrails' },
  { icon: 'upload', label: 'استيراد المنيو', to: '/partner/menu/import' },
  { icon: 'bar_chart', label: 'الأداء', to: '/partner/performance' },
  { icon: 'group', label: 'فريق المطعم والصلاحيات', to: null },
  { icon: 'notifications', label: 'الإشعارات', to: null },
  { icon: 'support_agent', label: 'الدعم', to: '/how-tamam-works/support' },
  { icon: 'settings', label: 'الإعدادات', to: '/partner/settings' },
];

export default function PartnerMore() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const isDemo = !!activeRestaurant?.is_demo;
  const [dataStatus, setDataStatus] = useState(null);

  useEffect(() => {
    if (!rid || !isDemo) return;
    getPartnerDataStatus(rid).then(setDataStatus).catch(() => {});
  }, [rid, isDemo]);

  return (
    <div className="p-4 space-y-3" dir="rtl">
      <h1 className="font-bold text-lg">المزيد</h1>

      {/* Demo story link */}
      {isDemo && (
        <button onClick={() => navigate('/partner/story')} className="w-full bg-gradient-to-l from-tamam-green/15 to-tamam-surface border border-tamam-green/30 rounded-2xl p-4 flex items-center gap-3 text-right active:scale-[0.99]">
          <span className="material-symbols-outlined text-tamam-green-bright text-[28px]">auto_awesome</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-tamam-text">شوف كيف TAMAM بتشتغل مع مطعمك</h4>
            <p className="text-xs text-tamam-text-muted">شرح بسيط لطريقة شغل TAMAM</p>
          </div>
          <span className="bg-tamam-ink/15 w-9 h-9 rounded-full flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[20px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span></span>
        </button>
      )}

      {/* Data status for demo restaurants */}
      {isDemo && dataStatus && (
        <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-tamam-text">معلومات مطعمك</h3>
          <div className="space-y-2">
            {dataStatus.map((s) => (
              <div key={s.key} className="flex items-center justify-between">
                <span className="text-tamam-text-muted text-sm">{s.label}</span>
                <span className={`text-xs font-bold flex items-center gap-1 ${s.status === 'مكتمل' ? 'text-tamam-green-bright' : 'text-tamam-gold'}`}>
                  <span className="material-symbols-outlined text-[14px]">{s.status === 'مكتمل' ? 'check_circle' : 'pending'}</span>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl overflow-hidden divide-y divide-tamam-outline/20">
        {LINKS.map((l) => (
          <button key={l.label} onClick={() => (l.to ? navigate(l.to) : alert('هذا القسم قيد التطوير'))} className="w-full flex items-center gap-3 p-3.5 text-right active:scale-[0.99]">
            <span className="material-symbols-outlined text-tamam-green-bright text-[22px]">{l.icon}</span>
            <span className="flex-1 text-sm font-medium">{l.label}</span>
            {!l.to && <span className="text-[10px] text-tamam-gold">قريبًا</span>}
          </button>
        ))}
      </div>
      <button onClick={() => navigate('/profile')} className="w-full bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3.5 flex items-center gap-3 text-right active:scale-[0.99]">
        <span className="material-symbols-outlined text-tamam-text-muted text-[22px]">arrow_back</span>
        <span className="flex-1 text-sm font-medium">العودة لحساب العميل</span>
      </button>
      <p className="text-center text-[10px] text-tamam-text-muted px-6">العودة لحساب العميل ما بتفسخ دخولك — تقدر ترجع للوحة المطعم وقت ما بدك.</p>
    </div>
  );
}