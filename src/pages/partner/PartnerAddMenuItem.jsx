import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import MenuItemForm from '@/components/partner/MenuItemForm';

export default function PartnerAddMenuItem() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className="px-4 py-12 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-tamam-green/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-tamam-green-bright text-[36px]">check_circle</span>
        </div>
        <h1 className="font-bold text-base text-tamam-text">تم حفظ الوجبة</h1>
        <p className="text-tamam-text-muted text-sm max-w-[280px]">تم حفظ الوجبة. TAMAM راح تراجع ربطها إذا كانت بحاجة لربط.</p>
        <button onClick={() => navigate('/partner/menu')} className="bg-tamam-green-bright text-tamam-ink px-6 py-2.5 rounded-xl font-bold text-sm active:scale-95">رجوع للمنيو</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-28 space-y-4">
      <button onClick={() => navigate('/partner/menu')} className="flex items-center gap-1 text-tamam-text-muted text-sm active:scale-95">
        <span className="material-symbols-outlined">chevron_right</span> المنيو
      </button>
      <div className="bg-tamam-surface-low rounded-2xl p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-tamam-green/15 flex items-center justify-center">
          <span className="material-symbols-outlined text-tamam-green-bright">restaurant</span>
        </div>
        <div>
          <h1 className="font-bold text-base text-tamam-text">إضافة وجبة جديدة</h1>
          <p className="text-tamam-text-muted text-xs">أدخل تفاصيل الوجبة لتظهر في قائمة مطعمك.</p>
        </div>
      </div>
      <MenuItemForm restaurantId={rid} item={null} guardrail={null} onSaved={() => setSaved(true)} onCancel={() => navigate('/partner/menu')} />
    </div>
  );
}