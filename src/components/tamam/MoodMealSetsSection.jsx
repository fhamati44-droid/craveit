import { useState, useEffect } from 'react';
import { getAssignmentsForMood, getAllMealSets, TIER_LABEL } from '@/lib/mealSetApi';

/** Read-only list of MealSets connected to a mood — shown inside the existing mood editor. */
export default function MoodMealSetsSection({ moodId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!moodId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [assigns, allSets] = await Promise.all([getAssignmentsForMood(moodId), getAllMealSets()]);
        const setMap = new Map((allSets || []).map((s) => [s.id, s]));
        const list = (assigns || []).map((a) => ({ a, set: setMap.get(a.meal_set_id) })).filter((x) => x.set);
        list.sort((x, y) => (x.a.display_priority || 0) - (y.a.display_priority || 0));
        if (active) setRows(list);
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [moodId]);

  if (!moodId) return null;
  return (
    <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
      <p className="text-xs font-bold text-gray-700 mb-1">مجموعات الوجبات المقترحة لهذا المود</p>
      {loading && <p className="text-xs text-gray-400">...</p>}
      {!loading && rows.length === 0 && <p className="text-xs text-gray-400">لا توجد مجموعات مربوطة. أضفها من تبويب "مجموعات".</p>}
      {!loading && rows.map(({ a, set }) => (
        <div key={a.id} className="flex items-center justify-between text-xs py-1">
          <span className="truncate flex-1">{set.display_name_ar || set.internal_name}</span>
          <span className="text-gray-500 flex-shrink-0">{a.default_tier ? TIER_LABEL[a.default_tier] : 'افتراضي'} · {a.display_priority || 0} {a.featured_for_mood ? '⭐' : ''} {a.active === false ? '⚪' : '🟢'}</span>
        </div>
      ))}
    </div>
  );
}