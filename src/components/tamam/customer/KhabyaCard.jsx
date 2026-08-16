import { motion } from 'framer-motion';
import { fmtUntil } from '@/lib/offerEngineApi';

/**
 * خبايا TAMAM teaser card — a "mystery reveal" presentation.
 * Locked: the hero image is blurred + veiled with a gold scan line and a
 * glowing lock, inviting the user to unlock with points. Unlocked: the image
 * clears and the card becomes an entry to the deal. Same data + flow as before.
 */
export default function KhabyaCard({ offer, onTap }) {
  const unlocked = offer.unlocked;
  const until = fmtUntil(offer.end_at);
  const prefersReduced =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <button
      type="button"
      onClick={() => onTap(offer)}
      aria-label={unlocked ? 'شوف العرض المفتوح' : 'افتح خبايا تمام'}
      className="relative w-64 flex-shrink-0 rounded-3xl overflow-hidden bg-tamam-surface-low border border-tamam-gold/25 active:scale-95 transition-transform text-right flex flex-col"
      style={{ boxShadow: '0 6px 26px rgba(0,0,0,0.4)' }}
    >
      {/* Mystery image */}
      <div className="relative h-36 overflow-hidden">
        {offer.hero_image ? (
          <>
            <img
              src={offer.hero_image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{
                filter: unlocked ? 'none' : 'blur(8px)',
                opacity: unlocked ? 1 : 0.6,
                transform: 'scale(1.15)',
                transition: 'filter 0.4s ease, opacity 0.4s ease',
              }}
            />
            {!unlocked && (
              <>
                {/* dark + gold veil */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,19,18,0.88) 0%, rgba(7,19,18,0.35) 45%, rgba(7,19,18,0.55) 100%)' }} />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 42%, rgba(234,196,92,0.14) 0%, transparent 55%)' }} />
                {/* scan line */}
                {!prefersReduced && (
                  <motion.div
                    className="absolute left-0 right-0 h-10 pointer-events-none"
                    style={{ background: 'linear-gradient(to bottom, transparent, rgba(234,196,92,0.22), transparent)' }}
                    initial={{ top: '-12%' }}
                    animate={{ top: ['-12%', '112%'] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-tamam-surface-low">
            <span className="material-symbols-outlined text-[44px] text-tamam-gold/50 mg-breathe">lock</span>
          </div>
        )}

        {/* badge */}
        <span
          className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${unlocked ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-ink/80 text-tamam-gold mg-breathe'}`}
          style={!unlocked ? { boxShadow: '0 0 14px rgba(234,196,92,0.35)' } : undefined}
        >
          <span className="material-symbols-outlined text-[13px]">{unlocked ? 'lock_open' : 'lock'}</span>
          {unlocked ? 'مفتوح' : 'خبايا'}
        </span>

        {until && !unlocked && (
          <span className="absolute bottom-2.5 left-2.5 bg-tamam-ink/75 text-tamam-text text-[10px] font-bold px-2 py-0.5 rounded-full">{until}</span>
        )}
      </div>

      {/* Frosted teaser panel */}
      <div className="p-3 flex flex-col gap-2 flex-1 bg-tamam-surface">
        <p className="text-[12px] text-tamam-text leading-snug line-clamp-2 min-h-[34px]">
          {unlocked ? '✅ فتحت العرض — شوف التفاصيل' : (offer.teaser_text || 'في عرض مخبّى على وجبة 👀')}
        </p>
        {!unlocked && (
          <div className="inline-flex items-center gap-1 bg-tamam-gold/12 text-tamam-gold text-[10px] font-bold px-2 py-0.5 rounded-full self-start">
            <span className="material-symbols-outlined text-[12px]">stars</span>
            افتحه بـ {offer.unlock_cost} نقطة
          </div>
        )}
        <div className="mt-auto">
          {unlocked ? (
            <span className="w-full h-10 rounded-xl bg-tamam-green text-tamam-ink font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[16px]">lock_open</span>شوف العرض
            </span>
          ) : (
            <span className="w-full h-10 rounded-xl bg-tamam-gold text-tamam-ink font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[16px]">key</span>افتح العرض
            </span>
          )}
        </div>
      </div>
    </button>
  );
}