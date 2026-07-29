import { useState, useEffect } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import MealPicker from './MealPicker';
import {
  getAllSuggestionSets, createSuggestionSet, updateSuggestionSet, deleteSuggestionSet,
  getItemsForSet, createItem, deleteItem,
} from '@/lib/tamamApi';

const LEVELS = [
  { id: 'classic', label: 'קלאסיק', copy: 'בסיסי/זול' },
  { id: 'mix', label: 'מיקס', copy: 'אמצעי' },
  { id: 'plus', label: 'פלוס', copy: 'פרימיום' },
];

export default function SuggestionSetManager({ moodId }) {
  const [level, setLevel] = useState('classic');
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [itemsBySet, setItemsBySet] = useState({});
  const [editing, setEditing] = useState(null); // set being created/edited

  const load = () => {
    if (!moodId) return;
    setLoading(true);
    getAllSuggestionSets(moodId)
      .then(list => {
        const sorted = (list || []).filter(s => s.package_level === level).sort((a, b) => a.sort_order - b.sort_order);
        setSets(sorted);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [moodId, level]);

  const loadItems = async (setId) => {
    const items = await getItemsForSet(setId);
    setItemsBySet(p => ({ ...p, [setId]: items || [] }));
  };

  const toggle = (setId) => {
    setExpanded(expanded === setId ? null : setId);
    if (setId !== expanded) loadItems(setId);
  };

  const saveSet = async () => {
    if (!editing?.title_ar && !editing?.display_price) return;
    const payload = {
      mood_id: moodId,
      package_level: level,
      title_ar: editing.title_ar || '',
      description_ar: editing.description_ar || '',
      hero_image_url: editing.hero_image_url || '',
      badge_text_ar: editing.badge_text_ar || '',
      display_price: Number(editing.display_price) || 0,
      is_active: editing.is_active !== false,
      sort_order: Number(editing.sort_order) || 0,
    };
    if (editing.id) {
      await updateSuggestionSet(editing.id, payload);
    } else {
      await createSuggestionSet(payload);
    }
    setEditing(null);
    load();
  };

  const removeSet = async (id) => {
    if (!confirm('למחוק סט הצעה? כל הפריטים שבו יימחקו.')) return;
    await deleteSuggestionSet(id);
    load();
  };

  const addMealToSet = async (setId, meal, restaurant) => {
    await createItem({
      suggestion_set_id: setId,
      restaurant_id: restaurant?.id || null,
      meal_id: meal.id,
      quantity: 1,
      is_required: true,
      sort_order: (itemsBySet[setId]?.length || 0) + 1,
    });
    loadItems(setId);
  };

  const removeItem = async (setId, itemId) => {
    await deleteItem(itemId);
    loadItems(setId);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Level tabs */}
      <div className="flex border-b border-gray-200">
        {LEVELS.map(l => (
          <button
            key={l.id}
            onClick={() => { setLevel(l.id); setExpanded(null); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              level === l.id ? 'bg-blue text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {loading && <p className="text-center text-gray-400 text-sm py-4">טוען...</p>}

        {!loading && sets.length === 0 && !editing && (
          <p className="text-center text-gray-400 text-sm py-4">אין סטים ברמה זו. לחץ "הוסף סט".</p>
        )}

        {sets.map(s => (
          <div key={s.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50">
              <button onClick={() => toggle(s.id)} className="flex-1 flex items-center justify-between text-right">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{s.title_ar || `סט #${s.sort_order}`}</p>
                  <p className="text-xs text-gray-400">₪{s.display_price || 0} • {s.is_active ? 'פעיל' : 'מוסתר'}</p>
                </div>
                {expanded === s.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-gray-200 rounded" title="ערוך">✏️</button>
                <button onClick={() => removeSet(s.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>

            {expanded === s.id && (
              <div className="p-3 space-y-3 bg-white">
                {/* Existing items */}
                <div className="space-y-1">
                  {(itemsBySet[s.id] || []).map(it => (
                    <div key={it.id} className="flex items-center justify-between bg-gray-50 px-2 py-1.5 rounded text-xs">
                      <span className="text-gray-700">פריט #{it.meal_id} × {it.quantity}</span>
                      <button onClick={() => removeItem(s.id, it.id)} className="text-red-500"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  {(!itemsBySet[s.id] || itemsBySet[s.id].length === 0) && (
                    <p className="text-xs text-gray-400 text-center py-1">אין פריטים. הוסף מנות למטה.</p>
                  )}
                </div>
                <MealPicker onPick={(meal, rest) => addMealToSet(s.id, meal, rest)} />
              </div>
            )}
          </div>
        ))}

        {/* Editor form */}
        {editing && (
          <div className="border-2 border-blue rounded-xl p-3 space-y-2 bg-blue-50/30">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">{editing.id ? 'עריכת סט' : 'סט חדש'} • {LEVELS.find(l => l.id === level).label}</p>
              <button onClick={() => setEditing(null)}><X size={16} /></button>
            </div>
            <input placeholder="כותרת (ערבית)" value={editing.title_ar || ''}
              onChange={e => setEditing({ ...editing, title_ar: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            <textarea placeholder="תיאור קצר" value={editing.description_ar || ''}
              onChange={e => setEditing({ ...editing, description_ar: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" rows={2} />
            <input placeholder="URL תמונה ראשית (אופציונלי)" value={editing.hero_image_url || ''}
              onChange={e => setEditing({ ...editing, hero_image_url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="מחיר לתצוגה" type="number" value={editing.display_price || ''}
                onChange={e => setEditing({ ...editing, display_price: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              <input placeholder="סדר תצוגה" type="number" value={editing.sort_order || ''}
                onChange={e => setEditing({ ...editing, sort_order: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            <input placeholder="טקסט תג (אופציונלי)" value={editing.badge_text_ar || ''}
              onChange={e => setEditing({ ...editing, badge_text_ar: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active !== false}
                onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
              פעיל
            </label>
            <button onClick={saveSet} className="w-full bg-blue text-white py-2 rounded-lg font-bold text-sm">שמור</button>
          </div>
        )}

        {!editing && (
          <button
            onClick={() => setEditing({ is_active: true, sort_order: sets.length + 1 })}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm hover:border-blue hover:text-blue"
          >
            <Plus size={16} /> הוסף סט
          </button>
        )}
      </div>
    </div>
  );
}