import { useNavigate } from 'react-router-dom';

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
  return (
    <div className="p-4 space-y-3">
      <h1 className="font-bold text-lg">المزيد</h1>
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