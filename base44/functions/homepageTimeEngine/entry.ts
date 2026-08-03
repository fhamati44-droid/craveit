import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ADMIN, parseJSON, extractDriveId, srvResolve, makeProxy, unwrap } from '../../shared/homepageUtils.ts';

const proxy = (base44) => makeProxy(base44);

// ===== TIME UTILITIES (Asia/Jerusalem) =====

function getJerusalemNow(simulatedTime) {
  if (simulatedTime) {
    const [h, m] = String(simulatedTime).split(':').map(Number);
    return { hour: h, minute: m, totalMinutes: h * 60 + m, weekday: new Date().getDay(), timeStr: simulatedTime, timestamp: new Date().toISOString() };
  }
  const now = new Date();
  const isoStr = now.toLocaleString('sv-SE', { timeZone: 'Asia/Jerusalem', hour12: false });
  const [datePart, timePart] = isoStr.split(' ');
  const [hour, minute] = timePart.split(':').map(Number);
  const weekday = new Date(datePart + 'T00:00:00').getDay();
  return { hour, minute, totalMinutes: hour * 60 + minute, weekday, timeStr: `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`, dateStr: datePart, timestamp: now.toISOString() };
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isPeriodActive(period, now) {
  if (!period || !period.is_active) return false;
  if (period.weekdays && period.weekdays.length && !period.weekdays.includes(now.weekday)) return false;
  const start = timeToMinutes(period.start_time);
  const end = timeToMinutes(period.end_time);
  const cur = now.totalMinutes;
  if (start <= end) return cur >= start && cur < end;
  return cur >= start || cur < end; // crosses midnight
}

// ===== IMAGE UTILITIES =====

// extractDriveId and srvResolve are imported from shared/homepageUtils.ts

// ===== SCORING =====

function computeMealScore(meal, period, alreadyShown) {
  let score = 0;
  if (meal.is_featured) score += 40;
  const cats = period.recommended_categories || [];
  if (cats.length && meal.category_name && cats.includes(meal.category_name)) score += 30;
  if (cats.length && meal.category && cats.includes(meal.category)) score += 30;
  if (meal.is_available !== false) score += 20;
  if (meal.image_url) score += 15;
  if (meal.price && (meal.description_ar || meal.description)) score += 10;
  if (meal.created_at && new Date(meal.created_at) > new Date(Date.now() - 30 * 86400000)) score += 8;
  if (alreadyShown) score -= 20;
  return score;
}

function computeSuggestionScore(set, period, alreadyShown) {
  let score = 0;
  const moods = period.recommended_moods || [];
  if (moods.length && set.mood_id && moods.includes(set.mood_id)) score += 25;
  if (set.hero_image_url) score += 15;
  if (set.display_price && set.description_ar) score += 10;
  if (set.sort_order != null) score -= Math.min(set.sort_order, 10); // lower sort_order = higher priority
  if (alreadyShown) score -= 20;
  return score;
}

// Proxy and unwrap helpers are imported from shared/homepageUtils.ts

// ===== CONTENT RESOLVERS =====

async function resolveSuggestionSets(base44, period, maxItems, packageFilter, excludeIds = []) {
  let sets = [];
  try {
    const filter = { is_active: true };
    if (packageFilter) filter.package_level = packageFilter;
    sets = await base44.asServiceRole.entities.TamamSuggestionSet.filter(filter, 'sort_order', 200);
  } catch (e) { console.error('resolveSuggestionSets error', e); }
  const excludeSet = new Set(excludeIds);
  return (sets || [])
    .filter((s) => !excludeSet.has(s.id))
    .map((s) => ({ ...s, _score: computeSuggestionScore(s, period, false) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, maxItems);
}

async function resolveMeals(base44, period, maxItems, excludeIds = [], mode = 'category') {
  const cats = period.recommended_categories || [];
  const px = proxy(base44);
  let meals = [];
  try {
    if (mode === 'random') {
      meals = unwrap(await px('getRandomMeals', { limit: maxItems * 3, excludeIds }));
    } else if (mode === 'new') {
      meals = unwrap(await px('getNewMeals', { days: 30, limit: maxItems * 3, excludeIds }));
    } else {
      meals = unwrap(await px('getMealsByCategoryNamesFlat', { names: cats, limit: maxItems * 3, excludeIds }));
    }
  } catch (e) { console.error('resolveMeals error', e); }
  return (meals || [])
    .filter((m) => m.image_url && m.is_available !== false)
    .map((m) => ({ ...m, _score: computeMealScore(m, period, false) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, maxItems);
}

async function resolveSuggestionById(base44, id) {
  if (!id) return null;
  try {
    const set = await base44.asServiceRole.entities.TamamSuggestionSet.get(id).catch(() => null);
    if (!set || !set.is_active) return null;
    return set;
  } catch { return null; }
}

async function resolveMediaById(base44, id) {
  if (!id) return null;
  try {
    return await base44.asServiceRole.entities.HomepageMedia.get(id).catch(() => null);
  } catch { return null; }
}

// Build suggestion view model
function buildSuggestionVM(set, allItems, mealMap, restMap) {
  if (!set) return null;
  const sItems = (allItems || []).filter((i) => i.suggestion_set_id === set.id);
  // Resolve image
  let image = srvResolve(set.hero_image_url);
  if (!image) {
    for (const it of sItems) {
      image = srvResolve(it.image_url);
      if (image) break;
      const m = mealMap[it.meal_id];
      if (m) { image = srvResolve(m.image_url); if (image) break; }
    }
  }
  if (!image) {
    for (const it of sItems) {
      const r = restMap[it.restaurant_id];
      if (r) { image = srvResolve(r.image_url || r.cover_url); if (image) break; }
    }
  }
  const pkg = String(set.package_level || '').toLowerCase();
  return {
    id: String(set.id),
    type: 'suggestion',
    title: set.title_ar || 'اقتراح TAMAM',
    image_url: image,
    display_price: set.display_price,
    package_level: pkg,
    package_label: pkg === 'plus' ? 'بلس' : pkg === 'mix' ? 'ميكس' : 'كلاسيك',
    route: `/tamam-order/${set.id}`,
  };
}

// ===== MAIN CONTENT BUILDER =====

async function buildTimeAwareContent(base44, period, now) {
  if (!period) return null;
  const px = proxy(base44);

  // Get slot rules for the period
  let rules = [];
  try {
    rules = await base44.asServiceRole.entities.HomepageTimeSlotRule.filter({ period_id: period.id, is_active: true }, 'priority', 100);
  } catch (e) { console.error('rules error', e); }

  const ruleByKey = {};
  (rules || []).forEach((r) => {
    if (!ruleByKey[r.slot_key]) ruleByKey[r.slot_key] = r;
  });

  // Preload suggestion items + meals + restaurants for building VMs
  const [allSets, allSuggItems] = await Promise.all([
    base44.asServiceRole.entities.TamamSuggestionSet.filter({ is_active: true }, 'sort_order', 200).catch(() => []),
    base44.asServiceRole.entities.TamamSuggestionItem.list('sort_order', 500).catch(() => []),
  ]);
  const mealIds = [...new Set((allSuggItems || []).map((i) => i.meal_id).filter(Boolean))];
  const restIds = [...new Set((allSuggItems || []).map((i) => i.restaurant_id).filter(Boolean))];
  const [mealsRes, restsRes] = await Promise.all([
    mealIds.length ? px('getMenuItemsByIds', { ids: mealIds }).then((r) => unwrap(r)).catch(() => []) : [],
    restIds.length ? px('getRestaurantsByIds', { ids: restIds }).then((r) => unwrap(r)).catch(() => []) : [],
  ]);
  const mealMap = {}; (mealsRes || []).forEach((m) => { mealMap[m.id] = m; });
  const restMap = {}; (restsRes || []).forEach((r) => { restMap[r.id] = r; });
  const setMap = {}; (allSets || []).forEach((s) => { setMap[s.id] = s; });

  const shownIds = new Set(); // Track shown content for diversity penalty
  const result = { current_period: { id: period.id, key: period.key, name_ar: period.name_ar, name_he: period.name_he, time_str: now.timeStr, recommended_categories: period.recommended_categories || [], recommended_moods: period.recommended_moods || [] } };

  // ===== HERO =====
  let hero = null;
  const heroRule = ruleByKey['homepage_hero'];
  if (heroRule) {
    const cfg = parseJSON(heroRule.settings_json, {});
    if (heroRule.selection_mode === 'manual' && heroRule.content_ids?.length) {
      const set = setMap[heroRule.content_ids[0]];
      if (set) {
        hero = buildSuggestionVM(set, allSuggItems, mealMap, restMap);
        if (hero) {
          hero.headline = cfg.headline_ar || period.name_ar;
          hero.subtitle = cfg.subtitle_ar || '';
          hero.cta_label = cfg.cta_label_ar || 'شوف الاقتراح';
          shownIds.add(hero.id);
        }
      }
    } else {
      // Automatic: pick top-scored suggestion
      const top = (await resolveSuggestionSets(base44, period, 1, null, [...shownIds]))[0];
      if (top) {
        hero = buildSuggestionVM(top, allSuggItems, mealMap, restMap);
        if (hero) {
          hero.headline = cfg.headline_ar || period.name_ar;
          hero.subtitle = cfg.subtitle_ar || '';
          hero.cta_label = cfg.cta_label_ar || 'شوف الاقتراح';
          shownIds.add(hero.id);
        }
      }
    }
  }
  result.hero = hero;

  // ===== TOP SUGGESTIONS (Classic, Mix, Plus) =====
  const topRule = ruleByKey['homepage_top_suggestions'];
  let topSuggestions = [];
  if (topRule) {
    const cfg = parseJSON(topRule.settings_json, {});
    const packages = ['classic', 'mix', 'plus'];
    for (const pkg of packages) {
      let item = null;
      const manualKey = `content_id_${pkg}`;
      if (topRule.selection_mode === 'manual' && cfg[manualKey]) {
        const set = setMap[cfg[manualKey]];
        if (set) item = buildSuggestionVM(set, allSuggItems, mealMap, restMap);
      }
      if (!item && topRule.selection_mode === 'manual' && topRule.content_ids?.length) {
        // Fallback to content_ids array
        const set = setMap[topRule.content_ids.find((id) => setMap[id]?.package_level === pkg)];
        if (set) item = buildSuggestionVM(set, allSuggItems, mealMap, restMap);
      }
      if (!item) {
        // Automatic: pick top suggestion for this package
        const top = (await resolveSuggestionSets(base44, period, 1, pkg, [...shownIds]))[0];
        if (top) item = buildSuggestionVM(top, allSuggItems, mealMap, restMap);
      }
      if (!item) {
        // Final fallback: any active suggestion
        const any = (allSets || []).find((s) => !shownIds.has(s.id));
        if (any) item = buildSuggestionVM(any, allSuggItems, mealMap, restMap);
      }
      if (item) {
        item.package = pkg;
        item.package_label = pkg === 'plus' ? 'بلس' : pkg === 'mix' ? 'ميكس' : 'كلاسيك';
        shownIds.add(item.id);
        topSuggestions.push(item);
      }
    }
  }
  result.top_suggestions = topSuggestions;

  // ===== BANNERS =====
  result.banners = [];
  for (const bannerKey of ['homepage_time_banner_1', 'homepage_time_banner_2']) {
    const rule = ruleByKey[bannerKey];
    let banner = null;
    if (rule) {
      const cfg = parseJSON(rule.settings_json, {});
      // Manual: media + text from settings
      let mediaUrl = null;
      if (cfg.media_id) {
        const media = await resolveMediaById(base44, cfg.media_id);
        if (media) mediaUrl = srvResolve(media.file_url);
      }
      if (!mediaUrl && rule.content_ids?.length) {
        const media = await resolveMediaById(base44, rule.content_ids[0]);
        if (media) mediaUrl = srvResolve(media.file_url);
      }
      // Automatic: use a meal image from the period
      if (!mediaUrl && rule.selection_mode === 'automatic') {
        const meals = await resolveMeals(base44, period, 1, [...shownIds]);
        if (meals[0]) mediaUrl = srvResolve(meals[0].image_url);
      }
      if (mediaUrl || cfg.headline_ar) {
        banner = {
          key: bannerKey,
          headline: cfg.headline_ar || '',
          subtitle: cfg.subtitle_ar || '',
          image_url: mediaUrl,
          cta_label: cfg.cta_label_ar || 'شوف',
          destination: cfg.cta_route || '/restaurants',
        };
      }
    }
    result.banners.push(banner);
  }

  // ===== CAROUSELS (max 2 active) =====
  result.carousels = [];
  for (const carouselKey of ['homepage_time_carousel_1', 'homepage_time_carousel_2']) {
    const rule = ruleByKey[carouselKey];
    if (!rule) { result.carousels.push(null); continue; }
    const cfg = parseJSON(rule.settings_json, {});
    const max = rule.max_items || cfg.max_items || 8;
    const autoMode = cfg.auto_mode || 'category';
    let meals = [];

    if (rule.selection_mode === 'manual' && rule.content_ids?.length) {
      // Manual meal IDs
      try {
        const ids = rule.content_ids.map(Number).filter(Boolean);
        if (ids.length) {
          const res = await px('getMenuItemsByIds', { ids });
          meals = unwrap(res).filter((m) => m.image_url && m.is_available !== false);
        }
      } catch (e) { console.error('carousel manual error', e); }
    } else {
      // Automatic
      meals = await resolveMeals(base44, period, max, [...shownIds], autoMode);
    }

    meals = meals.slice(0, max);
    if (meals.length >= 2) {
      meals.forEach((m) => shownIds.add(m.id));
      result.carousels.push({
        key: carouselKey,
        title: cfg.title_ar || 'مناسب لهسا',
        subtitle: cfg.subtitle_ar || '',
        meals: meals.map((m) => ({
          id: m.id, name: m.name_ar || m.name, image_url: srvResolve(m.image_url), price: m.price,
          restaurant_id: m.restaurant_id, restaurant_name: m.restaurant_name || '', is_available: m.is_available !== false,
          has_required_extras: m.has_required_extras || false,
        })),
        view_all_route: cfg.view_all_route || '/restaurants',
      });
    } else {
      result.carousels.push(null);
    }
  }

  return result;
}

// ===== AUDIT LOG =====

async function logAudit(base44, action, data = {}) {
  try {
    await base44.asServiceRole.entities.HomepageTimeAuditLog.create({
      action,
      period_id: data.period_id || '',
      slot_key: data.slot_key || '',
      admin_id: data.admin_id || '',
      admin_name: data.admin_name || '',
      previous_value: data.previous_value ? JSON.stringify(data.previous_value).substring(0, 500) : '',
      new_value: data.new_value ? JSON.stringify(data.new_value).substring(0, 500) : '',
    });
  } catch (e) { console.error('audit error', e); }
}

// ===== DEFAULT PERIODS =====

const DEFAULT_PERIODS = [
  {
    key: 'early_morning', name_ar: 'أول النهار', name_he: 'תחילת היום',
    start_time: '05:00', end_time: '10:29', priority: 5, sort_order: 1, is_active: true, is_fallback: false,
    recommended_moods: ['early-morning', 'guests-coming', 'house-needs'],
    recommended_categories: ['فطور', 'مخبوزات', 'مناقيش', 'قهوة', 'مشروبات ساخنة', 'ألبان', 'فواكه'],
  },
  {
    key: 'lunch', name_ar: 'وقت الغدا', name_he: 'שעת ארוחת הצהריים',
    start_time: '10:30', end_time: '15:59', priority: 5, sort_order: 2, is_active: true, is_fallback: false,
    recommended_moods: ['home-kitchen', 'energy', 'loved-ones'],
    recommended_categories: ['طبخات بيتية', 'دجاج', 'لحوم', 'أرز', 'سلطات', 'وجبات عائلية'],
  },
  {
    key: 'afternoon', name_ar: 'بعد الظهر', name_he: 'אחר הצהריים',
    start_time: '16:00', end_time: '18:29', priority: 5, sort_order: 3, is_active: true, is_fallback: false,
    recommended_moods: ['girls-hangout', 'guests-coming', 'loved-ones'],
    recommended_categories: ['حلويات', 'قهوة', 'آيس كريم', 'كيك', 'فواكه', 'سناك'],
  },
  {
    key: 'evening', name_ar: 'وقت العشا', name_he: 'שעת ארוחת הערב',
    start_time: '18:30', end_time: '22:59', priority: 5, sort_order: 4, is_active: true, is_fallback: false,
    recommended_moods: ['match-time', 'guys-gathering', 'loved-ones', 'house-needs'],
    recommended_categories: ['برغر', 'شاورما', 'بيتزا', 'ساندويشات', 'مشاوي', 'وجبات مشاركة'],
  },
  {
    key: 'late_night', name_ar: 'آخر الليل', name_he: 'לילה מאוחר',
    start_time: '23:00', end_time: '04:59', priority: 5, sort_order: 5, is_active: true, is_fallback: true,
    recommended_moods: ['late-night', 'house-needs', 'match-time'],
    recommended_categories: ['وجبات سريعة', 'برغر', 'بيتزا', 'شاورما', 'حلويات', 'آيس كريم', 'سناك'],
  },
];

// ===== MAIN EXPORT =====

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { action, payload = {} } = await req.json();

    // ===== PUBLIC: Get time-aware homepage content =====
    if (action === 'getTimeAwareContent') {
      const now = getJerusalemNow(payload.simulated_time);
      let periods = [];
      try { periods = await base44.asServiceRole.entities.HomepageTimePeriod.list('priority', 200); } catch (e) { console.error('periods error', e); }

      // Find active period
      let active = (periods || []).find((p) => isPeriodActive(p, now));
      if (!active) active = (periods || []).find((p) => p.is_fallback && p.is_active);
      if (!active) active = (periods || []).find((p) => p.is_active);

      if (!active) return Response.json({ data: null });

      const content = await buildTimeAwareContent(base44, active, now);
      return Response.json({ data: content });
    }

    // ===== PUBLIC: Get current period info only =====
    if (action === 'getCurrentPeriod') {
      const now = getJerusalemNow(payload.simulated_time);
      let periods = [];
      try { periods = await base44.asServiceRole.entities.HomepageTimePeriod.list('priority', 200); } catch (e) {}
      let active = (periods || []).find((p) => isPeriodActive(p, now));
      if (!active) active = (periods || []).find((p) => p.is_fallback && p.is_active);
      if (!active) active = (periods || []).find((p) => p.is_active);
      return Response.json({ data: active ? { id: active.id, key: active.key, name_ar: active.name_ar, name_he: active.name_he, time_str: now.timeStr } : null });
    }

    // ===== ADMIN ACTIONS =====
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    switch (action) {
      case 'seedDefaultPeriods': {
        const existing = await base44.asServiceRole.entities.HomepageTimePeriod.list('sort_order', 100).catch(() => []);
        if (existing && existing.length) return Response.json({ data: { seeded: false, message: 'الفترات موجودة مسبقًا' } });
        const created = await base44.asServiceRole.entities.HomepageTimePeriod.bulkCreate(DEFAULT_PERIODS);
        await logAudit(base44, 'seeded', { admin_id: user.id, admin_name: user.full_name, new_value: { count: created.length } });
        return Response.json({ data: { seeded: true, count: created.length } });
      }

      case 'getPeriods': {
        const periods = await base44.asServiceRole.entities.HomepageTimePeriod.list('sort_order', 200);
        const now = getJerusalemNow();
        return Response.json({ data: { periods: periods || [], current_period_id: (periods || []).find((p) => isPeriodActive(p, now))?.id || null, now } });
      }

      case 'savePeriod': {
        const { id, ...rest } = payload;
        if (id) {
          const prev = await base44.asServiceRole.entities.HomepageTimePeriod.get(id).catch(() => null);
          await base44.asServiceRole.entities.HomepageTimePeriod.update(id, rest);
          await logAudit(base44, 'period_updated', { period_id: id, admin_id: user.id, admin_name: user.full_name, previous_value: prev, new_value: rest });
          return Response.json({ data: { id } });
        }
        const created = await base44.asServiceRole.entities.HomepageTimePeriod.create(rest);
        await logAudit(base44, 'period_created', { period_id: created.id, admin_id: user.id, admin_name: user.full_name, new_value: rest });
        return Response.json({ data: { id: created.id } });
      }

      case 'deletePeriod': {
        await base44.asServiceRole.entities.HomepageTimePeriod.delete(payload.id);
        // Also delete slot rules for this period
        const rules = await base44.asServiceRole.entities.HomepageTimeSlotRule.filter({ period_id: payload.id }, 'priority', 100).catch(() => []);
        if (rules && rules.length) {
          await Promise.all(rules.map((r) => base44.asServiceRole.entities.HomepageTimeSlotRule.delete(r.id).catch(() => null)));
        }
        await logAudit(base44, 'period_deleted', { period_id: payload.id, admin_id: user.id, admin_name: user.full_name });
        return Response.json({ data: { deleted: true } });
      }

      case 'getSlotRules': {
        const rules = await base44.asServiceRole.entities.HomepageTimeSlotRule.filter({ period_id: payload.period_id }, 'display_order', 100);
        return Response.json({ data: rules || [] });
      }

      case 'saveSlotRule': {
        const { id, ...rest } = payload;
        if (id) {
          const prev = await base44.asServiceRole.entities.HomepageTimeSlotRule.get(id).catch(() => null);
          await base44.asServiceRole.entities.HomepageTimeSlotRule.update(id, rest);
          await logAudit(base44, 'rule_saved', { period_id: rest.period_id, slot_key: rest.slot_key, admin_id: user.id, admin_name: user.full_name, previous_value: prev, new_value: rest });
          return Response.json({ data: { id } });
        }
        const created = await base44.asServiceRole.entities.HomepageTimeSlotRule.create(rest);
        await logAudit(base44, 'rule_saved', { period_id: rest.period_id, slot_key: rest.slot_key, admin_id: user.id, admin_name: user.full_name, new_value: rest });
        return Response.json({ data: { id: created.id } });
      }

      case 'deleteSlotRule': {
        await base44.asServiceRole.entities.HomepageTimeSlotRule.delete(payload.id);
        await logAudit(base44, 'rule_deleted', { slot_key: payload.slot_key, admin_id: user.id, admin_name: user.full_name });
        return Response.json({ data: { deleted: true } });
      }

      case 'previewPeriod': {
        const period = await base44.asServiceRole.entities.HomepageTimePeriod.get(payload.period_id).catch(() => null);
        if (!period) return Response.json({ error: 'period_not_found' }, { status: 404 });
        const now = getJerusalemNow(payload.simulated_time);
        const content = await buildTimeAwareContent(base44, period, now);
        return Response.json({ data: content });
      }

      case 'getAuditLog': {
        const logs = await base44.asServiceRole.entities.HomepageTimeAuditLog.list('-created_date', 100);
        return Response.json({ data: logs || [] });
      }

      case 'getCompositionStats': {
        // Count how many time-aware slots are active across all periods
        const rules = await base44.asServiceRole.entities.HomepageTimeSlotRule.list('display_order', 500).catch(() => []);
        const activeSlots = new Set();
        (rules || []).forEach((r) => { if (r.is_active) activeSlots.add(r.slot_key); });
        const totalHomepageBlocks = 17; // from the recommended structure
        const timeAwareBlocks = activeSlots.size;
        const percentage = Math.round((timeAwareBlocks / totalHomepageBlocks) * 100);
        return Response.json({
          data: {
            total_blocks: totalHomepageBlocks,
            time_aware_blocks: timeAwareBlocks,
            percentage,
            exceeds_limit: percentage > 30,
            active_slots: [...activeSlots],
            warning_ar: percentage > 30 ? 'المحتوى المرتبط بالوقت تجاوز 30% من صفحة الهوم. خفّف عدد الأقسام المتغيّرة حتى تظل الصفحة ثابتة وواضحة.' : null,
            warning_he: percentage > 30 ? 'התוכן התלוי בזמן עבר 30% מדף הבית. יש להפחית את מספר האזורים המשתנים.' : null,
          },
        });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('homepageTimeEngine error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}