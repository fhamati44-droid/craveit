import { useEffect, useState } from 'react';
import { usePartner } from '@/lib/partnerContext';
import { getRestaurantCapacity, updateRestaurantCapacity } from '@/lib/partnerApi';

// Partner-facing capacity UX (Milestone 2). Natural Arabic question; the
// answer maps to an internal capacity field. "مش متأكد" stores null + low
// confidence so the engine falls back to heuristic with reduced confidence.
const OPTIONS = ['5', '10', '15', '20', 'أكثر'];
const ANSWER_TO_FIELD = { '5': 5, '10': 10, '15': 15, '20': 20, 'أكثر': 25 };

export default function CapacityCard() {
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [cap, setCap] = useState(null);
  const [answer, setAnswer] = useState('');
  const [maxAnswer, setMaxAnswer] = useState('');
  const [unsure, setUnsure] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!rid) return;
    setLoading(true);
    getRestaurantCapacity(rid).then((d) => {
      setCap(d);
      const cur = d?.capacity_normal_additional_per_hour;
      const found = Object.entries(ANSWER_TO_FIELD).find(([, v]) => v === cur);
      setAnswer(found ? found[0] : cur != null ? String(cur) : '');
      setMaxAnswer(d?.capacity_max_additional_per_hour != null ? String(d.capacity_max_additional_per_hour) : '');
      setUnsure(cur == null);
    }).finally(() => setLoading(false));
  };
  useEffect(load, [rid]);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const data = { unsure: unsure || answer === 'مش متأكد' };
      if (!unsure && answer && answer !== 'مش متأكد') {
        data.capacity_normal_additional_per_hour = ANSWER_TO_FIELD[answer] ?? Number(answer);
        data.capacity_confidence = 0.8;
      }
      if (maxAnswer && maxAnswer !== 'مش متأكد') data.capacity_max_additional_per_hour = Number(maxAnswer);
      await updateRestaurantCapacity(rid, data);
      setSaved(true);
      load();
    } finally { setSaving(false); }
  };

  if (loading) return <div className="h-32 skeleton-t rounded-2xl" />;

  return (
    <div className="bg-tamam-surface rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-tamam-green-bright">inventory_2</span>
        <h3 className="font-bold text-sm text-tamam-text">قدرتك التشغيلية</h3>
      </div>
      <p className="text-xs text-tamam-text-muted mb-3 leading-relaxed">
        لما تكون الفترة هادية، تقريباً قديش طلب زيادة بتقدر تستقبل بالساعة بدون ما يتأثر الشغل؟
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {OPTIONS.map((o) => (
          <button key={o} onClick={() => { setAnswer(o); setUnsure(false); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px] ${answer === o && !unsure ? 'bg-tamam-green-bright text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text'}`}>
            {o}
          </button>
        ))}
        <button onClick={() => { setAnswer('مش متأكد'); setUnsure(true); }}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px] ${unsure ? 'bg-tamam-gold text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text'}`}>
          مش متأكد
        </button>
      </div>

      <p className="text-xs text-tamam-text-muted mb-2">شو أقصى عدد زيادة ممكن تتحمله لفترة قصيرة؟ (اختياري)</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {['10', '15', '20', '25', '30'].map((o) => (
          <button key={o} onClick={() => setMaxAnswer(o)}
            className={`px-3 py-2 rounded-xl text-sm font-bold min-h-[44px] ${maxAnswer === o ? 'bg-tamam-green-bright text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text'}`}>
            {o}
          </button>
        ))}
        <button onClick={() => setMaxAnswer('مش متأكد')}
          className={`px-3 py-2 rounded-xl text-sm font-bold min-h-[44px] ${maxAnswer === 'مش متأكد' ? 'bg-tamam-gold text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text'}`}>
          مش متأكد
        </button>
      </div>

      {unsure && (
        <p className="text-[11px] text-tamam-gold mb-3 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">info</span>
          لما تكون مش متأكد، تمام رح تستخدم تقدير افتراضي بثقة أقل حتى يتضح الأداء.
        </p>
      )}

      <button onClick={save} disabled={saving}
        className="w-full bg-tamam-green-bright text-tamam-ink h-12 rounded-xl font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : null}
        {saving ? 'جاري الحفظ' : 'حفظ القدرة'}
      </button>
      {saved && <p className="text-[11px] text-tamam-green-bright mt-2 text-center">تم الحفظ ✓</p>}
      {cap?.capacity_normal_additional_per_hour != null && !unsure && (
        <p className="text-[11px] text-tamam-text-muted mt-2 text-center">القيمة الحالية: {cap.capacity_normal_additional_per_hour} طلب/ساعة</p>
      )}
    </div>
  );
}