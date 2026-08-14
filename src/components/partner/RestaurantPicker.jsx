import { useNavigate } from 'react-router-dom';
import { Store, ChevronLeft } from 'lucide-react';

/**
 * Restaurant / branch selector. Used both as the initial full-screen picker
 * (no active selection) and as the /partner/select-restaurant switch page.
 */
export default function RestaurantPicker({ restaurants, onPick, title = 'اختار مطعم' }) {
  const navigate = useNavigate();
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-tamam-bg text-tamam-text font-tamam flex flex-col" style={{ maxWidth: '430px', margin: '0 auto' }}>
      <header className="sticky top-0 z-10 bg-tamam-surface-low/95 backdrop-blur border-b border-tamam-outline/30 pt-safe">
        <div className="px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/profile')} className="text-tamam-text-muted text-sm">إلغاء</button>
          <h1 className="font-bold text-sm">{title}</h1>
          <Store size={18} className="text-tamam-green-bright" />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(restaurants || []).map((r) => (
          <button
            key={r.id}
            onClick={() => onPick(r.id)}
            className="w-full text-right bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-tamam-surface-high flex items-center justify-center text-2xl flex-shrink-0">
              {r.logo_url ? <img src={r.logo_url} alt="" className="w-full h-full object-cover rounded-xl" /> : '🏪'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{r.name_ar || r.name}</p>
              <p className="text-[11px] text-tamam-text-muted truncate">{r.city || r.address || ''}</p>
            </div>
            <ChevronLeft size={18} className="text-tamam-text-muted flex-shrink-0" />
          </button>
        ))}
        {(!restaurants || restaurants.length === 0) && (
          <p className="text-center text-tamam-text-muted text-sm py-12">لا توجد مطاعم مرتبطة بحسابك.</p>
        )}
      </div>
    </div>
  );
}