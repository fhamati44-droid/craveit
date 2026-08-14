import { fmtUntil } from '@/lib/offerEngineApi';

/**
 * Teaser card for a point-locked خبايا TAMAM offer.
 * Before unlock: shows only teaser text + unlock cost + expiration context
 * (never the full commercial value). After unlock: shows "open" CTA into the
 * existing deal flow.
 */
export default function KhabyaCard({ offer, onTap }) {
  const unlocked = offer.unlocked;
  const until = fmtUntil(offer.end_at);

  return (
    <button
      type="button"
      onClick={() => onTap(offer)}
      className="relative w-60 flex-shrink-0 rounded-2xl overflow-hidden bg-surface-container border border-outline-variant/30 active:scale-95 transition-transform text-right flex flex-col"
    >
      <div className="h-24 bg-tamam-surface-low relative overflow-hidden">
        {offer.hero_image ? (
          <img src={offer.hero_image} alt="" className="w-full h-full object-cover blur-[2px] opacity-70" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px] text-tamam-text-muted opacity-50">lock</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-tamam-ink/70 to-transparent" />
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-tamam-ink/80 text-tamam-gold text-[11px] font-bold px-2 py-1 rounded-full">
          <span className="material-symbols-outlined text-[13px]">lock</span>خبايا
        </span>
        {until && !unlocked && (
          <span className="absolute bottom-2 right-2 bg-tamam-ink/75 text-tamam-text text-[10px] font-bold px-2 py-0.5 rounded-full">{until}</span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-[12px] text-tamam-text leading-snug line-clamp-2">
          {unlocked ? '✅ فتحت العرض — شوف التفاصيل' : (offer.teaser_text || 'في عرض مخبّى على وجبة 👀')}
        </p>
        <div className="flex items-center justify-between mt-auto">
          {unlocked ? (
            <span className="text-[11px] font-bold text-tamam-green-bright">شوف العرض</span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-tamam-gold/15 text-tamam-gold text-[11px] font-bold px-2 py-1 rounded-full">
              <span className="material-symbols-outlined text-[13px]">stars</span>{offer.unlock_cost} نقطة
            </span>
          )}
          <span className="material-symbols-outlined text-[18px] text-tamam-text-muted" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>
        </div>
      </div>
    </button>
  );
}