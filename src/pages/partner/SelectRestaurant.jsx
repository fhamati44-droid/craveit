import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { Store, ChevronLeft } from 'lucide-react';

export default function SelectRestaurant() {
  const navigate = useNavigate();
  const { restaurants, setActiveRid } = usePartner();
  const pick = (rid) => { setActiveRid(rid); navigate('/partner/home'); };
  return (
    <div className="p-4 space-y-3">
      <h1 className="font-bold text-lg mb-1">تبديل المطعم</h1>
      <p className="text-[11px] text-tamam-text-muted">اختار المطعم اللي بدك تديره.</p>
      {(restaurants || []).map((r) => (
        <button key={r.id} onClick={() => pick(r.id)} className="w-full text-right bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99]">
          <div className="w-12 h-12 rounded-xl bg-tamam-surface-high flex items-center justify-center overflow-hidden flex-shrink-0">
            {r.logo_url ? <img src={r.logo_url} alt="" className="w-full h-full object-cover" /> : <Store size={20} className="text-tamam-green-bright" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{r.name_ar || r.name}</p>
            <p className="text-[11px] text-tamam-text-muted truncate">{r.city || ''}</p>
          </div>
          <ChevronLeft size={18} className="text-tamam-text-muted" />
        </button>
      ))}
    </div>
  );
}