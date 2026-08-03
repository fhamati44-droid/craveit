import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, SkipForward, ChevronLeft, Check, X, Plus, Settings, LogIn, RotateCcw, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getRestaurants, getMenuItemsByRestaurant } from '@/lib/api';
import { saveDraft, loadDraft, deleteDraft, submitProposal, getConfig } from '@/lib/communityMoodApi';
import { detectQualityMode, getQualitySettings, QUALITY_LABELS_AR } from '@/lib/gameQuality';
import { track } from '@/lib/analytics';
import GameTable from '@/components/moodgame/GameTable';
import MealDetailSheet from '@/components/moodgame/MealDetailSheet';
import { resolvePublicImage } from '@/lib/imageUtils';

const STAGES = ['intro', 'mood_selection', 'restaurant_selection', 'meal_selection', 'table_building', 'package_selection', 'mood_details', 'social_preview', 'submission', 'success'];

const ZONE_BY_CATEGORY = (cat) => {
  const c = (cat || '').toLowerCase();
  if (['حلويات', 'كيك', 'كنافة', 'آيس كريم', 'بوظة', 'شوكولاتة', 'تسالي'].some((k) => c.includes(k))) return 'desserts';
  if (['مشروبات', 'عصائر', 'مشروب', 'قهوة', 'شاي'].some((k) => c.includes(k))) return 'desserts';
  if (['سلطات', 'إضافات', 'مقبلات', 'بطاطا', 'صلصات', 'خفيف'].some((k) => c.includes(k))) return 'additions';
  return 'main';
};

export default function MoodGame() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('intro');
  const [qualityMode, setQualityMode] = useState('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState(null);
  const [showResume, setShowResume] = useState(false);

  const [moods, setMoods] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [selectedMoodId, setSelectedMoodId] = useState(null);
  const [customMood, setCustomMood] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [tableMeals, setTableMeals] = useState([]);
  const [packageType, setPackageType] = useState('classic');
  const [moodDetails, setMoodDetails] = useState({ title_ar: '', title_he: '', description_ar: '', occasion: '', num_people: 1 });
  const [coverLayout, setCoverLayout] = useState('table_top');
  const [detailMeal, setDetailMeal] = useState(null);
  const [config, setConfig] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const qualitySettings = useMemo(() => getQualitySettings(qualityMode), [qualityMode]);

  // Initial load
  useEffect(() => {
    getConfig().then(setConfig).catch(() => {});
    setQualityMode(detectQualityMode());
    loadDraft().then((d) => {
      if (d && d.current_stage && d.current_stage !== 'success') {
        setDraft(d);
        setShowResume(true);
      }
    }).catch(() => {});
    // Load moods
    base44.entities.TamamMood.list('sort_order', 100).then((m) => setMoods(m || [])).catch(() => {});
  }, []);

  // Auto-save draft when state changes (debounced)
  useEffect(() => {
    if (stage === 'intro' || stage === 'success') return;
    const timer = setTimeout(() => {
      saveDraft({
        current_stage: stage,
        selected_mood_id: selectedMoodId,
        custom_mood_data: customMood,
        selected_restaurant_ids: selectedRestaurant ? [selectedRestaurant.id] : [],
        selected_meal_ids: tableMeals.map((m) => m.id),
        table_layout: tableMeals.reduce((acc, m) => { acc[m.id] = { zone: m.zone, quantity: m.quantity }; return acc; }, {}),
        package_type: packageType,
        quality_mode: qualityMode,
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [stage, selectedMoodId, customMood, selectedRestaurant, tableMeals, packageType, qualityMode]);

  const resumeDraft = () => {
    if (!draft) return;
    setStage(draft.current_stage || 'mood_selection');
    setSelectedMoodId(draft.selected_mood_id);
    setCustomMood(draft.custom_mood_data ? (typeof draft.custom_mood_data === 'string' ? JSON.parse(draft.custom_mood_data) : draft.custom_mood_data) : null);
    if (draft.selected_restaurant_ids?.length) {
      getRestaurants().then((rests) => {
        const r = (rests || []).find((x) => x.id === draft.selected_restaurant_ids[0]);
        if (r) {
          setSelectedRestaurant(r);
          loadMenu(r.id);
        }
      });
    }
    setPackageType(draft.package_type || 'classic');
    if (draft.selected_meal_ids?.length && draft.table_layout) {
      // Reload meal snapshots from the menu
      getMenuItemsByRestaurant(draft.selected_restaurant_ids[0]).then((cats) => {
        const allMeals = (cats || []).flatMap((c) => c.items || []);
        const layout = typeof draft.table_layout === 'string' ? JSON.parse(draft.table_layout) : draft.table_layout;
        const restored = draft.selected_meal_ids
          .map((id) => allMeals.find((m) => m.id === id))
          .filter(Boolean)
          .map((m) => ({
            id: m.id, name: m.name_ar || m.name, price: m.price, image_url: m.image_url,
            restaurant_id: selectedRestaurant?.id, restaurant_name: selectedRestaurant?.name_ar || selectedRestaurant?.name,
            category: m.category || m.category_name, quantity: layout[m.id]?.quantity || 1, zone: layout[m.id]?.zone || 'main',
            has_required_extras: m.has_required_extras, description: m.description,
          }));
        setTableMeals(restored);
      }).catch(() => {});
    }
    setShowResume(false);
  };

  const loadMenu = (restaurantId) => {
    getMenuItemsByRestaurant(restaurantId).then((cats) => {
      setMenuCategories(cats || []);
      setActiveCategory(cats?.[0]?.id || null);
    }).catch(() => {});
  };

  const nextStage = () => {
    const idx = STAGES.indexOf(stage);
    if (idx < STAGES.length - 1) {
      const next = STAGES[idx + 1];
      setStage(next);
      track('community_game_stage_completed', { stage, next_stage: next });
    }
  };

  const prevStage = () => {
    const idx = STAGES.indexOf(stage);
    if (idx > 0) setStage(STAGES[idx - 1]);
  };

  const addMealToTable = (meal) => {
    const existing = tableMeals.find((m) => m.id === meal.id);
    if (existing) {
      setTableMeals(tableMeals.map((m) => m.id === meal.id ? { ...m, quantity: (m.quantity || 1) + 1 } : m));
    } else {
      setTableMeals([...tableMeals, {
        id: meal.id,
        name: meal.name_ar || meal.name,
        price: meal.price,
        image_url: meal.image_url,
        restaurant_id: selectedRestaurant?.id,
        restaurant_name: selectedRestaurant?.name_ar || selectedRestaurant?.name,
        category: meal.category || meal.category_name,
        quantity: 1,
        zone: ZONE_BY_CATEGORY(meal.category || meal.category_name),
        has_required_extras: meal.has_required_extras,
        description: meal.description,
      }]);
    }
    track('community_game_meal_dropped', { meal_id: meal.id, restaurant_id: selectedRestaurant?.id });
    setDetailMeal(null);
  };

  const removeMeal = (mealId) => setTableMeals(tableMeals.filter((m) => m.id !== mealId));
  const updateQty = (mealId, qty) => {
    if (qty < 1) { removeMeal(mealId); return; }
    setTableMeals(tableMeals.map((m) => m.id === mealId ? { ...m, quantity: qty } : m));
  };
  const moveZone = (mealId) => {
    setTableMeals(tableMeals.map((m) => {
      if (m.id !== mealId) return m;
      const zones = ['main', 'additions', 'desserts'];
      const next = zones[(zones.indexOf(m.zone) + 1) % 3];
      return { ...m, zone: next };
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        // Save state and redirect to login
        await base44.auth.redirectToLogin('/mood-game');
        return;
      }
      const result = await submitProposal({
        mood_title_ar: moodDetails.title_ar,
        mood_title_he: moodDetails.title_he || null,
        description_ar: moodDetails.description_ar || null,
        occasion_key: moodDetails.occasion || null,
        num_people: moodDetails.num_people || null,
        existing_mood_id: selectedMoodId || null,
        restaurant_ids: [selectedRestaurant.id],
        meal_ids: tableMeals.map((m) => m.id),
        table_layout: tableMeals.reduce((acc, m) => { acc[m.id] = { zone: m.zone, quantity: m.quantity }; return acc; }, {}),
        package_type: packageType,
        cover_layout: coverLayout,
        meal_snapshots: tableMeals,
        restaurant_snapshots: [{ id: selectedRestaurant.id, name: selectedRestaurant.name_ar || selectedRestaurant.name, image_url: selectedRestaurant.image_url }],
      });
      setSubmittedId(result.id);
      await deleteDraft();
      track('community_mood_submitted', { proposal_id: result.id });
      setStage('success');
    } catch (err) {
      console.error(err);
      alert(err?.error === 'auth_required' ? 'سجّل أولًا' : 'صار خطأ، جرّب مرة ثانية');
    } finally { setSubmitting(false); }
  };

  const startGame = () => {
    track('community_game_started', { source: 'intro' });
    setStage('mood_selection');
  };

  return (
    <div className="min-h-screen bg-tamam-bg text-tamam-text font-tamam pt-safe pb-safe" dir="rtl">
      {/* Settings button */}
      {stage !== 'intro' && stage !== 'success' && (
        <button
          onClick={() => setShowSettings(true)}
          className="fixed top-3 left-3 z-30 p-2 rounded-full bg-tamam-surface-high/80 text-tamam-text-muted backdrop-blur"
          aria-label="الإعدادات"
        >
          <Settings size={18} />
        </button>
      )}

      {/* Back button */}
      {stage !== 'intro' && stage !== 'success' && (
        <button
          onClick={prevStage}
          className="fixed top-3 right-3 z-30 p-2 rounded-full bg-tamam-surface-high/80 text-tamam-text-muted backdrop-blur flex items-center gap-1 text-xs"
        >
          <ChevronLeft size={16} className="rotate-180" /> رجوع
        </button>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: qualitySettings.animDuration }}
          className="max-w-[430px] mx-auto px-4 pt-14"
        >
          {/* STAGE: INTRO */}
          {stage === 'intro' && <IntroStage onStart={startGame} />}

          {/* STAGE: MOOD_SELECTION */}
          {stage === 'mood_selection' && (
            <MoodSelectionStage
              moods={moods}
              selectedMoodId={selectedMoodId}
              onSelect={(id) => { setSelectedMoodId(id); setCustomMood(null); nextStage(); }}
              onCreateNew={() => { setSelectedMoodId(null); setCustomMood({ name: '', occasion: '', concept: '' }); nextStage(); }}
            />
          )}

          {/* STAGE: RESTAURANT_SELECTION */}
          {stage === 'restaurant_selection' && (
            <RestaurantSelectionStage
              restaurants={restaurants}
              onLoad={() => getRestaurants().then((r) => setRestaurants(r || []))}
              onSelect={(r) => { setSelectedRestaurant(r); loadMenu(r.id); nextStage(); }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}

          {/* STAGE: MEAL_SELECTION */}
          {stage === 'meal_selection' && (
            <MealSelectionStage
              categories={menuCategories}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              restaurant={selectedRestaurant}
              tableMeals={tableMeals}
              onAddMeal={addMealToTable}
              onMealClick={(meal) => setDetailMeal({ ...meal, restaurant_name: selectedRestaurant?.name_ar || selectedRestaurant?.name })}
              onContinue={() => { setStage('table_building'); }}
            />
          )}

          {/* STAGE: TABLE_BUILDING */}
          {stage === 'table_building' && (
            <div className="space-y-4">
              <h2 className="text-tamam-text font-bold text-lg text-center">رتّب الوجبات على الطاولة</h2>
              <GameTable
                meals={tableMeals}
                onRemove={removeMeal}
                onUpdateQty={updateQty}
                onMoveZone={moveZone}
                qualitySettings={qualitySettings}
                onReset={() => setTableMeals([])}
              />
              <div className="flex gap-2">
                <button onClick={() => setStage('meal_selection')} className="flex-1 bg-tamam-surface-high text-tamam-text font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1">
                  <Plus size={16} /> ضيف وجبات
                </button>
                {tableMeals.length > 0 && (
                  <button onClick={nextStage} className="flex-1 bg-tamam-green text-tamam-ink font-bold text-sm py-2.5 rounded-xl">
                    كمّل
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STAGE: PACKAGE_SELECTION */}
          {stage === 'package_selection' && (
            <PackageSelectionStage
              tableMeals={tableMeals}
              packageType={packageType}
              setPackageType={(p) => { setPackageType(p); track('community_game_package_changed', { package: p }); }}
              onContinue={nextStage}
            />
          )}

          {/* STAGE: MOOD_DETAILS */}
          {stage === 'mood_details' && (
            <MoodDetailsStage
              details={moodDetails}
              setDetails={setMoodDetails}
              coverLayout={coverLayout}
              setCoverLayout={setCoverLayout}
              tableMeals={tableMeals}
              onContinue={nextStage}
            />
          )}

          {/* STAGE: SOCIAL_PREVIEW */}
          {stage === 'social_preview' && (
            <SocialPreviewStage
              moodDetails={moodDetails}
              tableMeals={tableMeals}
              selectedRestaurant={selectedRestaurant}
              packageType={packageType}
              coverLayout={coverLayout}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}

          {/* STAGE: SUCCESS */}
          {stage === 'success' && (
            <SuccessStage proposalId={submittedId} onViewCommunity={() => navigate('/community-moods')} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Meal Detail Sheet */}
      <MealDetailSheet
        meal={detailMeal}
        open={!!detailMeal}
        onClose={() => setDetailMeal(null)}
        onAddToTable={() => detailMeal && addMealToTable(detailMeal)}
        inTable={detailMeal && tableMeals.some((m) => m.id === detailMeal.id)}
        onRemoveFromTable={() => { if (detailMeal) removeMeal(detailMeal.id); setDetailMeal(null); }}
      />

      {/* Settings Sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowSettings(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-tamam-surface rounded-t-3xl p-4 pb-safe"
            >
              <h3 className="text-tamam-text font-bold text-base mb-3">جودة الرسم</h3>
              <div className="grid grid-cols-4 gap-2">
                {['auto', 'high', 'balanced', 'lite'].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setQualityMode(m); setShowSettings(false); }}
                    className={`py-2 rounded-lg text-xs font-bold ${qualityMode === m ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text-muted'}`}
                  >
                    {QUALITY_LABELS_AR[m]}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Resume prompt */}
      {showResume && (
        <div className="fixed inset-0 bg-tamam-ink/90 z-50 flex items-center justify-center p-4">
          <div className="bg-tamam-surface rounded-2xl p-5 max-w-sm w-full text-center">
            <RotateCcw size={32} className="text-tamam-green mx-auto mb-3" />
            <h2 className="text-tamam-text font-bold text-lg mb-1">عندك مود ناقص</h2>
            <p className="text-tamam-text-muted text-sm mb-4">بدك تكمل من وين وقفت؟</p>
            <div className="flex gap-2">
              <button onClick={resumeDraft} className="flex-1 bg-tamam-green text-tamam-ink font-bold text-sm py-2.5 rounded-xl">كمّل المود</button>
              <button onClick={() => { setShowResume(false); deleteDraft(); }} className="flex-1 bg-tamam-surface-high text-tamam-text-muted font-bold text-sm py-2.5 rounded-xl">ابدأ من جديد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== STAGE COMPONENTS =====

function IntroStage({ onStart }) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center py-10">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative mb-6"
      >
        <div className="w-40 h-24 mx-auto rounded-xl bg-gradient-to-br from-tamam-surface-high to-tamam-surface-lowest border-2 border-tamam-green/40 shadow-2xl"
          style={{ transform: 'perspective(600px) rotateX(25deg)' }}>
          <div className="flex items-center justify-center h-full gap-2">
            {['🍔', '🍕', '🥗'].map((e, i) => (
              <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} className="text-2xl">{e}</motion.div>
            ))}
          </div>
        </div>
        <motion.div className="absolute -inset-2 rounded-2xl border border-tamam-green/20"
          animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-tamam-text-muted text-sm mb-2">كل مود ببلّش من طاولة</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="text-tamam-text font-bold text-2xl mb-1">شو بدك تركّب اليوم؟</motion.h1>
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        onClick={onStart}
        className="mt-6 bg-tamam-green text-tamam-ink font-bold text-base px-8 py-3 rounded-full flex items-center gap-2 active:scale-95 transition-transform">
        <Play size={18} fill="currentColor" /> افتح الطاولة
      </motion.button>
      <button onClick={onStart} className="mt-3 text-tamam-text-muted text-xs">تخطّي</button>
    </div>
  );
}

function MoodSelectionStage({ moods, selectedMoodId, onSelect, onCreateNew }) {
  return (
    <div className="py-4">
      <h2 className="text-tamam-text font-bold text-lg mb-1">اختار مودك</h2>
      <p className="text-tamam-text-muted text-xs mb-4">من وين جوّك اليوم؟</p>
      <div className="grid grid-cols-2 gap-3">
        {moods.map((mood) => (
          <button
            key={mood.id}
            onClick={() => onSelect(mood.id)}
            className={`bg-tamam-surface rounded-xl p-3 text-center border-2 transition-all ${selectedMoodId === mood.id ? 'border-tamam-green' : 'border-tamam-outline/20'}`}
          >
            {mood.image_url && <img src={mood.image_url} alt="" className="w-12 h-12 mx-auto rounded-full object-cover mb-2" />}
            <p className="text-tamam-text font-bold text-sm">{mood.name_ar}</p>
            {mood.description_ar && <p className="text-tamam-text-muted text-[10px] line-clamp-1 mt-0.5">{mood.description_ar}</p>}
          </button>
        ))}
        <button
          onClick={onCreateNew}
          className="bg-tamam-surface-lowest/50 rounded-xl p-3 text-center border-2 border-dashed border-tamam-outline/30"
        >
          <div className="text-3xl mb-1">✨</div>
          <p className="text-tamam-green-bright font-bold text-sm">مود جديد</p>
          <p className="text-tamam-text-muted text-[10px] mt-0.5">أنشئ مودك الخاص</p>
        </button>
      </div>
    </div>
  );
}

function RestaurantSelectionStage({ restaurants, onLoad, onSelect, searchQuery, setSearchQuery }) {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!restaurants.length) {
      setLoading(true);
      onLoad().finally(() => setLoading(false));
    }
  }, []);

  const filtered = restaurants.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.name_ar || r.name || '').toLowerCase().includes(q) || (r.cuisine || '').toLowerCase().includes(q);
  });

  return (
    <div className="py-4">
      <h2 className="text-tamam-text font-bold text-lg mb-1">اختار المطعم</h2>
      <p className="text-tamam-text-muted text-xs mb-3">من وين بدك تأكل؟</p>
      <div className="relative mb-3">
        <Search size={16} className="absolute top-2.5 right-3 text-tamam-text-muted" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مطعم..."
          className="w-full bg-tamam-surface text-tamam-text text-sm rounded-xl pr-9 pl-3 py-2 border border-tamam-outline/30 focus:outline-none focus:border-tamam-green"
        />
      </div>
      {loading ? (
        <div className="text-center text-tamam-text-muted text-sm py-8">جاري التحميل...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full flex items-center gap-3 bg-tamam-surface rounded-xl p-3 active:scale-98 transition-transform border border-tamam-outline/20 text-right"
            >
              {r.image_url ? (
                <img src={resolvePublicImage(r.image_url)} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-tamam-surface-high flex items-center justify-center text-xl flex-shrink-0">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-tamam-text font-bold text-sm truncate">{r.name_ar || r.name}</p>
                <p className="text-tamam-text-muted text-[11px] truncate">{r.cuisine || ''}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {r.is_open !== false && <span className="text-tamam-green-bright text-[9px]">● مفتوح</span>}
                  {r.delivery_available && <span className="text-tamam-text-muted text-[9px]">توصيل</span>}
                  {r.pickup_available && <span className="text-tamam-text-muted text-[9px]">استلام</span>}
                </div>
              </div>
              <ChevronLeft size={16} className="text-tamam-text-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MealSelectionStage({ categories, activeCategory, setActiveCategory, restaurant, tableMeals, onAddMeal, onMealClick, onContinue }) {
  const activeCat = categories.find((c) => c.id === activeCategory) || categories[0];
  const meals = activeCat?.items || [];

  return (
    <div className="py-4">
      <h2 className="text-tamam-text font-bold text-lg mb-1">اختار الوجبات</h2>
      <p className="text-tamam-text-muted text-xs mb-3">{restaurant?.name_ar || restaurant?.name}</p>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${activeCategory === cat.id ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text-muted'}`}
          >
            {cat.name_ar || cat.name}
          </button>
        ))}
      </div>

      {/* Meal grid */}
      <div className="grid grid-cols-2 gap-3">
        {meals.map((meal) => {
          const inTable = tableMeals.some((m) => m.id === meal.id);
          return (
            <div
              key={meal.id}
              className="bg-tamam-surface rounded-xl overflow-hidden border border-tamam-outline/20"
            >
              <button onClick={() => onMealClick(meal)} className="w-full text-right">
                {meal.image_url ? (
                  <img src={resolvePublicImage(meal.image_url)} alt="" className="w-full h-20 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-20 bg-tamam-surface-high flex items-center justify-center text-2xl">🍽️</div>
                )}
              </button>
              <div className="p-2">
                <button onClick={() => onMealClick(meal)} className="w-full text-right">
                  <p className="text-tamam-text text-xs font-bold leading-tight line-clamp-1">{meal.name_ar || meal.name}</p>
                  <p className="text-tamam-green-bright font-bold text-sm mt-0.5">₪{Math.round(meal.price || 0)}</p>
                </button>
                <button
                  onClick={() => onAddMeal(meal)}
                  className={`w-full mt-1.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 ${inTable ? 'bg-tamam-surface-high text-tamam-text-muted' : 'bg-tamam-green text-tamam-ink'}`}
                >
                  {inTable ? <><Check size={11} /> موجود</> : <><Plus size={11} /> ضيف للطاولة</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {tableMeals.length > 0 && (
        <button
          onClick={onContinue}
          className="fixed bottom-4 left-4 right-4 max-w-[430px] mx-auto bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl shadow-lg z-20"
        >
          روح للطاولة ({tableMeals.length})
        </button>
      )}
    </div>
  );
}

function PackageSelectionStage({ tableMeals, packageType, setPackageType, onContinue }) {
  const mainCount = tableMeals.filter((m) => m.zone === 'main').length;
  const totalCount = tableMeals.length;
  let suggested = 'classic';
  if (totalCount >= 4 || (mainCount >= 1 && totalCount >= 3)) suggested = 'plus';
  else if (mainCount >= 1 && totalCount >= 2) suggested = 'mix';

  const packages = [
    { key: 'classic', label: 'كلاسيك', desc: 'وجبة مناسبة ليوم عادي', icon: '🍽️', color: 'border-tamam-green' },
    { key: 'mix', label: 'ميكس', desc: 'تشكيلة أكبر لمزاجك', icon: '🎨', color: 'border-tamam-teal' },
    { key: 'plus', label: 'بلس', desc: 'خيار فخم لمناسباتك', icon: '✨', color: 'border-tamam-gold' },
  ];

  return (
    <div className="py-4">
      <h2 className="text-tamam-text font-bold text-lg mb-1">اختار الباقة</h2>
      <p className="text-tamam-green-bright text-xs mb-4">تركيبتك أقرب إلى {packages.find((p) => p.key === suggested)?.label}</p>
      <div className="space-y-3">
        {packages.map((p) => (
          <button
            key={p.key}
            onClick={() => setPackageType(p.key)}
            className={`w-full flex items-center gap-3 bg-tamam-surface rounded-xl p-4 border-2 transition-all ${packageType === p.key ? p.color : 'border-tamam-outline/20'}`}
          >
            <span className="text-2xl">{p.icon}</span>
            <div className="flex-1 text-right">
              <p className="text-tamam-text font-bold text-sm">{p.label}</p>
              <p className="text-tamam-text-muted text-xs">{p.desc}</p>
            </div>
            {suggested === p.key && <span className="text-tamam-green-bright text-[10px] font-bold">مقترح</span>}
            {packageType === p.key && <Check size={18} className="text-tamam-green" />}
          </button>
        ))}
      </div>
      <button onClick={onContinue} className="w-full mt-4 bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl">
        كمّل
      </button>
    </div>
  );
}

function MoodDetailsStage({ details, setDetails, coverLayout, setCoverLayout, tableMeals, onContinue }) {
  const coverOptions = [
    { key: 'table_top', label: 'منظر الطاولة', icon: '🍽️' },
    { key: 'hero_meal', label: 'الوجبة الرئيسية', icon: '⭐' },
    { key: 'meal_grid', label: 'شبكة الوجبات', icon: '🔲' },
    { key: 'main_plus_additions', label: 'رئيسي + إضافات', icon: '➕' },
  ];

  return (
    <div className="py-4 space-y-4">
      <div>
        <h2 className="text-tamam-text font-bold text-lg mb-1">تفاصيل المود</h2>
        <p className="text-tamam-text-muted text-xs">اسم المود ووصفه حتى الناس تعرف شو هو</p>
      </div>

      <div>
        <label className="text-tamam-text-muted text-xs font-semibold mb-1 block">اسم المود (عربي) *</label>
        <input
          value={details.title_ar}
          onChange={(e) => setDetails({ ...details, title_ar: e.target.value.slice(0, 60) })}
          placeholder="مثال: قعدة الشباب"
          className="w-full bg-tamam-surface text-tamam-text text-sm rounded-lg px-3 py-2.5 border border-tamam-outline/30 focus:outline-none focus:border-tamam-green"
        />
      </div>

      <div>
        <label className="text-tamam-text-muted text-xs font-semibold mb-1 block">وصف قصير</label>
        <textarea
          value={details.description_ar}
          onChange={(e) => setDetails({ ...details, description_ar: e.target.value.slice(0, 200) })}
          placeholder="مثال: لمّة شباب على برجر وبطاطا..."
          rows={2}
          className="w-full bg-tamam-surface text-tamam-text text-sm rounded-lg px-3 py-2.5 border border-tamam-outline/30 focus:outline-none focus:border-tamam-green resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-tamam-text-muted text-xs font-semibold mb-1 block">المناسبة</label>
          <input
            value={details.occasion}
            onChange={(e) => setDetails({ ...details, occasion: e.target.value.slice(0, 30) })}
            placeholder="مثال: قعدة"
            className="w-full bg-tamam-surface text-tamam-text text-sm rounded-lg px-3 py-2.5 border border-tamam-outline/30 focus:outline-none focus:border-tamam-green"
          />
        </div>
        <div>
          <label className="text-tamam-text-muted text-xs font-semibold mb-1 block">عدد الأشخاص</label>
          <input
            type="number"
            value={details.num_people}
            onChange={(e) => setDetails({ ...details, num_people: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full bg-tamam-surface text-tamam-text text-sm rounded-lg px-3 py-2.5 border border-tamam-outline/30 focus:outline-none focus:border-tamam-green"
          />
        </div>
      </div>

      <div>
        <label className="text-tamam-text-muted text-xs font-semibold mb-2 block">شكل الكفر</label>
        <div className="grid grid-cols-2 gap-2">
          {coverOptions.map((c) => (
            <button
              key={c.key}
              onClick={() => setCoverLayout(c.key)}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 ${coverLayout === c.key ? 'border-tamam-green bg-tamam-green/10' : 'border-tamam-outline/20 bg-tamam-surface'}`}
            >
              <span className="text-lg">{c.icon}</span>
              <span className="text-tamam-text text-xs font-semibold">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={!details.title_ar.trim()}
        className="w-full bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl disabled:opacity-40"
      >
        معاينة المود
      </button>
    </div>
  );
}

function SocialPreviewStage({ moodDetails, tableMeals, selectedRestaurant, packageType, coverLayout, onSubmit, submitting }) {
  const total = tableMeals.reduce((s, m) => s + (m.price || 0) * (m.quantity || 1), 0);
  const coverImg = tableMeals[0]?.image_url || selectedRestaurant?.image_url;

  return (
    <div className="py-4 space-y-4">
      <div>
        <h2 className="text-tamam-text font-bold text-lg mb-1">معاينة المود</h2>
        <p className="text-tamam-text-muted text-xs">هكاول بيشوف الناس مودك</p>
      </div>

      {/* Preview card */}
      <div className="bg-tamam-surface rounded-2xl overflow-hidden border border-tamam-outline/20">
        <div className="relative h-40 bg-tamam-surface-low">
          {coverImg && <img src={resolvePublicImage(coverImg)} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-tamam-ink/80 to-transparent" />
          <span className="absolute top-2 right-2 bg-tamam-green/90 text-tamam-ink text-[10px] font-bold px-2 py-0.5 rounded-full">
            {packageType === 'plus' ? 'بلس' : packageType === 'mix' ? 'ميكس' : 'كلاسيك'}
          </span>
          <div className="absolute bottom-2 right-2 left-2">
            <h3 className="text-white font-bold text-base">{moodDetails.title_ar}</h3>
            {moodDetails.description_ar && <p className="text-tamam-text-muted text-xs line-clamp-1">{moodDetails.description_ar}</p>}
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-tamam-surface-high flex items-center justify-center text-[10px]">👤</div>
            <span className="text-tamam-text-muted text-[11px]">أنت</span>
          </div>
          <div className="space-y-1">
            {tableMeals.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-[11px]">
                <span className="text-tamam-text">{m.name}</span>
                <span className="text-tamam-green-bright font-bold">₪{Math.round(m.price * (m.quantity || 1))}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-tamam-outline/20 mt-2 pt-2 flex items-center justify-between">
            <span className="text-tamam-text-muted text-[11px]">الإجمالي التقريبي</span>
            <span className="text-tamam-text font-bold text-sm">₪{Math.round(total)}</span>
          </div>
        </div>
      </div>

      <div className="bg-tamam-teal/20 rounded-xl p-3 text-tamam-cream text-xs">
        📋 بعد الإرسال، المود بروح للمراجعة. لما يApproved بنخبرك.
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full bg-tamam-green text-tamam-ink font-bold text-base py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? 'جاري الإرسال...' : <><LogIn size={18} /> انشر المود</>}
      </button>
    </div>
  );
}

function SuccessStage({ proposalId, onViewCommunity }) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center py-10">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-20 h-20 rounded-full bg-tamam-green/20 flex items-center justify-center mb-4"
      >
        <Check size={40} className="text-tamam-green" />
      </motion.div>
      <h1 className="text-tamam-text font-bold text-xl mb-1">وصلنا مودك</h1>
      <p className="text-tamam-text-muted text-sm mb-6 px-4">بعد المراجعة بنخبرك لما يصير جاهز للنشر.</p>
      <button
        onClick={onViewCommunity}
        className="bg-tamam-surface-high text-tamam-text font-bold text-sm px-6 py-2.5 rounded-full"
      >
        شوف مودات الناس
      </button>
    </div>
  );
}