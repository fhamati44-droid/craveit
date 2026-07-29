import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import SuggestionCard from '@/components/tamam/SuggestionCard';
import { getActiveSuggestionSets, getItemsForSets, trackEvent } from '@/lib/tamamApi';
import { base44 } from '@/api/base44Client';

const WA_NUMBER = '972544616474';
const LEVELS = ['classic', 'mix', 'plus'];

async function fetchMealsForItems(items) {
  if (!items?.length) return { meals: [], byItem: {} };
  const mealIds = [...new Set(items.map(i => i.meal_id).filter(Boolean))];
  if (!mealIds.length) return { meals: [], byItem: {} };
  const res = await base44.functions.invoke('supabaseProxy', { action: 'getMenuItemsByIds', payload: { ids: mealIds } });
  const all = res?.data?.data || [];
  const byId = {};
  all.forEach(m => { byId[m.id] = m; });
  const byItem = {};
  items.forEach(i => { byItem[i.id] = byId[i.meal_id] ? { ...byId[i.meal_id], _qty: i.quantity } : null; });
  return { meals: all, byItem };
}

export default function TamamSuggestions() {
  const { moodId } = useParams();
  const navigate = useNavigate();
  const [mood, setMood] = useState(null);
  const [setsByLevel, setSetsByLevel] = useState({ classic: [], mix: [], plus: [] });
  const [indexByLevel, setIndexByLevel] = useState({ classic: 0, mix: 0, plus: 0 });
  const [itemsBySet, setItemsBySet] = useState({});
  const [mealsBySet, setMealsBySet] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const moods = await base44.entities.TamamMood.list();
        setMood((moods || []).find(m => m.id === moodId));
        const sets = await getActiveSuggestionSets(moodId);
        const grouped = { classic: [], mix: [], plus: [] };
        sets.forEach(s => { if (grouped[s.package_level]) grouped[s.package_level].push(s); });
        grouped.classic.sort((a, b) => a.sort_order - b.sort_order);
        grouped.mix.sort((a, b) => a.sort_order - b.sort_order);
        grouped.plus.sort((a, b) => a.sort_order - b.sort_order);
        setSetsByLevel(grouped);
        trackEvent({ action: 'mood_selected', mood_id: moodId });

        const allSetIds = sets.map(s => s.id);
        const items = await getItemsForSets(allSetIds);
        const itemsMap = {};
        items.forEach(it => {
          if (!itemsMap[it.suggestion_set_id]) itemsMap[it.suggestion_set_id] = [];
          itemsMap[it.suggestion_set_id].push(it);
        });
        setItemsBySet(itemsMap);

        const mealsMap = {};
        await Promise.all(allSetIds.map(async sid => {
          const { byItem } = await fetchMealsForItems(itemsMap[sid] || []);
          mealsMap[sid] = (itemsMap[sid] || []).map(it => byItem[it.id]).filter(Boolean);
        }));
        setMealsBySet(mealsMap);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [moodId]);

  const currentSet = useCallback((level) => {
    const arr = setsByLevel[level];
    if (!arr.length) return null;
    return arr[indexByLevel[level] % arr.length];
  }, [setsByLevel, indexByLevel]);

  const handleRefresh = (level) => {
    setRefreshing(true);
    const arr = setsByLevel[level];
    if (arr.length) {
      setIndexByLevel(p => ({ ...p, [level]: (p[level] + 1) % arr.length }));
      trackEvent({ action: 'suggestion_refreshed', mood_id: moodId, package_level: level });
    }
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleChoose = (level, set) => {
    trackEvent({ action: 'package_selected', mood_id: moodId, suggestion_set_id: set?.id, package_level: level });
    const meals = mealsBySet[set?.id] || [];
    const lines = meals.map(m => `${m._qty || 1}x ${m.name}`).join('\n');
    const msg = `مرحبا، اخترت اقتراح من TAMAM 👋\nالمود: ${mood?.name_ar || ''}\nالباقة: ${level}\nالاقتراح: ${set?.title_ar || ''}\n\nالطلب:\n${lines}\n\nاسمي:\nرقم الهاتف:\nملاحظات:`;
    trackEvent({ action: 'whatsapp_clicked', mood_id: moodId, suggestion_set_id: set?.id, package_level: level });
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#051614] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#3DEB8B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">نحضّر اقتراحاتك...</p>
        </div>
      </div>
    );
  }

  if (!mood) {
    return (
      <div className="min-h-screen bg-[#051614] flex items-center justify-center text-white text-center px-6">
        <div>
          <p className="text-3xl mb-2">🤔</p>
          <p className="text-white/70 mb-4">المود غير موجود</p>
          <Link to="/tamam-game" className="text-[#3DEB8B] underline">العودة للعبة</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white pb-12"
      style={{ background: 'radial-gradient(circle at 50% 0%, #0f2e2b 0%, #051614 70%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button onClick={() => navigate('/tamam-game')} className="flex items-center gap-1 text-white/70">
          <ArrowLeft size={18} /> غير المود
        </button>
        <span className="text-lg font-extrabold">TAMAM <span className="text-[#3DEB8B]">▲</span></span>
        <Link to="/" className="text-white/50 text-xs">تصفّح →</Link>
      </div>

      <div className="text-center px-4 mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3DEB8B]/15 border border-[#3DEB8B]/40">
          <span>{mood.icon || '✨'}</span>
          <span className="font-bold text-[#3DEB8B] text-sm">{mood.name_ar}</span>
        </div>
        <h1 className="text-xl font-extrabold mt-3">اخترنا لك حسب مودك</h1>
        <p className="text-white/50 text-xs mt-1">3 اقتراحات جاهزة • اختار اللي بيناسبك</p>
      </div>

      <div className="space-y-4 px-3">
        {LEVELS.map(level => {
          const set = currentSet(level);
          const meals = set ? mealsBySet[set.id] || [] : [];
          return (
            <SuggestionCard
              key={level}
              level={level}
              suggestion={set}
              meals={meals}
              loading={refreshing}
              onChoose={() => set && handleChoose(level, set)}
              onRefresh={() => handleRefresh(level)}
            />
          );
        })}
        {LEVELS.every(l => !currentSet(l)) && (
          <div className="text-center text-white/60 py-10">
            <p className="text-3xl mb-2">🛠️</p>
            <p>لا توجد اقتراحات لهذا المود بعد</p>
            <Link to="/tamam-game" className="text-[#3DEB8B] underline text-sm mt-2 inline-block">جرّب مود آخر</Link>
          </div>
        )}
      </div>
    </div>
  );
}