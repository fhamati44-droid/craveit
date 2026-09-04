import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';
import PublicImage from '@/components/shared/PublicImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';
import { getPublicSuggestions } from '@/lib/homepageApi';

/**
 * FeaturedMenusSlot — MENU / CATEGORY cards (not restaurant cards, no
 * restaurant profile navigation). Suggestion items render as TAMAM menu
 * cards (image, title, price → /tamam-order/:id); category items render as
 * category cards → /restaurants?category=X.
 */
export default function FeaturedMenusSlot({ slot }) {
  const navigate = useNavigate();
  const suggItems = slot.items.filter((it) => it.item_type === 'suggestion' && it.suggestion_id);
  const catItems = slot.items.filter((it) => it.item_type === 'category' && it.category_id);
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

  if (!suggItems.length && !catItems.length) return null;
  if (suggItems.length && sets === null) return null;

  const max = slot.section?.max_items || 8;
  const menuCards = (sets || []).map((set) => ({
    kind: 'menu',
    id: set.id,
    title: set.title_ar || 'منيو TAMAM',
    image: set.hero_image_url,
    price: set.display_price,
    onOpen: () => { track('home_featured_menu_opened', { suggestion_id: set.id }); navigate(`/tamam-order/${set.id}`); },
  }));
  const categoryCards = catItems.map((it) => ({
    kind: 'category',
    id: it.id || it.category_id,
    title: it.category_id,
    image: null,
    price: null,
    onOpen: () => { track('home_featured_category_opened', { category: it.category_id }); navigate(`/restaurants?category=${encodeURIComponent(it.category_id)}`); },
  }));
  const cards = [...menuCards, ...categoryCards].slice(0, max);
  if (!cards.length) return null;

  return (
    <section className="py-4">
      <div className="px-4 mb-3">
        <h2 className="text-headline-sm font-bold text-tamam-text mb-0.5">{slot.section?.title || 'منيوهات جاهزة'}</h2>
        <p className="text-body-sm text-tamam-text-muted">{slot.section?.subtitle || 'تجميعات اختارها TAMAM إلك'}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={card.onOpen}
            className="flex-shrink-0 w-[180px] bg-tamam-surface-lowest border border-tamam-outline/25 rounded-2xl overflow-hidden text-right active:scale-95 transition-transform"
          >
            <div className="relative h-24 bg-tamam-surface-high">
              {card.image ? (
                <PublicImage source={card.image} fallback={PLACEHOLDER_IMAGE} alt={card.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-tamam-surface">
                  <span className="material-symbols-outlined text-[28px] text-tamam-green-bright">menu_book</span>
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-[12px] font-bold text-tamam-text leading-tight truncate">{card.title}</p>
              <div className="flex items-center justify-between mt-1">
                {card.price != null && <span className="text-[12px] font-bold text-tamam-green-bright">₪{Math.round(card.price)}</span>}
                <span className="text-[11px] font-bold text-tamam-text-muted">{card.kind === 'menu' ? 'شوف المنيو' : 'شوف الأكلات'}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}