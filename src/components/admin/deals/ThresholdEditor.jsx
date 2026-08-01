import { sortTiers } from '@/lib/groupDealApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function ThresholdEditor({ thresholds, onChange, referencePrice }) {
  const ref = Number(referencePrice) || 0;

  const update = (i, patch) => {
    const next = thresholds.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    // recompute discount
    next.forEach((t) => {
      if (ref > 0 && t.price != null) t.discount_percentage = Math.round(((ref - Number(t.price)) / ref) * 1000) / 10;
    });
    // enforce single best tier
    if (patch.is_best_tier) next.forEach((t, idx) => (t.is_best_tier = idx === i));
    if (patch.is_success_threshold) next.forEach((t, idx) => (t.is_success_threshold = idx === i));
    onChange(next);
  };

  const add = () => {
    const sorted = sortTiers(thresholds);
    const last = sorted[sorted.length - 1];
    const minP = last ? (last.min_participants || 0) + 5 : 1;
    const price = last ? Math.max(1, Math.round((last.price || 0) * 0.85)) : ref || 100;
    onChange([...thresholds, { min_participants: minP, price, max_participants: '', min_quantity: '', label: '', is_success_threshold: false, is_best_tier: false }]);
  };

  const remove = (i) => onChange(thresholds.filter((_, idx) => idx !== i));

  const sorted = sortTiers(thresholds);

  return (
    <div>
      <label className="block text-sm font-bold mb-1">مستويات السعر والخصم</label>
      <p className="text-[11px] text-on-surface-variant mb-3">كل ما زاد عدد المشتركين، السعر بينزل. نسبة الخصم تُحسب من السعر المرجعي ₪{Math.round(ref)}.</p>

      <div className="space-y-3">
        {sorted.map((t, i) => (
          <div key={i} className="bg-surface-container border border-outline-variant/30 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">المستوى {i + 1}</span>
              {thresholds.length > 1 && (
                <button type="button" onClick={() => remove(thresholds.indexOf(t))} className="text-error text-xs flex items-center gap-1">
                  <Icon name="delete" className="text-[16px]" /> حذف
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">أدنى عدد مشتركين</label>
                <input
                  type="number"
                  min="1"
                  value={t.min_participants}
                  onChange={(e) => update(thresholds.indexOf(t), { min_participants: Number(e.target.value) })}
                  className="w-full bg-surface-container-high rounded-lg px-2.5 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">السعر (₪)</label>
                <input
                  type="number"
                  min="0"
                  value={t.price}
                  onChange={(e) => update(thresholds.indexOf(t), { price: Number(e.target.value) })}
                  className="w-full bg-surface-container-high rounded-lg px-2.5 py-2 text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-on-surface-variant">الخصم: {t.discount_percentage || 0}%</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={!!t.is_success_threshold} onChange={(e) => update(thresholds.indexOf(t), { is_success_threshold: e.target.checked })} className="accent-primary" />
                حد النجاح
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={!!t.is_best_tier} onChange={(e) => update(thresholds.indexOf(t), { is_best_tier: e.target.checked })} className="accent-primary" />
                أفضل سعر نهائي
              </label>
            </div>
            <input
              value={t.label || ''}
              onChange={(e) => update(thresholds.indexOf(t), { label: e.target.value })}
              placeholder="تسمية للعميل (اختياري)"
              className="w-full bg-surface-container-high rounded-lg px-2.5 py-2 text-sm outline-none"
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="mt-3 w-full h-11 rounded-xl border border-dashed border-primary/40 text-primary font-semibold flex items-center justify-center gap-1">
        <Icon name="add" className="text-[18px]" /> إضافة مستوى
      </button>
    </div>
  );
}