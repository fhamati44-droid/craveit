import { useRef, useEffect } from 'react';

export default function CategoryTabs({ categories, activeCategory, onSelect }) {
  const tabsRef = useRef(null);

  useEffect(() => {
    if (!tabsRef.current) return;
    const active = tabsRef.current.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCategory]);

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
      <div
        ref={tabsRef}
        className="flex overflow-x-auto scrollbar-hide px-4 gap-1 rtl-text"
        dir="rtl"
      >
        {categories.map(cat => (
          <button
            key={cat.id}
            data-active={activeCategory === cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex-shrink-0 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeCategory === cat.id
                ? 'border-blue text-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}