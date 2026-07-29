import { motion } from 'framer-motion';
import { RefreshCw, Check } from 'lucide-react';

const PACKAGE_META = {
  classic: { label: 'كلاسيك', copy: 'اختيار بسيط وسريع', accent: '#3DEB8B' },
  mix: { label: 'ميكس', copy: 'الأكثر توازنًا', accent: '#FFD166' },
  plus: { label: 'بلس', copy: 'اختيار كامل ومميز', accent: '#FF6B6B' },
};

export default function SuggestionCard({ level, suggestion, meals, onChoose, onRefresh, loading }) {
  const meta = PACKAGE_META[level] || PACKAGE_META.classic;
  const heroImg = suggestion?.hero_image_url || meals?.[0]?.image_url;
  const title = suggestion?.title_ar || meta.label;
  const desc = suggestion?.description_ar || meta.copy;
  const price = suggestion?.display_price ?? meals?.reduce((s, m) => s + (m.price || 0), 0);
  const mealNames = meals?.map(m => m.name).filter(Boolean).join('، ') || '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden bg-[#0B1A14]/80 backdrop-blur-md border"
      style={{ borderColor: meta.accent + '55', boxShadow: `0 0 24px ${meta.accent}33` }}
    >
      <div className="px-3 pt-3 flex items-center justify-between">
        <span className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: meta.accent + '22', color: meta.accent, border: `1px solid ${meta.accent}55` }}>
          {meta.label}
        </span>
        {suggestion?.badge_text_ar && (
          <span className="text-[10px] text-white/60">{suggestion.badge_text_ar}</span>
        )}
      </div>

      <div className="relative h-40 m-3 rounded-xl overflow-hidden bg-black/40">
        {heroImg ? (
          <img src={heroImg} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-2 right-3 left-3">
          <h3 className="text-white font-extrabold text-lg leading-tight">{title}</h3>
          <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{desc}</p>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2">
        <div className="text-[11px] text-white/50">المشمولين:</div>
        <div className="text-xs text-white/85 leading-relaxed line-clamp-3 min-h-[36px]">{mealNames}</div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-white/60 text-xs">السعر التقريبي</span>
          <span className="font-extrabold text-lg" style={{ color: meta.accent }}>
            {price ? `₪${Math.round(price)}` : '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 pt-0">
        <button
          onClick={onChoose}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm text-black disabled:opacity-50"
          style={{ background: meta.accent }}
        >
          <Check size={16} /> اختار هذا
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm text-white border border-white/20 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> اقتراح آخر
        </button>
      </div>
    </motion.div>
  );
}