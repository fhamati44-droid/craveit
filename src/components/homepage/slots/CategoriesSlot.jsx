import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';

/**
 * CategoriesSlot — food category chips/cards (بيتزا، برجر، أكل بيتي...).
 * Each links into the existing restaurants browse flow filtered by category.
 * Renders only when the CMS section has category items.
 */
export default function CategoriesSlot({ slot }) {
  const navigate = useNavigate();
  const cats = slot.items.filter((it) => it.item_type === 'category' && it.category_id);
  if (!cats.length) return null;

  const go = (name) => {
    track('home_category_opened', { category: name });
    navigate(`/restaurants?category=${encodeURIComponent(name)}`);
  };

  return (
    <section className="py-3">
      <div className="px-4 mb-3">
        <h2 className="text-headline-sm font-bold text-tamam-text mb-0.5">{slot.section?.title || 'تصفح حسب النوع'}</h2>
        {slot.section?.subtitle && <p className="text-body-sm text-tamam-text-muted">{slot.section.subtitle}</p>}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
        {cats.map((it) => (
          <button
            key={it.id || it.category_id}
            type="button"
            onClick={() => go(it.category_id)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-tamam-surface border border-tamam-outline/25 text-tamam-text text-[13px] font-bold whitespace-nowrap active:scale-95 active:border-tamam-green-bright transition"
          >
            <span className="material-symbols-outlined text-[16px] text-tamam-green-bright">restaurant_menu</span>
            {it.category_id}
          </button>
        ))}
      </div>
    </section>
  );
}