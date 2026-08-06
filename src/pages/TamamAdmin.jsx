import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, BarChart3, FolderTree, Sparkles } from 'lucide-react';
import SuggestionSetManager from '@/components/tamam/SuggestionSetManager';
import MealSetsManager from '@/components/tamam/MealSetsManager';
import MoodMealSetsSection from '@/components/tamam/MoodMealSetsSection';
import {
  getAllMoods, createMood, updateMood, deleteMood,
} from '@/lib/tamamApi';
import { base44 } from '@/api/base44Client';

const DEFAULT_MOODS = [
  { name_ar: 'مطبخ البيت مسكّر', slug: 'home-kitchen', icon: '🏠' },
  { name_ar: 'البيت بده', slug: 'house-needs', icon: '🍽️' },
  { name_ar: 'الحبايب عنا', slug: 'loved-ones', icon: '❤️' },
  { name_ar: 'آخر الليل', slug: 'late-night', icon: '🌙' },
  { name_ar: 'أول النهار', slug: 'early-morning', icon: '🌅' },
  { name_ar: 'طاقة', slug: 'energy', icon: '⚡' },
  { name_ar: 'قعدة صبايا', slug: 'girls-hangout', icon: '✨' },
  { name_ar: 'لمة شباب', slug: 'guys-gathering', icon: '🎮' },
  { name_ar: 'وقت المباراة', slug: 'match-time', icon: '⚽' },
  { name_ar: 'ضيوف بالطريق', slug: 'guests-coming', icon: '🚗' },
];

const ACTION_LABELS = {
  mood_selected: 'בחירת מוד',
  suggestion_viewed: 'צפייה',
  suggestion_refreshed: 'רענון',
  package_selected: 'בחירת חבילה',
  whatsapp_clicked: 'קליק WhatsApp',
  order_started: 'התחלת הזמנה',
};

export default function TamamAdmin() {
  const [tab, setTab] = useState('moods');
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [selectedMoodId, setSelectedMoodId] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [moodsById, setMoodsById] = useState({});

  const loadMoods = () => {
    setLoading(true);
    getAllMoods()
      .then(list => {
        setMoods(list || []);
        const map = {};
        (list || []).forEach(m => { map[m.id] = m; });
        setMoodsById(map);
        if (!selectedMoodId && list.length) setSelectedMoodId(list[0].id);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMoods(); }, []);

  useEffect(() => {
    if (tab !== 'analytics') return;
    base44.entities.TamamSuggestionClick.list('-created_date', 500)
      .then(list => setClicks(list || []))
      .catch(() => {});
  }, [tab]);

  const saveMood = async () => {
    const payload = {
      name_ar: editing.name_ar || '',
      slug: editing.slug || '',
      icon: editing.icon || '✨',
      description_ar: editing.description_ar || '',
      image_url: editing.image_url || '',
      is_active: editing.is_active !== false,
      sort_order: Number(editing.sort_order) || 0,
    };
    if (editing.id) await updateMood(editing.id, payload);
    else await createMood(payload);
    setEditing(null);
    loadMoods();
  };

  const removeMood = async (id) => {
    if (!confirm('למחוק מוד? כל הסטים שתחתיו לא יוצגו ללקוחות.')) return;
    await deleteMood(id);
    loadMoods();
  };

  const seedDefaults = async () => {
    if (!confirm('ליצור את 10 המודים המוגדרים כברירת מחדל?')) return;
    for (let i = 0; i < DEFAULT_MOODS.length; i++) {
      const d = DEFAULT_MOODS[i];
      await createMood({ ...d, is_active: true, sort_order: i + 1 }).catch(() => {});
    }
    loadMoods();
  };

  // Analytics aggregation
  const moodCounts = {};
  const packageCounts = { classic: 0, mix: 0, plus: 0 };
  const setCounts = {};
  clicks.forEach(c => {
    if (c.mood_id) moodCounts[c.mood_id] = (moodCounts[c.mood_id] || 0) + 1;
    if (c.package_level) packageCounts[c.package_level] = (packageCounts[c.package_level] || 0) + 1;
    if (c.suggestion_set_id) setCounts[c.suggestion_set_id] = (setCounts[c.suggestion_set_id] || 0) + 1;
  });
  const waClicks = clicks.filter(c => c.action === 'whatsapp_clicked').length;

  return (
    <div className="min-h-screen bg-[#F5F5F5] max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="flex items-center gap-1 text-gray-500 text-sm">
            <ArrowRight size={16} /> לאתר
          </Link>
          <h1 className="text-lg font-extrabold">TAMAM Admin</h1>
          <Link to="/tamam-game" className="text-blue text-sm font-bold">צפה במשחק</Link>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setTab('moods')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold ${tab === 'moods' ? 'bg-white shadow text-blue' : 'text-gray-500'}`}>
            <Sparkles size={14} /> מודים
          </button>
          <button onClick={() => setTab('sets')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold ${tab === 'sets' ? 'bg-white shadow text-blue' : 'text-gray-500'}`}>
            <FolderTree size={14} /> סטים
          </button>
          <button onClick={() => setTab('mealsets')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold ${tab === 'mealsets' ? 'bg-white shadow text-blue' : 'text-gray-500'}`}>
            🍱 مجموعات
          </button>
          <button onClick={() => setTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold ${tab === 'analytics' ? 'bg-white shadow text-blue' : 'text-gray-500'}`}>
            <BarChart3 size={14} /> אנליטיקה
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* MOODS TAB */}
        {tab === 'moods' && (
          <>
            <div className="flex gap-2">
              <button onClick={() => setEditing({ is_active: true, sort_order: moods.length + 1, icon: '✨' })}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue text-white py-2.5 rounded-xl font-bold text-sm">
                <Plus size={16} /> הוסף מוד
              </button>
              {moods.length === 0 && (
                <button onClick={seedDefaults} className="flex-1 flex items-center justify-center gap-1.5 bg-green text-white py-2.5 rounded-xl font-bold text-sm">
                  צור מודים ברירת מחדל
                </button>
              )}
            </div>

            {loading && <p className="text-center text-gray-400 py-8">טוען...</p>}

            {!loading && moods.length === 0 && !editing && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">🎭</p>
                <p>אין מודים עדיין. הוסף או צור ברירת מחדל.</p>
              </div>
            )}

            {editing && (
              <div className="border-2 border-blue rounded-xl p-3 space-y-2 bg-blue-50/30">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">{editing.id ? 'עריכת מוד' : 'מוד חדש'}</p>
                  <button onClick={() => setEditing(null)} className="text-gray-400">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="שם (ערבית)" value={editing.name_ar || ''}
                    onChange={e => setEditing({ ...editing, name_ar: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  <input placeholder="slug" value={editing.slug || ''}
                    onChange={e => setEditing({ ...editing, slug: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="אייקון (emoji)" value={editing.icon || ''}
                    onChange={e => setEditing({ ...editing, icon: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  <input placeholder="סדר תצוגה" type="number" value={editing.sort_order || ''}
                    onChange={e => setEditing({ ...editing, sort_order: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <input placeholder="תיאור קצר" value={editing.description_ar || ''}
                  onChange={e => setEditing({ ...editing, description_ar: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                <input placeholder="URL תמונת רקע (אופציונלי)" value={editing.image_url || ''}
                  onChange={e => setEditing({ ...editing, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.is_active !== false}
                    onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
                  פעיל
                </label>
                {editing.id && <MoodMealSetsSection moodId={editing.id} />}
                <button onClick={saveMood} className="w-full bg-blue text-white py-2 rounded-lg font-bold text-sm">שמור מוד</button>
              </div>
            )}

            {moods.map(m => (
              <div key={m.id} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">{m.icon || '✨'}</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{m.name_ar}</p>
                  <p className="text-xs text-gray-400">/{m.slug} • סדר {m.sort_order} • {m.is_active ? '🟢 פעיל' : '⚪ מוסתר'}</p>
                </div>
                <button onClick={() => setEditing(m)} className="p-1.5 hover:bg-gray-100 rounded">✏️</button>
                <button onClick={() => removeMood(m.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </>
        )}

        {/* SETS TAB */}
        {tab === 'sets' && (
          <>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <label className="text-xs text-gray-500 mb-1 block">בחר מוד לניהול הסטים שלו:</label>
              <select value={selectedMoodId || ''} onChange={e => setSelectedMoodId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option value="">בחר מוד...</option>
                {moods.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name_ar}</option>)}
              </select>
            </div>
            {selectedMoodId && <SuggestionSetManager moodId={selectedMoodId} />}
            {!selectedMoodId && <p className="text-center text-gray-400 py-10 text-sm">בחר מוד כדי לנהל את הסטים</p>}
          </>
        )}

        {/* MEALSETS TAB */}
        {tab === 'mealsets' && <MealSetsManager />}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                <p className="text-2xl font-extrabold text-blue">{clicks.length}</p>
                <p className="text-xs text-gray-500">סה"כ אירועים</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                <p className="text-2xl font-extrabold text-green">{waClicks}</p>
                <p className="text-xs text-gray-500">קליקי WhatsApp</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                <p className="text-2xl font-extrabold text-orange">{Object.keys(moodCounts).length}</p>
                <p className="text-xs text-gray-500">מודים פעילים</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <h3 className="font-bold text-sm mb-2">המודים הפופולריים</h3>
              {Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).map(([id, c]) => (
                <div key={id} className="flex items-center justify-between py-1 text-sm">
                  <span>{moodsById[id]?.icon} {moodsById[id]?.name_ar || '—'}</span>
                  <span className="font-bold text-blue">{c}</span>
                </div>
              ))}
              {Object.keys(moodCounts).length === 0 && <p className="text-xs text-gray-400 text-center py-3">אין נתונים עדיין</p>}
            </div>

            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <h3 className="font-bold text-sm mb-2">רמות חבילה נבחרות</h3>
              {Object.entries(packageCounts).map(([lvl, c]) => (
                <div key={lvl} className="flex items-center justify-between py-1 text-sm">
                  <span className="capitalize">{lvl}</span>
                  <span className="font-bold text-blue">{c}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <h3 className="font-bold text-sm mb-2">אירועים אחרונים</h3>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {clicks.slice(0, 30).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                    <span className="text-gray-600">{ACTION_LABELS[c.action] || c.action}</span>
                    <span className="text-gray-400">{moodsById[c.mood_id]?.name_ar || '—'} • {c.package_level || ''}</span>
                  </div>
                ))}
                {clicks.length === 0 && <p className="text-xs text-gray-400 text-center py-3">אין אירועים עדיין</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}