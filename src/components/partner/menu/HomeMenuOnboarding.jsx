import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listMenuItems, listMenuCandidates } from '@/lib/partnerApi';

/** Contextual menu-onboarding card on the partner Home. Compact summary when complete. */
export default function HomeMenuOnboarding() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!rid) return;
    Promise.all([
      listMenuItems(rid, 'all').catch(() => []),
      listMenuCandidates(rid, null, 'needs_review').catch(() => []),
    ]).then(([items, drafts]) => {
      const published = (items || []).filter((i) => i.active && i.price != null && Number(i.price) > 0);
      const incomplete = (items || []).filter((i) => !i.primary_image || i.price == null || Number(i.price) <= 0);
      setCounts({ published: published.length, drafts: (drafts || []).length, incomplete: incomplete.length, total: (items || []).length });
    }).catch(() => setCounts({ published: 0, drafts: 0, incomplete: 0, total: 0 }));
  }, [rid]);

  if (!counts) return <div className="mx-4 h-24 skeleton-t rounded-2xl" />;

  const empty = counts.total === 0 && counts.drafts === 0;
  const needsAttention = empty || counts.incomplete > 0 || counts.drafts > 0;

  if (!needsAttention && counts.total > 0) {
    // Compact status when menu is complete
    return (
      <section className="px-4" dir="rtl">
        <div className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-tamam-green-bright text-[24px]">restaurant_menu</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-tamam-text">المنيو جاهز</p>
            <p className="text-[11px] text-tamam-text-muted">{counts.published} صنف منشور</p>
          </div>
          <button onClick={() => navigate('/partner/menu')} className="h-10 px-3 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-xs">المنيو</button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4" dir="rtl">
      <div className="bg-tamam-surface border border-tamam-green/30 rounded-2xl p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="material-symbols-outlined text-tamam-green-bright text-[22px]">restaurant_menu</span>
          <h2 className="font-bold text-base text-tamam-text">جهّز منيو مطعمك</h2>
        </div>
        <p className="text-[12px] text-tamam-text-muted leading-snug mb-3">اختار أصناف جاهزة من كتالوج تمام، انسخ منيو فرع تابع إلك، أو ارفع منيوك.</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Stat label="منشور" value={counts.published} tone="green" />
          <Stat label="مسودات" value={counts.drafts} tone="gold" />
          <Stat label="محتاج مراجعة" value={counts.drafts} tone="gold" />
          <Stat label="ناقص سعر/صورة" value={counts.incomplete} tone="red" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/partner/menu/add/catalog')} className="flex-1 h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform">جهّز المنيو</button>
          <button onClick={() => navigate('/partner/menu/drafts')} className="h-12 px-4 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm">كمّل المراجعة</button>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }) {
  const toneCls = { green: 'text-tamam-green-bright', gold: 'text-tamam-gold', red: 'text-tamam-error' }[tone] || 'text-tamam-text';
  return (
    <div className="bg-tamam-surface-low rounded-xl p-2.5 text-center">
      <p className={`text-lg font-bold ${toneCls}`}>{value}</p>
      <p className="text-[10px] text-tamam-text-muted">{label}</p>
    </div>
  );
}