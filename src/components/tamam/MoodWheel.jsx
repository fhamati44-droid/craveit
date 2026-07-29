import { motion } from 'framer-motion';

const SIZE = 300; // circle diameter
const RADIUS = SIZE / 2;
const ORBIT = 118; // distance from center for mood bubbles

export default function MoodWheel({ moods, selectedId, onSelect, onStart }) {
  const n = moods.length || 1;

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      {/* Glow rings */}
      <div className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(61,235,139,0.18) 0%, transparent 70%)' }} />
      <div className="absolute inset-4 rounded-full border border-[#3DEB8B]/20" />
      <div className="absolute inset-10 rounded-full border border-[#3DEB8B]/10" />

      {/* Orbital moods */}
      {moods.map((m, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = RADIUS + ORBIT * Math.cos(angle) - 36;
        const y = RADIUS + ORBIT * Math.sin(angle) - 36;
        const active = selectedId === m.id;
        return (
          <motion.button
            key={m.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i, type: 'spring', stiffness: 200 }}
            onClick={() => onSelect(m)}
            style={{ left: x, top: y, width: 72, height: 72 }}
            className={`absolute rounded-full flex flex-col items-center justify-center text-center px-1 backdrop-blur-md transition-all
              ${active
                ? 'bg-[#3DEB8B] text-black border-2 border-white shadow-[0_0_24px_rgba(61,235,139,0.9)] scale-110'
                : 'bg-white/5 text-white border border-[#3DEB8B]/40 shadow-[0_0_12px_rgba(61,235,139,0.25)]'}`}
          >
            <span className="text-lg leading-none">{m.icon || '✨'}</span>
            <span className="text-[9px] font-semibold leading-tight mt-0.5 line-clamp-2">{m.name_ar}</span>
          </motion.button>
        );
      })}

      {/* Center launch button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onStart}
        disabled={!selectedId}
        className="absolute rounded-full flex flex-col items-center justify-center text-center backdrop-blur-md
          border-2 border-[#3DEB8B] text-white shadow-[0_0_40px_rgba(61,235,139,0.7)]"
        style={{
          left: RADIUS - 52, top: RADIUS - 52, width: 104, height: 104,
          background: selectedId
            ? 'radial-gradient(circle, #3DEB8B 0%, #16a34a 100%)'
            : 'radial-gradient(circle, rgba(11,26,20,0.9) 0%, rgba(5,22,20,0.95) 100%)',
        }}
      >
        <span className="text-2xl">👆</span>
        <span className="text-sm font-extrabold mt-0.5">انطلق</span>
        <span className="text-[9px] opacity-80">اضغط</span>
      </motion.button>
    </div>
  );
}