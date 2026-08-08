import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getRestaurants, getMenuItemsByRestaurant } from '@/lib/api';
import { saveDraft, loadDraft, deleteDraft, submitProposal, getConfig } from '@/lib/communityMoodApi';
import { detectQualityMode, getQualitySettings, QUALITY_LABELS_AR } from '@/lib/gameQuality';
import { track } from '@/lib/analytics';
import { resolvePublicImage } from '@/lib/imageUtils';
import { ZONES, MAX_MEALS, MIN_MEALS, categoryToZone, calculateScore, calculateCombo, calculateProgress, getStageNumber, getTransformation, canCompleteMood, isMoodFull, getTotalPrice } from '@/lib/moodGameEngine';
import MoodGameHUD from '@/components/moodgame/MoodGameHUD';
import MoodGameRestaurantSwitcher from '@/components/moodgame/MoodGameRestaurantSwitcher';
import MoodGameTable from '@/components/moodgame/MoodGameTable';
import MoodGameMealTray from '@/components/moodgame/MoodGameMealTray';
import MoodGamePowerUps from '@/components/moodgame/MoodGamePowerUps';
import MoodGameReviewSheet from '@/components/moodgame/MoodGameReviewSheet';
import MoodGamePauseSheet from '@/components/moodgame/MoodGamePauseSheet';
import MealDetailSheet from '@/components/moodgame/MealDetailSheet';
import MoodGameCompleteBar from '@/components/moodgame/MoodGameCompleteBar';

export default function MoodGame() {
  const navigate = useNavigate();

  // --- Game state ---
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuCache, setMenuCache] = useState({});
  const [menuLoading, setMenuLoading] = useState(false);
  const [placedMeals, setPlacedMeals] = useState([]);
  const [score, setScore] = useState(0);
  const [showPause, setShowPause] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [qualityMode, setQualityMode] = useState('auto');
  const [dragState, setDragState] = useState(null);
  const [detailMeal, setDetailMeal] = useState(null);
  const [hints, setHints] = useState(3);
  const [shuffles, setShuffles] = useState(2);
  const [undoStack, setUndoStack] = useState([]);
  const [config, setConfig] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastProposalId, setLastProposalId] = useState(null);
  const [lastProposalTitle, setLastProposalTitle] = useState('');
  const [lastProposalStatus, setLastProposalStatus] = useState('pending_review');
  const [lastProposalMeals, setLastProposalMeals] = useState([]);
  const [publishError, setPublishError] = useState(null);

  const qualitySettings = useMemo(() => getQualitySettings(qualityMode), [qualityMode]);
  const combo = calculateCombo(placedMeals);
  const progress = calculateProgress(placedMeals);
  const stage = getStageNumber(placedMeals);
  const transform = getTransformation(placedMeals);

  // All meals from current restaurant's menu
  const currentMeals = useMemo(() => {
    if (!selectedRestaurant || !menuCache[selectedRestaurant.id]) return [];
    return (menuCache[selectedRestaurant.id] || []).flatMap((c) => c.items || []);
  }, [selectedRestaurant, menuCache]);

  // --- Load restaurants on mount ---
  useEffect(() => {
    setQualityMode(detectQualityMode());
    getConfig().then(setConfig).catch(() => {});
    getRestaurants()
      .then((rests) => {
        setRestaurants(rests || []);
        if (rests?.length) setSelectedRestaurant(rests[0]);
      })
      .catch(() => setLoadError(true))
      .finally(() => setRestaurantsLoading(false));

    // Load draft
    loadDraft()
      .then((d) => {
        if (d && d.placed_meals?.length) {
          setPlacedMeals(d.placed_meals);
          setScore(d.score || 0);
          setHints(d.hints || 3);
          setShuffles(d.shuffles || 2);
        }
      })
      .catch(() => {});
    track('community_game_opened', {});
  }, []);

  // --- Load menu when restaurant changes ---
  useEffect(() => {
    if (!selectedRestaurant) return;
    if (menuCache[selectedRestaurant.id]) return;
    setMenuLoading(true);
    getMenuItemsByRestaurant(selectedRestaurant.id)
      .then((cats) => {
        setMenuCache((prev) => ({ ...prev, [selectedRestaurant.id]: cats || [] }));
      })
      .catch(() => {})
      .finally(() => setMenuLoading(false));
  }, [selectedRestaurant]);

  // --- Recalculate score when placedMeals changes ---
  useEffect(() => {
    setScore(calculateScore(placedMeals));
  }, [placedMeals]);

  // --- Debounced draft save ---
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (placedMeals.length === 0 && score === 0) return;
      saveDraft({
        current_stage: 'table_building',
        selected_restaurant_ids: selectedRestaurant ? [selectedRestaurant.id] : [],
        selected_meal_ids: placedMeals.map((m) => m.id),
        table_layout: placedMeals.reduce((acc, m) => { acc[m.id] = { zone: m.zone, quantity: m.quantity }; return acc; }, {}),
        package_type: transform.name,
        quality_mode: qualityMode,
      }).catch(() => {});
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [placedMeals, selectedRestaurant, qualityMode, score]);

  // --- Pause rendering when tab hidden ---
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        // Could pause animations here if using Three.js
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // --- Place a meal on the table (max 6, allow stacking per zone) ---
  const placeMeal = useCallback((meal, zoneKey) => {
    if (placedMeals.length >= MAX_MEALS) return;
    const zone = zoneKey || categoryToZone(meal.category || meal.category_name);
    setUndoStack((s) => [...s, placedMeals]);
    setPlacedMeals((prev) => {
      // Allow stacking: don't replace existing zone meals
      return [...prev, {
        id: meal.id,
        name: meal.name_ar || meal.name,
        price: meal.price,
        image_url: meal.image_url,
        restaurant_id: selectedRestaurant?.id || meal.restaurant_id,
        restaurant_name: selectedRestaurant?.name_ar || selectedRestaurant?.name || meal.restaurant_name,
        category: meal.category || meal.category_name,
        quantity: 1,
        zone,
        points: 25 + (zone === categoryToZone(meal.category || meal.category_name) ? 15 : 0),
        placed_at: Date.now(),
      }];
    });
    track('community_game_meal_placed', { meal_id: meal.id, zone });
  }, [placedMeals, selectedRestaurant]);

  // --- Remove a meal ---
  const removeMeal = useCallback((mealId) => {
    setUndoStack((s) => [...s, placedMeals]);
    setPlacedMeals((prev) => prev.filter((m) => m.id !== mealId));
    track('community_game_meal_removed', { meal_id: mealId });
  }, [placedMeals]);

  // --- Undo ---
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setPlacedMeals(prev);
    setUndoStack((s) => s.slice(0, -1));
    track('community_game_undo', {});
  }, [undoStack]);

  // --- Hint: highlight a suitable meal ---
  const useHint = useCallback(() => {
    if (hints <= 0) return;
    setHints((h) => h - 1);
    track('community_game_hint_used', {});
    // Simple hint: scroll tray to a meal that fills an empty zone
    const filledZones = new Set(placedMeals.map((m) => m.zone));
    const emptyZone = ZONES.find((z) => !filledZones.has(z.key));
    if (emptyZone && currentMeals.length) {
      const match = currentMeals.find((m) => categoryToZone(m.category || m.category_name) === emptyZone.key);
      if (match) {
        const el = document.querySelector(`[data-meal-id="${match.id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [hints, placedMeals, currentMeals]);

  // --- Shuffle: reorder meal tray ---
  const useShuffle = useCallback(() => {
    if (shuffles <= 0) return;
    setShuffles((s) => s - 1);
    setMenuCache((prev) => {
      if (!selectedRestaurant || !prev[selectedRestaurant.id]) return prev;
      const cats = [...(prev[selectedRestaurant.id] || [])];
      const shuffled = cats.map((c) => ({ ...c, items: [...(c.items || [])].sort(() => Math.random() - 0.5) }));
      return { ...prev, [selectedRestaurant.id]: shuffled };
    });
    track('community_game_shuffle_used', {});
  }, [shuffles, selectedRestaurant]);

  // --- Switch restaurant (NO table reset) ---
  const switchRestaurant = useCallback((r) => {
    setSelectedRestaurant(r);
    track('community_game_restaurant_switched', { restaurant_id: r.id });
  }, []);

  // --- Drag and drop ---
  const handleMealPointerDown = useCallback((e, meal) => {
    e.preventDefault();
    if (meal.is_available === false) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    let currentX = startX;
    let currentY = startY;

    const onMove = (ev) => {
      currentX = ev.clientX;
      currentY = ev.clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;
      if (!moved && Math.hypot(dx, dy) > 10) {
        moved = true;
        setDragState({ meal, x: currentX, y: currentY });
      }
      if (moved) {
        setDragState((s) => ({ ...s, x: currentX, y: currentY }));
      }
    };

    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);

      if (moved) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const zoneEl = el?.closest('[data-drop-zone]');
        if (zoneEl) {
          placeMeal(meal, zoneEl.dataset.dropZone);
        }
        setDragState(null);
      } else {
        // Tap — open detail
        setDetailMeal({ ...meal, restaurant_name: selectedRestaurant?.name_ar || selectedRestaurant?.name });
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }, [placeMeal, selectedRestaurant]);

  // --- Publish proposal ---
  const submittingRef = useRef(false);
  const handlePublish = useCallback(async ({ title_ar, description_ar }) => {
    setPublishError(null);
    if (!placedMeals.length) { setPublishError('لازم تختار وجبة واحدة على الأقل'); return; }
    // Guard against double-submit (double-click / effect re-fire)
    if (submittingRef.current) return;
    // Safe food ID extraction — drop any undefined/null IDs
    const mealIds = placedMeals.map((m) => m.id).filter(Boolean);
    if (!mealIds.length) {
      console.error('[MoodGame] no valid meal IDs in placedMeals', placedMeals);
      setPublishError('في وجبة بدون معرف، شيلها وحاول مرة ثانية');
      return;
    }
    // Restaurant is OPTIONAL for Community Mood creation — do NOT block save
    const restaurantIds = [...new Set(placedMeals.map((m) => m.restaurant_id))].filter(Boolean);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        // Preserve the entered name + selected foods for after login
        try { localStorage.setItem('tamam_mood_pending_name', title_ar || ''); } catch {}
        await base44.auth.redirectToLogin('/mood-game');
        return;
      }
      const raw = await submitProposal({
        mood_title_ar: title_ar,
        description_ar: description_ar || null,
        restaurant_ids: restaurantIds,
        meal_ids: mealIds,
        table_layout: placedMeals.reduce((acc, m) => { acc[m.id] = { zone: m.zone, quantity: m.quantity }; return acc; }, {}),
        package_type: transform.name,
        cover_layout: 'table_top',
        meal_snapshots: placedMeals.map((m) => ({ id: m.id, name: m.name, price: m.price, image_url: m.image_url, category: m.category })),
        restaurant_snapshots: restaurants.filter((r) => restaurantIds.includes(r.id)).map((r) => ({ id: r.id, name: r.name_ar || r.name, image_url: r.image_url })),
      });
      // Detect the REAL response shape — backend returns { data: { id, status } }
      const proposal = raw?.data ?? raw?.proposal ?? raw;
      if (!proposal?.id) {
        console.error('[MoodGame] submitProposal returned no id', { raw });
        setPublishError(raw?.error || raw?.message || 'ما قدرنا نحفظ المود، جرّب مرة ثانية');
        return;
      }
      await deleteDraft();
      try { localStorage.removeItem('tamam_mood_pending_name'); } catch {}
      track('community_mood_submitted', { proposal_id: proposal.id });
      setLastProposalId(proposal.id);
      setLastProposalTitle(title_ar);
      setLastProposalStatus(proposal.status || 'pending_review');
      setLastProposalMeals(placedMeals);
      setShowReview(false);
      setShowSuccess(true);
    } catch (err) {
      // Do NOT swallow the error — log the real backend response for debugging
      console.error('[MoodGame] submitProposal failed', err);
      const msg = err?.error === 'auth_required' ? 'سجّل أولًا' : (err?.message || 'صار خطأ بالنشر، جرّب مرة ثانية');
      setPublishError(msg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [placedMeals, restaurants, transform, navigate]);

  // --- Start over ---
  const startOver = useCallback(() => {
    setPlacedMeals([]);
    setScore(0);
    setHints(3);
    setShuffles(2);
    setUndoStack([]);
    setShowPause(false);
    deleteDraft().catch(() => {});
    track('community_game_restarted', {});
  }, []);

  // --- Save & exit ---
  const saveAndExit = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-tamam-bg text-tamam-text font-tamam flex flex-col" dir="rtl" style={{ maxWidth: '430px', margin: '0 auto' }}>
      {/* HUD */}
      <MoodGameHUD
        placedMeals={placedMeals}
        score={score}
        combo={combo}
        onPause={() => setShowPause(true)}
      />

      {/* Restaurant Switcher */}
      <MoodGameRestaurantSwitcher
        restaurants={restaurants}
        selectedId={selectedRestaurant?.id}
        onSelect={switchRestaurant}
        loading={restaurantsLoading}
      />

      {/* Game area — table + power-ups */}
      <div className="relative flex-1 flex flex-col">
        <MoodGamePowerUps
          hints={hints}
          shuffles={shuffles}
          onHint={useHint}
          onShuffle={useShuffle}
          onUndo={undo}
          canUndo={undoStack.length > 0}
        />
        <MoodGameTable
          placedMeals={placedMeals}
          dragActive={!!dragState}
          onRemoveMeal={removeMeal}
        />
      </div>

      {/* Meal Tray — bottom */}
      <MoodGameMealTray
        meals={currentMeals}
        restaurant={selectedRestaurant}
        loading={menuLoading}
        dragMealId={dragState?.meal?.id}
        onMealPointerDown={handleMealPointerDown}
      />

      {/* Drag overlay */}
      {dragState && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: dragState.x - 32, top: dragState.y - 32, width: 64, height: 64 }}
        >
          <DragOverlay meal={dragState.meal} />
        </div>
      )}

      {/* Persistent completion CTA — enabled after 1st food, blocks at 6 */}
      <MoodGameCompleteBar
        count={placedMeals.length}
        canComplete={canCompleteMood(placedMeals)}
        isFull={isMoodFull(placedMeals)}
        onComplete={() => setShowReview(true)}
      />

      {/* Meal detail sheet (tap to add) */}
      <MealDetailSheet
        meal={detailMeal}
        open={!!detailMeal}
        onClose={() => setDetailMeal(null)}
        onAddToTable={() => { if (detailMeal) { placeMeal(detailMeal); setDetailMeal(null); } }}
        inTable={detailMeal && placedMeals.some((m) => m.id === detailMeal.id)}
        onRemoveFromTable={() => { if (detailMeal) { removeMeal(detailMeal.id); setDetailMeal(null); } }}
      />

      {/* Review / publish sheet */}
      <MoodGameReviewSheet
        open={showReview}
        placedMeals={placedMeals}
        onClose={() => { setShowReview(false); setPublishError(null); }}
        onSubmit={handlePublish}
        submitting={submitting}
        draftSaving={placedMeals.length > 0}
        error={publishError}
      />

      {/* Pause sheet */}
      <MoodGamePauseSheet
        open={showPause}
        qualityMode={qualityMode}
        onClose={() => setShowPause(false)}
        onSetQuality={(m) => { setQualityMode(m); }}
        onSaveExit={saveAndExit}
        onStartOver={startOver}
        onExit={() => navigate('/')}
      />

      {/* Success overlay — after publish */}
      <AnimatePresence>
        {showSuccess && (
          <>
            <div className="fixed inset-0 bg-tamam-ink/80 z-50" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              dir="rtl"
            >
              <div className="bg-tamam-surface rounded-3xl p-6 max-w-[340px] w-full text-center border border-tamam-green/30" style={{ boxShadow: '0 0 40px rgba(110,191,95,0.25)' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring' }} className="w-16 h-16 rounded-full bg-tamam-green/20 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-tamam-green-bright" />
                </motion.div>
                <h2 className="text-tamam-text font-bold text-lg mb-1">تم حفظ مودك 🎉</h2>
                <div className="bg-tamam-surface-high rounded-xl p-3 mb-4 text-right">
                  <p className="text-tamam-text font-bold text-sm mb-1 truncate">{lastProposalTitle || 'مودك'}</p>
                  <p className="text-tamam-text-muted text-[11px] mb-2">{lastProposalMeals.length} وجبة</p>
                  {lastProposalStatus === 'pending_review' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-tamam-gold bg-tamam-gold/15 px-2 py-0.5 rounded-full">بانتظار النشر</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-tamam-green-bright bg-tamam-green/15 px-2 py-0.5 rounded-full">منشور</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => navigate(`/account/community-moods/${lastProposalId}`)} className="w-full bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl">شوف موداتي</button>
                  <button onClick={() => navigate('/mood-game')} className="w-full bg-tamam-surface-high text-tamam-text font-bold text-sm py-3 rounded-xl">ارجع للعبة</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DragOverlay({ meal }) {
  const img = resolvePublicImage(meal.image_url, null);
  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1.1 }}
      className="w-full h-full rounded-full overflow-hidden border-2 border-tamam-green-bright"
      style={{ boxShadow: '0 8px 24px rgba(137,219,120,0.4)' }}
    >
      {img ? (
        <img src={img} alt="" className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full bg-tamam-surface-high flex items-center justify-center text-xl">🍽️</div>
      )}
    </motion.div>
  );
}