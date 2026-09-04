import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';
import { getPublicSuggestions } from '@/lib/homepageApi';
import HomeClassicMixPlus from '@/components/tamam/customer/HomeClassicMixPlus';

const PKG = {
  plus: { label: 'بلس', accent: 'text-tamam-gold', border: 'border-tamam-gold/50' },
  mix: { label: 'ميكس', accent: 'text-tamam-green-bright', border: 'border-tamam-green/40' },
  classic: { label: 'كلاسيك', accent: 'text-tamam-text', border: 'border-tamam-outline/30' },
};
const normalizePkg = (v) => {
  const n = String(v || '').trim().toLowerCase();
  if (n === 'classic' || n === 'كلاسيك') return 'classic';
  if (n === 'mix' || n === 'ميكس') return 'mix';
  if (['plus', 'بلس', 'max', 'premium'].includes(n)) return 'plus';
  return 'classic';
};

/**
 * CampaignOffersSlot — the CLASSIC / MIX / PLUS offer cards.
 * CMS-configured suggestion cards (section items) render as custom cards.
 * With no cards configured it keeps the current time-aware behavior
 * (HomeClassicMixPlus) — no fake data, no invented variants.
 */
export default function CampaignOffersSlot({ slot, timeData }) {
  const navigate = useNavigate();
  const suggItems = slot.items.filter((it) => it.item_type === 'suggestion' && it.suggestion_id);
  const idKey = suggItems.map((it) => it.suggestion_id).join(',');
  const [sets, setSets] = useState(null);

  useEffect(() => {
    if (!idKey) return;
    let alive = true;
    const ids = idKey.split(',');
    getPublicSuggestions()
      .then((r) => { if (alive) setSets((r?.sets || []).filter((s) => ids.includes(s.id))); })
      .catch(() => { if (alive) setSets([]); });
    return () => { alive = false; };
  }, [idKey]);

  // No CMS cards → keep the current time-aware Classic/Mix/Plus behavior
  if (!idKey) return <HomeClassicMixPlus timeData={timeData} />;
  if (sets === null) return null;
  if (!sets.length) return null;

  const max = slot.section?.max_items || 3;
  const cards = sets.slice(0, max);
  const go = (set) => {
    track('home_campaign_offer_opened', { suggestion_id: set.id });
    navigate(`/tamam-order/${set.id}`);
  };

  return (
    <section className="py-4">
      <div className="px-4 mb-3">
        <h2 className="text-headline-sm font-bold text-tamam-text mb-0.5">{slot.section?.title || 'كيف بدك الوجبة؟'}</h2>
        <p className="text-body-sm text-tamam-text-muted">{slot.section?.subtitle || 'اختار حجمها وإحنا منكملها'}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {cards.map((set) => {
          const item = suggItems.find((it) => it.suggestion_id === set.id);
          const pkgKey = normalizePkg(set.package_level);
          const pkg = PKG[pkgKey];
          const pkgImageSetting = slot.settings?.[`package_image_${pkgKey}`];
          const img = (pkgImageSetting && slot.mediaMap?.[pkgImageSetting]?.file_url) || pkgImageSetting || set.hero_image_url;
          return (
            <button
              key={set.id}
              type="button"
              onClick={() => go(set)}
              className={`flex-shrink-0 w-[210px] bg-tamam-surface-lowest border ${pkg.border} rounded-2xl overflow-hidden text-right active:scale-95 transition-transform`}
            >
              <div className="relative h-28 bg-tamam-surface-high">
                {img ? (
                  <PublicImage source={img} fallback={PLACEHOLDER_IMAGE} alt={set.title_ar || ''} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-tamam-surface">
                    <span className={`material-symbols-outlined text-[30px] ${pkg.accent}`}>restaurant</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-tamam-surface-lowest/90 via-transparent to-transparent" />
                <span className={`absolute bottom-1.5 right-2.5 text-[14px] font-bold ${pkg.accent}`}>{item?.title_override || pkg.label}</span>
              </div>
              <div className="p-2.5">
                <p className="text-[12px] font-bold text-tamam-text leading-tight truncate">{set.title_ar || pkg.label}</p>
                {(item?.subtitle_override || set.badge_text_ar) && <p className="text-[11px] text-tamam-text-muted leading-tight mt-0.5 line-clamp-2">{item?.subtitle_override || set.badge_text_ar}</p>}
                <div className="flex items-center justify-between mt-1.5">
                  {set.display_price != null && <span className="text-[13px] font-bold text-tamam-green-bright">₪{Math.round(set.display_price)}</span>}
                  <span className="text-[11px] font-bold text-tamam-text-muted flex items-center gap-0.5">
                    شوف العرض
                    <span className="material-symbols-outlined text-[14px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}