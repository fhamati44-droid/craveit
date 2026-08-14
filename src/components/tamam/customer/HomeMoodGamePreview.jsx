import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getRestaurants, getMenuItemsByRestaurant } from '@/lib/api';
import { ZONES, categoryToZone } from '@/lib/moodGameEngine';
import { resolvePublicImage } from '@/lib/imageUtils';
import { track } from '@/lib/analytics';

/**
 * HomeMoodGamePreview — a lightweight interactive entry into the existing
 * Mood Game, shown directly on the customer Home. Reuses the game's table
 * zones, real meal data, and real meal images. The first tap places a real
 * meal on the table (no navigation); "كمّل مودك" transfers the selection to
 * /mood-game via router state. Not a second game.
 */

const GREETING = {
  morning: 'صباح الخير، نبلّش مود خفيف؟',
  lunch: 'وقت الغدا… شو أول وجبة بتحطها عالطاولة؟',
  evening: 'سهرة اليوم بدها طاولة مرتبة.',
  late: 'جوعان ومش عارف شو تختار؟ ابدأ بوجبة وإحنا بنكمل معك.',
};
const FEEDBACK = ['بداية بتفتح النفس!', 'اختيار قوي.', 'هيك بلّش المود 🔥', 'تمام… نكمّل الطاولة؟'];
const SURPRISE_FB = 'اخترنالك بداية… كمّلها بطريقتك.';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default function HomeMoodGamePreview({ timeData }) {
  const navigate = useNavigate();
  const [meals, setMeals] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [selected, setSelected] = useState(null);
  const [zone, setZone] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [changing, setChanging] = useState(false);
  const [inView, setInView] = useState(false);

  const ref = useRef(null);
  const viewedRef = useRef(false);

  const prefersReduced = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const timeSlot = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 11 && h < 16) return 'lunch';
    if (h >= 16 && h < 22) return 'evening';
    return 'late';
  }, []);
  const periodName = timeData?.current_period?.name_ar;

  // Track visibility — pause nonessential animations when off-screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const loadMeals = useCallback(async () => {
    setStatus('loading');
    try {
      const rests = await getRestaurants();
      const top = (rests || []).slice(0, 3);
      const catsByRest = await Promise.all(top.map((r) => getMenuItemsByRestaurant(r.id).catch(() => [])));
      const eligible = [];
      top.forEach((r, i) => {
        for (const cat of (catsByRest[i] || [])) {
          for (const it of (cat.items || [])) {
            if (it.is_available === false) continue;
            if (!(it.name_ar || it.name)) continue;
            if (!resolvePublicImage(it.image_url, null)) continue; // require a real image
            eligible.push({
              id: it.id,
              name: it.name_ar || it.name,
              price: it.price,
              image_url: it.image_url,
              category: cat.name || cat.name_ar || it.category || '',
              restaurant_id: r.id,
              restaurant_name: r.name_ar || r.name,
            });
            if (eligible.length >= 6) break;
          }
          if (eligible.length >= 6) break;
        }
      });
      const seen = new Set();
      const dedup = eligible.filter((m) => !seen.has(m.id) && seen.add(m.id));
      setMeals(dedup.slice(0, 4));
      if (!dedup.length) track('home_game_preview_fallback_shown', { reason: 'no_eligible_meals', time_period: timeSlot });
      setStatus(dedup.length ? 'ready' : 'empty');
    } catch (e) {
      setStatus('error');
    }
  }, [timeSlot]);

  useEffect(() => { if (inView) loadMeals(); }, [inView, loadMeals]);

  useEffect(() => {
    if (inView && status === 'ready' && !viewedRef.current) {
      viewedRef.current = true;
      track('home_game_preview_viewed', { time_period: timeSlot });
    }
  }, [inView, status, timeSlot]);

  const vibrate = () => {
    if (prefersReduced) return;
    try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); } catch {}
  };

  const place = (meal, interactionType = 'tap', fb = null) => {
    const z = categoryToZone(meal.category);
    setSelected(meal);
    setZone(z);
    setChanging(false);
    setFeedback(fb || pick(FEEDBACK));
    vibrate();
    track('home_game_meal_selected', { meal_id: meal.id, restaurant_id: meal.restaurant_id, time_period: timeSlot, interaction_type: interactionType });
  };

  const surprise = () => {
    if (!meals.length) return;
    const m = pick(meals);
    place(m, 'surprise', SURPRISE_FB);
    track('home_game_surprise_used', { meal_id: m.id, restaurant_id: m.restaurant_id, time_period: timeSlot });
  };

  const changeMeal = () => {
    setSelected(null); setZone(null); setFeedback(null); setChanging(true);
    track('home_game_meal_changed', { time_period: timeSlot });
  };
  const removeMeal = () => {
    setSelected(null); setZone(null); setFeedback(null); setChanging(false);
    track('home_game_meal_removed', { time_period: timeSlot });
  };

  const continueToGame = () => {
    if (!selected) return;
    track('home_game_continue_clicked', { meal_id: selected.id, restaurant_id: selected.restaurant_id, time_period: timeSlot });
    track('home_game_full_opened', { source: 'homepage_game_preview' });
    navigate('/mood-game', {
      state: {
        source: 'homepage_game_preview',
        seedMealIds: [selected.id],
        restaurantId: selected.restaurant_id,
        initialZone: zone,
        snapshot: { id: selected.id, name: selected.name, price: selected.price, image_url: selected.image_url, category: selected.category, restaurant_name: selected.restaurant_name },
      },
    });
  };

  const openCommunity = () => { track('home_community_mood_opened', { source: 'home_game_preview' }); navigate('/community-moods'); };
  const openFood = () => navigate('/tamam-suggestions');

  return (
    <section ref={ref} className="px-4 pt-3 pb-1" dir="rtl">
      <div className="relative rounded-2xl overflow-hidden border border-tamam-outline/30 bg-tamam-surface"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 12%, rgba(137,219,120,0.07) 0%, transparent 55%), radial-gradient(ellipse at 50% 0%, rgba(234,196,92,0.05) 0%, transparent 60%)' }}>

        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-tamam-gold text-[10px] font-bold tracking-wide">
              <span className="material-symbols-outlined text-[13px]">auto_awesome</span>TAMAM مود جيم
            </span>
            {periodName && (
              <span className="bg-tamam-surface-high text-tamam-green-bright text-[9px] font-bold rounded-full px-2 py-0.5">{periodName}</span>
            )}
          </div>
          <h2 className="text-tamam-text font-bold text-[17px] leading-snug mt-1.5">{GREETING[timeSlot]}</h2>
          <p className="text-tamam-text-muted text-[11px] leading-snug mt-0.5">اختار أول وجبة، وإحنا بنكملها معك.</p>
        </div>

        {/* Body */}
        {status === 'loading' ? (
          <div className="px-4 pb-4">
            <div className="mx-auto h-[140px] w-[140px] rounded-full skeleton-t" />
            <div className="flex gap-2 mt-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="flex-shrink-0 w-[72px] h-[72px] skeleton-t rounded-xl" />)}
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="text-center py-6 px-4">
            <p className="text-tamam-text-muted text-[11px] mb-3">ما قدرنا نحمّل الوجبات هسا.</p>
            <button onClick={loadMeals} className="h-10 px-4 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-xs active:scale-95 transition-transform">حاول مرة ثانية</button>
          </div>
        ) : status === 'empty' ? (
          <div className="text-center py-6 px-4">
            <p className="text-tamam-text font-bold text-sm mb-1">اللعبة بتجهزلك اختيارات</p>
            <p className="text-tamam-text-muted text-[11px] mb-3 leading-snug">تصفّح الأكل المتوفر هسا، واختار وجبة نبلّش فيها.</p>
            <button onClick={openFood} className="h-11 px-5 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform">شوف الأكل</button>
          </div>
        ) : (
          <div className="px-4 pb-3">
            <PreviewTable selected={selected} zone={zone} inView={inView} prefersReduced={prefersReduced} />
            <PreviewTray meals={meals} selected={selected} onPick={(m) => place(m, 'tap')} />

            {/* Actions */}
            {!selected ? (
              <div className="mt-3 space-y-2">
                <p className="text-tamam-text-muted text-[11px] text-center">{changing ? 'اختار وجبة تانية' : 'شو أول وجبة بتحطها؟'}</p>
                <div className="flex items-center gap-2">
                  <button onClick={surprise} className="flex-1 h-11 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>فاجئني
                  </button>
                  <button onClick={openCommunity} className="flex-1 h-11 rounded-xl bg-transparent text-tamam-green-bright font-bold text-sm active:scale-95 transition-transform">شوف مودات الناس</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-tamam-green-bright text-[12px] font-bold text-center">{feedback}</p>
                <p className="text-tamam-text-muted text-[10px] text-center leading-snug">كمّل الطاولة، شاركها، وخلي الناس تتفاعل معها.</p>
                <button onClick={continueToGame} className="w-full h-12 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>كمّل مودك
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={changeMeal} className="flex-1 h-10 rounded-xl bg-tamam-surface-high text-tamam-text font-bold text-xs active:scale-95 transition-transform">غيّر الوجبة</button>
                  <button onClick={removeMeal} className="flex-1 h-10 rounded-xl bg-transparent text-tamam-text-muted font-bold text-xs active:scale-95 transition-transform">شيلها</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Compact table reusing the game's ZONES + visual language ----
function PreviewTable({ selected, zone, inView, prefersReduced }) {
  const glow = selected
    ? '0 0 26px rgba(137,219,120,0.30), inset 0 0 40px rgba(0,0,0,0.6)'
    : 'inset 0 0 40px rgba(0,0,0,0.6)';
  return (
    <div className="flex items-center justify-center" style={{ height: 140 }}>
      <div className="relative" style={{ width: 'min(150px, 42vw)', aspectRatio: '1 / 1' }}>
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 50% 38%, #3a2a1e 0%, #241a12 55%, #14100b 100%)', border: '2px solid rgba(137,219,120,0.4)', boxShadow: glow }} />
        {ZONES.map((z) => {
          const xp = Math.cos((z.angle - 90) * Math.PI / 180) * 27.86;
          const yp = Math.sin((z.angle - 90) * Math.PI / 180) * 27.86;
          const isSel = selected && zone === z.key;
          return (
            <div key={z.key} className="absolute" style={{ left: `calc(50% + ${xp}%)`, top: `calc(50% + ${yp}%)`, width: '24%', aspectRatio: '1 / 1', transform: 'translate(-50%,-50%)' }}>
              {isSel ? <PlacedMini meal={selected} prefersReduced={prefersReduced} /> : <EmptyZone zone={z} active={inView && !prefersReduced} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyZone({ zone, active }) {
  return (
    <div className={`w-full h-full rounded-full flex items-center justify-center border-2 border-dashed border-tamam-outline/40 bg-tamam-surface-low/40 ${active ? 'mg-breathe' : ''}`}>
      <span className="text-base opacity-60">{zone.icon}</span>
    </div>
  );
}

function PlacedMini({ meal, prefersReduced }) {
  const img = resolvePublicImage(meal.image_url, null);
  return (
    <motion.div
      initial={prefersReduced ? false : { scale: 0, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={prefersReduced ? { duration: 0.01 } : { type: 'spring', damping: 16, stiffness: 240 }}
      className="relative w-full h-full"
    >
      <div className="w-full h-full rounded-full" style={{ boxShadow: '0 0 16px rgba(137,219,120,0.45)' }}>
        {img ? (
          <img src={img} alt={meal.name} className="w-full h-full rounded-full object-cover border-2" style={{ borderColor: '#89DB78' }} loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full rounded-full bg-tamam-surface-high flex items-center justify-center text-lg border-2" style={{ borderColor: '#89DB78' }}>🍽️</div>
        )}
      </div>
      {!prefersReduced && (
        <motion.div initial={{ y: 0, opacity: 0, scale: 0.6 }} animate={{ y: -14, opacity: [0, 1, 0], scale: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none text-sm">✨</motion.div>
      )}
    </motion.div>
  );
}

// ---- Compact real-meal tray ----
function PreviewTray({ meals, selected, onPick }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mt-1">
      <AnimatePresence>
        {meals.map((m) => {
          const isSel = selected?.id === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m)}
              aria-label={m.name}
              className="flex-shrink-0 w-[72px] rounded-xl overflow-hidden border-2 bg-tamam-surface text-right active:scale-95 transition-transform"
              style={{ borderColor: isSel ? '#89DB78' : 'rgba(64,73,60,0.3)', boxShadow: isSel ? '0 0 14px rgba(137,219,120,0.35)' : undefined }}
            >
              <div className="relative h-14 bg-tamam-surface-low">
                <img src={resolvePublicImage(m.image_url, null) || ''} alt={m.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" draggable={false} />
              </div>
              <div className="p-1">
                <p className="text-tamam-text text-[10px] font-bold leading-tight line-clamp-1">{m.name}</p>
                <p className="text-tamam-text-muted text-[9px] leading-tight line-clamp-1">{m.restaurant_name}</p>
              </div>
            </button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}