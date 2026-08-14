import { useNavigate } from 'react-router-dom';

// "محتاج انتباهك" — up to 3 real, prioritized urgent items.
// Renders nothing when there's nothing urgent (no fake urgency).

const GOAL_LABEL = {
  strengthen_item: 'تقوية وجبة',
  quiet_hour: 'ساعة هادئة',
  surplus: 'كمية متوفرة',
  attract_new: 'جذب زبائن',
  reactivate: 'استرجاع زبائن',
};

function ageMin(iso) {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function UrgentActions({ home, offerRequests, prepTime, onNavigate }) {
  const nav = useNavigate();
  const navigate = onNavigate || nav;
  const orders = home?.active_orders || [];
  const urgent = [];

  // 1. New orders awaiting acceptance
  orders
    .filter((o) => o.status === 'pending')
    .slice(0, 2)
    .forEach((o) => {
      const m = ageMin(o.created_date);
      urgent.push({
        icon: 'receipt_long',
        title: `طلب #${o.parent_order_number || String(o.id).slice(-4)} وصل`,
        sub: m != null ? `بانتظار قبولك — قبل ${m} دقيقة` : 'بانتظار قبولك',
        action: 'شوف الطلب',
        to: `/partner/orders/${o.id}`,
        tone: 'gold',
      });
    });

  // 2. Orders at risk (accepted/preparing longer than 2× prep time)
  if (urgent.length < 3) {
    const riskThreshold = Math.max(20, (prepTime || 15) * 2);
    orders
      .filter((o) => ['accepted', 'preparing'].includes(o.status))
      .forEach((o) => {
        if (urgent.length >= 3) return;
        const m = ageMin(o.created_date);
        if (m != null && m > riskThreshold) {
          urgent.push({
            icon: 'timer',
            title: `طلب #${o.parent_order_number || String(o.id).slice(-4)} متأخر`,
            sub: `بالتحضير من ${m} دقيقة — أعلى من وقت التحضير المتوقع`,
            action: 'شوف الطلب',
            to: `/partner/orders/${o.id}`,
            tone: 'gold',
          });
        }
      });
  }

  // 3. Offer requests returned by TAMAM for restaurant edit
  if (urgent.length < 3) {
    (offerRequests || [])
      .filter((r) => r.status === 'changes_requested')
      .slice(0, 3 - urgent.length)
      .forEach((r) => {
        urgent.push({
          icon: 'local_offer',
          title: `عرض ${GOAL_LABEL[r.goal] || 'عرض'} مستني تعديلك`,
          sub: 'تمام رجعه إلك لتعدّله',
          action: 'راجع العرض',
          to: '/partner/offers',
          tone: 'gold',
        });
      });
  }

  if (urgent.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <span className="material-symbols-outlined text-tamam-gold text-[20px]">priority_high</span>
        <h3 className="font-bold text-sm text-tamam-text">محتاج انتباهك</h3>
      </div>
      <div className="space-y-2">
        {urgent.map((u, i) => (
          <div key={i} className="bg-tamam-surface border border-tamam-gold/30 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tamam-gold/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tamam-gold text-[22px]">{u.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-tamam-text truncate">{u.title}</p>
              <p className="text-[11px] text-tamam-text-muted leading-snug">{u.sub}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(u.to)}
              className="shrink-0 h-10 px-3 rounded-xl bg-tamam-gold text-tamam-ink font-bold text-xs active:scale-95 transition-transform"
            >
              {u.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}