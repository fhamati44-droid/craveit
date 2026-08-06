import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Check, Pencil } from 'lucide-react';
import MealSetEditor from './MealSetEditor';
import { getAllMealSets, getVariantsForSets, getAssignmentsForSet, TIERS, TIER_LABEL, setCompleteness } from '@/lib/mealSetApi';
import { getAllMoods } from '@/lib/tamamApi';

/** MealSet management list: all sets, incomplete filter, create/edit, per-set tier status. */
export default function MealSetsManager() {
  const [sets, setSets] = useState([]);
  const [moods, setMoods] = useState([]);
  const [variantsBySet, setVariantsBySet] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getAllMealSets();
      const m = await getAllMoods();
      setMoods(m || []);
      const ids = (list || []).map((s) => s.id);
      const variants = await getVariantsForSets(ids);
      const bySet = {};
      (variants || []).forEach((v) => {
        if (!v.active) return;
        if (!bySet[v.meal_set_id]) bySet[v.meal_set_id] = {};
        if (!bySet[v.meal_set_id][v.tier]) bySet[v.meal_set_id][v.tier] = v;
      });
      setVariantsBySet(bySet);
      setSets(list || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const moodName = (id) => moods.find((m) => m.id === id)?.name_ar || '—';

  const filtered = sets.filter((s) => {
    if (!showIncompleteOnly) return true;
    return !setCompleteness(variantsBySet, s.id).complete;
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <button onClick={() => setEditing({})} className="flex-1 flex items-center justify-center gap-1.5 bg-blue text-white py-2.5 rounded-xl font-bold text-sm">
          <Plus size={16} /> إنشاء مجموعة وجبة
        </button>
        <label className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
          <input type="checkbox" checked={showIncompleteOnly} onChange={(e) => setShowIncompleteOnly(e.target.checked)} />
          مجموعات ناقصة
        </label>
      </div>

      {loading && <p className="text-center text-gray-400 py-4 text-sm">טוען...</p>}

      {!loading && filtered.length === 0 && !editing && (
        <p className="text-center text-gray-400 py-8 text-sm">{showIncompleteOnly ? 'لا توجد مجموعات ناقصة 🎉' : 'لا توجد مجموعات. أنشئ أول مجموعة.'}</p>
      )}

      {editing && <MealSetEditor mealSet={editing.id ? editing : null} moods={moods} onSave={() => { setEditing(null); load(); }} onClose={() => setEditing(null)} />}

      {filtered.map((s) => {
        const comp = setCompleteness(variantsBySet, s.id);
        return (
          <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {s.set_cover_image ? <img src={s.set_cover_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🍱</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{s.display_name_ar || s.internal_name}</p>
                <p className="text-[11px] text-gray-400">{s.slug || s.internal_name} · أولوية {s.display_priority} · {s.active ? '🟢 فعّال' : '⚪ غير فعّال'}</p>
                <div className="flex gap-1 mt-1">
                  {TIERS.map((t) => (
                    <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${comp[t] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {comp[t] ? <Check size={9} className="inline" /> : <AlertTriangle size={9} className="inline" />} {TIER_LABEL[t]}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-gray-100 rounded" title="ערוך"><Pencil size={14} /></button>
            </div>
            <AssignmentsRow setId={s.id} moodName={moodName} />
          </div>
        );
      })}
    </div>
  );
}

function AssignmentsRow({ setId, moodName }) {
  const [names, setNames] = useState([]);
  useEffect(() => {
    getAssignmentsForSet(setId).then((list) => setNames((list || []).filter((a) => a.active).map((a) => moodName(a.mood_id)))).catch(() => setNames([]));
  }, [setId]);
  if (!names.length) return <p className="text-[11px] text-gray-400 mt-1">غير مربوطة بأي مود.</p>;
  return <p className="text-[11px] text-gray-500 mt-1">مرتبطة بـ: {names.join('، ')}</p>;
}