import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, User, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import MoodWheel from '@/components/tamam/MoodWheel';
import { getActiveMoods, trackEvent } from '@/lib/tamamApi';

export default function TamamGame() {
  const navigate = useNavigate();
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getActiveMoods()
      .then(list => {
        setMoods(list);
        if (list.length) setSelected(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStart = () => {
    if (!selected) return;
    trackEvent({ action: 'mood_selected', mood_id: selected.id });
    navigate(`/tamam-suggestions/${selected.id}`);
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden"
      style={{ background: 'radial-gradient(circle at 50% 40%, #0f2e2b 0%, #051614 60%, #020a0a 100%)' }}>
      {/* particles */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-[#3DEB8B]"
            style={{
              width: 2, height: 2,
              left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`,
              opacity: 0.4 + (i % 3) * 0.2,
            }} />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 relative z-10">
        <button><Menu size={22} /></button>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold tracking-wider">TAMAM</span>
          <span className="text-[#3DEB8B]">▲</span>
        </div>
        <Link to="/profile"><User size={20} /></Link>
      </div>

      {/* Score bar */}
      <div className="flex items-center justify-between px-5 pb-2 relative z-10 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded-md bg-[#3DEB8B]/10 border border-[#3DEB8B]/40 font-bold">12</span>
          <span className="text-white/50">2,450 / 5,000</span>
        </div>
        <div className="flex items-center gap-1 text-[#FFD166]">
          <span>🪙</span> <span className="font-bold">8,350</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mt-6 mb-4 relative z-10 px-6">
        <h1 className="text-2xl font-extrabold">جاهز تنطلق؟</h1>
        <p className="text-white/60 text-sm mt-1">اختار مودك ونعطيك 3 اقتراحات جاهزة</p>
      </div>

      {/* Wheel */}
      <div className="relative z-10 mt-2 pb-32">
        {loading ? (
          <div className="w-[300px] h-[300px] mx-auto skeleton rounded-full" />
        ) : moods.length === 0 ? (
          <div className="text-center text-white/60 py-20">
            <p className="text-3xl mb-2">🚧</p>
            <p>لا توجد مودات حاليًا</p>
            <Link to="/" className="text-[#3DEB8B] underline text-sm mt-2 inline-block">العودة للرئيسية</Link>
          </div>
        ) : (
          <MoodWheel
            moods={moods}
            selectedId={selected?.id}
            onSelect={m => setSelected(m)}
            onStart={handleStart}
          />
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-4"
        style={{ background: 'linear-gradient(to top, #020a0a, transparent)' }}>
        <Link to="/" className="block text-center text-white/40 text-xs mb-2">تصفّح المطاعم عادي →</Link>
        <button
          onClick={handleStart}
          disabled={!selected}
          className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-4 rounded-full font-extrabold text-black disabled:opacity-40"
          style={{
            background: 'linear-gradient(90deg, #3DEB8B, #16a34a)',
            boxShadow: '0 0 30px rgba(61,235,139,0.6)',
          }}
        >
          <Zap size={18} /> اعطيني اقتراح TAMAM
        </button>
      </div>
    </div>
  );
}