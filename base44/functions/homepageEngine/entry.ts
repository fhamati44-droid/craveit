import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ADMIN = (user) => user && user.role === 'admin';

function parseJSON(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function extractDriveId(value) {
  if (!value) return null;
  const text = String(value).trim();
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) { const m = text.match(p); if (m && m[1]) return m[1]; }
  return null;
}

const DRIVE_ENTITIES = [
  { entity: 'TamamSuggestionSet', field: 'hero_image_url', label: 'اقتراح' },
  { entity: 'TamamMood', field: 'image_url', label: 'مود' },
  { entity: 'GroupDeal', field: 'hero_image', label: 'عرض جماعي' },
];

const ROUTE_MAP = {
  tamam_game: '/tamam-game',
  suggestions_all: '/tamam-suggestions?package=all',
  suggestions_classic: '/tamam-suggestions?package=classic',
  suggestions_mix: '/tamam-suggestions?package=mix',
  suggestions_plus: '/tamam-suggestions?package=plus',
  restaurants_all: '/restaurants',
  deals_all: '/deals',
  orders: '/orders',
  rewards: '/account/rewards',
};

function resolveRouteString(key, params) {
  if (key && ROUTE_MAP[key]) return ROUTE_MAP[key];
  if (key === 'custom' && params) {
    if (typeof params === 'string') { try { const p = JSON.parse(params); return p.path || params; } catch { return params; } }
    if (typeof params === 'object' && params.path) return params.path;
  }
  return '/tamam-game';
}

function normalizePkg(value) {
  const n = String(value || '').trim().toLowerCase();
  if (n === 'classic' || n === 'كلاسيك') return 'classic';
  if (n === 'mix' || n === 'ميكس') return 'mix';
  if (['plus', 'بلس', 'max', 'ماكس', 'premium'].includes(n)) return 'plus';
  return 'all';
}

async function buildPublishedHomepage(base44) {
  const PKGS = ['classic', 'mix', 'plus'];
  const PKG_LABEL = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };
  const PKG_EXPLAIN = { classic: 'وجبة مناسبة ليوم عادي', mix: 'تشكيلة أكبر لمزاجك', plus: 'خيار فخم لمناسباتك' };

  const versions = await base44.asServiceRole.entities.HomepageVersion.filter({ is_active: true });
  const active = (versions && versions[0]) || null;
  const snapshot = active ? parseJSON(active.snapshot_json, null) : null;
  const sections = snapshot ? (snapshot.sections || []) : [];
  const allItems = snapshot ? (snapshot.items || []) : [];
  const now = Date.now();
  const vis = (s) => s && s.enabled && (!s.starts_at || new Date(s.starts_at).getTime() <= now) && (!s.ends_at || new Date(s.ends_at).getTime() >= now);
  const sectionByKey = (key) => sections.find((s) => s.section_key === key && vis(s));
  const sectionByType = (type) => sections.find((s) => s.section_type === type && vis(s));
  const itemsFor = (sid) => (sid ? allItems.filter((it) => it.homepage_section_id === sid && it.enabled !== false) : []);

  // Resolve media map (service role — avoids 403 for public)
  const mediaIds = [...new Set(allItems.map((it) => it.media_id).filter(Boolean))];
  const mediaMap = {};
  if (mediaIds.length) {
    try { const all = await base44.asServiceRole.entities.HomepageMedia.list('-created_date', 500); (all || []).forEach((m) => { mediaMap[m.id] = m; }); } catch (e) { console.error('media map error', e); }
  }

  // HERO
  let hero = null;
  const heroSection = sectionByKey('hero') || sectionByType('hero');
  if (heroSection) {
    const settings = parseJSON(heroSection.settings_json, {});
    const mediaItem = itemsFor(heroSection.id).find((it) => it.item_type === 'media');
    const media = mediaItem && mediaItem.media_id ? mediaMap[mediaItem.media_id] : null;
    const poster = settings.poster_media_id ? mediaMap[settings.poster_media_id] : null;
    hero = {
      media_kind: settings.media_kind || 'image',
      file_url: media ? media.file_url : null,
      poster_url: poster ? (poster.file_url || poster.poster_image_url) : null,
      headline: settings.headline || heroSection.title || 'محتار شو تاكل اليوم؟',
      supporting_text: settings.supporting_text || heroSection.subtitle || 'خلّي TAMAM يساعدك تختار حسب مودك.',
      cta_label: settings.cta_label || 'ساعدني أختار',
      cta_route: resolveRouteString(settings.cta_route_key, settings.cta_route_params),
    };
  }

  // Active suggestion sets grouped by package
  let activeSets = [];
  try { activeSets = await base44.asServiceRole.entities.TamamSuggestionSet.filter({ is_active: true }, 'sort_order', 500); } catch (e) { console.error('sets error', e); }
  const setsByPkg = {};
  (activeSets || []).forEach((s) => { const p = normalizePkg(s.package_level); if (p !== 'all') (setsByPkg[p] = setsByPkg[p] || []).push(s); });

  // PACKAGE CARDS
  const pkgSection = sectionByKey('suggestions') || sectionByType('suggestions');
  const pkgSettings = pkgSection ? parseJSON(pkgSection.settings_json, {}) : {};
  const packages = PKGS.map((p) => {
    const featuredSet = (setsByPkg[p] || [])[0] || null;
    return {
      key: p,
      label: PKG_LABEL[p],
      image_url: pkgSettings[`package_image_${p}`] || (featuredSet && featuredSet.hero_image_url) || null,
      display_price: featuredSet ? featuredSet.display_price : null,
      explanation: pkgSettings[`package_explanation_${p}`] || PKG_EXPLAIN[p],
      route: `/tamam-suggestions?package=${p}`,
    };
  });

  // MOST ORDERED
  const moSection = sectionByKey('most_ordered') || sectionByType('most_ordered');
  const moSettings = moSection ? parseJSON(moSection.settings_json, {}) : {};
  let mostOrdered = [];
  try {
    if (moSection && moSection.selection_mode === 'manual') {
      const mealIds = itemsFor(moSection.id).filter((it) => it.item_type === 'meal').map((it) => it.meal_id).filter(Boolean);
      if (mealIds.length) {
        const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getMenuItemsByIds', payload: { ids: mealIds } });
        const meals = (res && (res.data?.data || res.data)) || [];
        const restIds = [...new Set(meals.map((m) => m.restaurant_id).filter(Boolean))];
        const restMap = {};
        if (restIds.length) { const r2 = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getRestaurantsByIds', payload: { ids: restIds } }); (r2?.data?.data || []).forEach((r) => { restMap[r.id] = r; }); }
        mostOrdered = meals.map((m) => ({
          meal_id: m.id, name: m.name_ar || m.name, image_url: m.image_url, price: m.price,
          restaurant_id: m.restaurant_id, restaurant_name: restMap[m.restaurant_id]?.name_ar || restMap[m.restaurant_id]?.name || '',
          is_available: m.is_available !== false,
        })).filter((m) => m.restaurant_name);
      }
    } else {
      const days = moSettings.report_days || 30;
      const limit = (moSection && moSection.max_items) || 8;
      const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getMostOrderedMeals', payload: { days, limit } });
      const ranked = (res && (res.data?.data || res.data)) || [];
      mostOrdered = ranked.map((r) => ({
        meal_id: r.meal_id, name: r.meal?.name_ar || r.meal?.name || r.name, image_url: r.meal?.image_url, price: r.meal?.price || r.price,
        restaurant_id: r.kitchen_id, restaurant_name: r.restaurant?.name_ar || r.restaurant?.name || '',
        count: r.count, is_available: r.meal ? r.meal.is_available !== false : true,
      })).filter((m) => m.meal_id && m.restaurant_name);
    }
  } catch (e) { console.error('mostOrdered error', e); }

  // POPULAR CATEGORIES with real meals underneath
  const pcSection = sectionByKey('popular_categories') || sectionByType('popular_categories') || sectionByKey('popular_meals') || sectionByType('popular_meals');
  let popularCategories = [];
  try {
    if (pcSection) {
      const catNames = itemsFor(pcSection.id).filter((it) => it.item_type === 'category').map((it) => it.category_id).filter(Boolean);
      if (catNames.length) {
        const perCat = pcSection.max_items || 6;
        const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getMealsByCategoryNames', payload: { names: catNames, perCategory: perCat } });
        const cats = (res && (res.data?.data || res.data)) || [];
        popularCategories = cats.map((c) => ({
          name: c.name,
          meals: c.meals.map((m) => ({
            meal_id: m.id, name: m.name_ar || m.name, image_url: m.image_url, price: m.price,
            restaurant_id: m.restaurant_id, restaurant_name: m.restaurant_name, is_available: m.is_available !== false,
          })),
        })).filter((c) => c.meals.length > 0);
      }
    }
  } catch (e) { console.error('popularCategories error', e); }

  // FEATURED RESTAURANTS
  const frSection = sectionByKey('featured_restaurants') || sectionByType('featured_restaurants');
  let featuredRestaurants = [];
  try {
    if (frSection && frSection.selection_mode === 'manual') {
      const restIds = itemsFor(frSection.id).filter((it) => it.item_type === 'restaurant').map((it) => it.restaurant_id).filter(Boolean);
      if (restIds.length) { const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getRestaurantsByIds', payload: { ids: restIds } }); featuredRestaurants = (res?.data?.data || []).slice(0, frSection.max_items || 6); }
    } else {
      const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getRestaurants' });
      featuredRestaurants = ((res?.data?.data) || []).slice(0, (frSection && frSection.max_items) || 6);
    }
  } catch (e) { console.error('featuredRestaurants error', e); }

  // ---- Curated meal sections (manual or automatic) with duplicate exclusion ----
  const shownMealIds = new Set();
  const CURATED_DEFAULTS = {
    tamam_picks: { title: 'اختيارات تستاهل التجربة', subtitle: 'وجبات اخترناها بعناية من منيوهات TAMAM.', badge: 'اختيار TAMAM', route: '/restaurants' },
    family: { title: 'للعيلة واللّمات', subtitle: 'وجبات بتكفي الكل بدون ما تحتار.', badge: null, route: '/restaurants' },
    quick: { title: 'سريع وخفيف', subtitle: 'للجوع السريع أو لما بدك إشي خفيف.', badge: null, route: '/restaurants' },
    home_style: { title: 'أكل بيتي', subtitle: 'لما نفسك بأكلة بتذكّرك بالبيت.', badge: null, route: '/restaurants' },
    new: { title: 'جديد على TAMAM', subtitle: 'وجبات انضافت جديد وتستاهل تنجرّب.', badge: 'جديد', route: '/restaurants' },
    desserts: { title: 'حلويات وتسالي', subtitle: 'كمّل الطلب بإشي حلو أو تسالي للجلسة.', badge: null, route: '/restaurants' },
    lunch: { title: 'غدا اليوم', subtitle: 'وجبات مشبعة للغدا بدون ما تضيع وقت بالاختيار.', badge: null, route: '/restaurants' },
    complete_order: { title: 'كمّل طلبك', subtitle: 'مشروب، تحلاية أو إضافة صغيرة بتكمّل الوجبة.', badge: null, route: '/restaurants' },
  };
  const CARD_VARIANT = { tamam_picks: 'feature', lunch: 'feature', desserts: 'compact', complete_order: 'compact', new: 'compact' };

  function withinActiveHours(cfg) {
    const ah = cfg && cfg.active_hours;
    if (!ah || typeof ah !== 'string' || !ah.includes('-')) return true;
    try {
      const [from, to] = ah.split('-').map((s) => s.trim());
      const curStr = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jerusalem', hour12: false });
      const cur = curStr.slice(0, 5);
      if (from <= to) return cur >= from && cur < to;
      return cur >= from || cur < to;
    } catch { return true; }
  }

  async function resolveCurated(sectionKey) {
    const sec = sectionByKey(sectionKey);
    if (!sec) return null;
    const cfg = parseJSON(sec.settings_json, {});
    if (!withinActiveHours(cfg)) return null;
    const max = sec.max_items || 8;
    const defaults = CURATED_DEFAULTS[sectionKey] || {};
    const manualMealItems = itemsFor(sec.id).filter((it) => it.item_type === 'meal' && it.meal_id);
    let meals = [];
    try {
      if (sec.selection_mode === 'manual' && manualMealItems.length) {
        const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getMealsByIdsResolved', payload: { ids: manualMealItems.map((it) => it.meal_id) } });
        meals = (res?.data?.data || []).filter((m) => m.is_available);
        meals.forEach((m) => shownMealIds.add(m.id)); // manual = pinned, bypass exclusion
      } else {
        const autoMode = cfg.auto_mode || 'category';
        const exclude = [...shownMealIds];
        if (autoMode === 'category') {
          const names = (cfg.category_names || itemsFor(sec.id).filter((it) => it.item_type === 'category').map((it) => it.category_id) || []).filter(Boolean);
          const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getMealsByCategoryNamesFlat', payload: { names, limit: max, excludeIds: exclude } });
          meals = res?.data?.data || [];
        } else if (autoMode === 'new') {
          const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getNewMeals', payload: { days: cfg.new_days || 30, limit: max, excludeIds: exclude } });
          meals = res?.data?.data || [];
        } else if (autoMode === 'random') {
          const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getRandomMeals', payload: { limit: max, excludeIds: exclude } });
          meals = res?.data?.data || [];
        }
        meals.forEach((m) => shownMealIds.add(m.id));
      }
    } catch (e) { console.error('resolveCurated error', sectionKey, e); }
    meals = meals.slice(0, max);
    if (meals.length < 2) return null; // hide section if fewer than 2 valid meals
    const catNames = cfg.category_names || itemsFor(sec.id).filter((it) => it.item_type === 'category').map((it) => it.category_id) || [];
    const viewAll = sec.view_all_route || (catNames.length ? `/restaurants?category=${encodeURIComponent(catNames[0])}` : defaults.route);
    return {
      key: sectionKey,
      title: sec.title || defaults.title,
      subtitle: sec.subtitle || defaults.subtitle,
      badge: cfg.badge || defaults.badge || null,
      view_all_route: viewAll,
      view_all_label: sec.view_all_label || 'شوف الكل',
      card_variant: CARD_VARIANT[sectionKey] || 'carousel',
      meals,
    };
  }

  // Carousel 1 — time-of-day based "شو بناسبك هسا؟"
  async function resolveTimeNowCarousel() {
    const sec = sectionByKey('time_now');
    if (!sec) return null;
    const cfg = parseJSON(sec.settings_json, {});
    if (!withinActiveHours(cfg)) return null;
    const max = sec.max_items || 8;
    const manualMealItems = itemsFor(sec.id).filter((it) => it.item_type === 'meal' && it.meal_id);
    let meals = [];
    try {
      if (sec.selection_mode === 'manual' && manualMealItems.length) {
        const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getMealsByIdsResolved', payload: { ids: manualMealItems.map((it) => it.meal_id) } });
        meals = (res?.data?.data || []).filter((m) => m.is_available);
        meals.forEach((m) => shownMealIds.add(m.id)); // manual = pinned
      } else {
        const hourStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem', hour12: false, hour: '2-digit' });
        const hour = parseInt(hourStr, 10);
        let defaultCats = [];
        if (hour >= 5 && hour < 11) defaultCats = ['فطور', 'معجنات', 'سندويشات', 'مشروبات'];
        else if (hour >= 11 && hour < 16) defaultCats = ['وجبات رئيسية', 'أكل بيتي', 'دجاج', 'لحوم'];
        else if (hour >= 16 && hour < 23) defaultCats = ['بيتزا', 'برجر', 'عائلية', 'مشاوي'];
        else defaultCats = ['سريع', 'سندويشات', 'حلويات', 'تسالي'];
        const names = (cfg.category_names && cfg.category_names.length) ? cfg.category_names : defaultCats;
        const exclude = [...shownMealIds];
        const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getMealsByCategoryNamesFlat', payload: { names, limit: max, excludeIds: exclude } });
        meals = res?.data?.data || [];
        meals.forEach((m) => shownMealIds.add(m.id));
      }
    } catch (e) { console.error('timeNow error', e); }
    meals = meals.slice(0, max);
    if (meals.length < 2) return null;
    return {
      key: 'time_now', title: sec.title || 'شو بناسبك هسا؟', subtitle: sec.subtitle || 'اقتراحات حسب الوقت والمود.',
      card_variant: 'feature', view_all_route: sec.view_all_route || '/restaurants', view_all_label: sec.view_all_label || 'شوف الكل', meals,
    };
  }

  // Carousel 5 — Mix + Plus suggestions, family packages, group-deal meals
  async function resolveMixPlusCarousel() {
    const sec = sectionByKey('mix_plus_ideas');
    if (!sec) return null;
    const cfg = parseJSON(sec.settings_json, {});
    if (!withinActiveHours(cfg)) return null;
    const max = sec.max_items || 8;
    const manualSuggItems = itemsFor(sec.id).filter((it) => it.item_type === 'suggestion' && it.suggestion_id);
    let setIds = [];
    if (sec.selection_mode === 'manual' && manualSuggItems.length) {
      setIds = manualSuggItems.map((it) => it.suggestion_id);
    } else {
      const wantedLevels = cfg.include_classic ? ['classic', 'mix', 'plus'] : ['mix', 'plus'];
      setIds = (activeSets || []).filter((s) => wantedLevels.includes(normalizePkg(s.package_level))).map((s) => s.id);
    }
    if (!setIds.length) return null;
    let countsMap = {};
    try {
      const allItems = await base44.asServiceRole.entities.TamamSuggestionItem.list('sort_order', 1000);
      (allItems || []).forEach((it) => { if (setIds.includes(it.suggestion_set_id)) countsMap[it.suggestion_set_id] = (countsMap[it.suggestion_set_id] || 0) + 1; });
    } catch (e) { console.error('mixPlus counts error', e); }
    const sets = (activeSets || []).filter((s) => setIds.includes(s.id));
    let cards = sets.slice(0, max).map((s) => {
      const pkg = normalizePkg(s.package_level);
      const label = pkg === 'plus' ? 'بلس' : pkg === 'mix' ? 'ميكس' : 'كلاسيك';
      return {
        type: 'suggestion', id: s.id, title: s.title_ar || 'اقتراح TAMAM', image_url: s.hero_image_url,
        display_price: s.display_price, package_level: pkg, package_label: label,
        included_count: countsMap[s.id] || 0, badge: s.badge_text_ar || (pkg === 'plus' ? 'بلس' : pkg === 'mix' ? 'ميكس' : null),
        route: `/tamam-order/${s.id}`,
      };
    });
    if (cfg.include_group_deals) {
      try {
        const deals = await base44.asServiceRole.entities.GroupDeal.filter({ status: 'active', homepage_featured: true }, 'homepage_priority', 10);
        (deals || []).slice(0, 3).forEach((d) => {
          if (cards.length >= max) return;
          cards.push({ type: 'deal', id: d.id, title: d.title, image_url: d.hero_image, display_price: d.reference_price, badge: d.highlight_badge || 'عرض', route: `/deals/${d.id}` });
        });
      } catch (e) { console.error('mixPlus deals error', e); }
    }
    if (cards.length < 2) return null;
    return {
      key: 'mix_plus_ideas', title: sec.title || 'Mix وPlus وأفكار أكثر', subtitle: sec.subtitle || 'مقترحات جاهزة، وجبات للعيلة، وتجميعات مختلفة.',
      card_variant: 'compact', view_all_route: sec.view_all_route || '/tamam-suggestions?package=all', view_all_label: sec.view_all_label || 'شوف الكل', cards,
    };
  }

  // Carousels (1 & 2 & 4 & 5) — resolved below in order for meal duplicate-prevention
  let timeNow = await resolveTimeNowCarousel();
  let tamamPicks = await resolveCurated('tamam_picks');
  const newDiscovery = await resolveCurated('new');
  let mixPlus = await resolveMixPlusCarousel();

  // Budget section: returns config only; meals are fetched per-range on interaction
  let budget = null;
  const budgetSection = sectionByKey('budget');
  if (budgetSection) {
    const bcfg = parseJSON(budgetSection.settings_json, {});
    const ranges = (bcfg.price_ranges && bcfg.price_ranges.length) ? bcfg.price_ranges : [
      { label: 'لحد ₪40', min: 0, max: 40 },
      { label: '₪40–₪70', min: 40, max: 70 },
      { label: '₪70–₪100', min: 70, max: 100 },
      { label: '₪100 وفوق', min: 100, max: null },
    ];
    budget = {
      title: budgetSection.title || 'خيارات بسعر مريح',
      subtitle: budgetSection.subtitle || 'وجبات ومقترحات تناسب ميزانيات مختلفة.',
      ranges,
      view_all_route: budgetSection.view_all_route || '/restaurants',
      view_all_label: budgetSection.view_all_label || 'شوف الكل',
    };
  }

  // ---- Editorial banners (image/video + destination) ----
  function resolveEditorialBanner(sectionKey, fallbackTitle, fallbackSubtitle, defaultRoute) {
    const sec = sectionByKey(sectionKey) || sections.find((s) => s.section_type === 'editorial_banner' && s.section_key === sectionKey);
    if (!sec) return null;
    if (!withinActiveHours(parseJSON(sec.settings_json, {}))) return null;
    const cfg = parseJSON(sec.settings_json, {});
    const mediaItem = itemsFor(sec.id).find((it) => it.item_type === 'media');
    const media = mediaItem && mediaItem.media_id ? mediaMap[mediaItem.media_id] : null;
    let destination = sec.view_all_route || defaultRoute || '/restaurants';
    if (cfg.mood_id) destination = `/tamam-suggestions/${cfg.mood_id}`;
    else if (cfg.cta_route_key) destination = resolveRouteString(cfg.cta_route_key, cfg.cta_route_params);
    else if (sec.view_all_route) destination = sec.view_all_route;
    return {
      key: sectionKey,
      layout: cfg.layout || 'large',
      media_kind: cfg.media_kind || (media && media.media_type) || 'image',
      file_url: media ? media.file_url : null,
      poster_url: cfg.poster_media_id && mediaMap[cfg.poster_media_id] ? (mediaMap[cfg.poster_media_id].file_url || mediaMap[cfg.poster_media_id].poster_image_url) : null,
      headline: cfg.headline || sec.title || fallbackTitle,
      subtitle: cfg.subtitle || sec.subtitle || fallbackSubtitle,
      badge: cfg.badge || null,
      cta_label: cfg.cta_label || 'شوف',
      destination,
      overlay_strength: cfg.overlay_strength ?? 55,
    };
  }

  const homeKitchenBanner = resolveEditorialBanner('home_kitchen_banner', 'مطبخ البيت مسكّر؟', 'لقينا لك وجبات جاهزة للعيلة.', '/restaurants');
  const lateNightBanner = resolveEditorialBanner('late_night_banner', 'جعان آخر الليل؟', 'في إشياء سريعة بتوصل لحد عندك.', '/tamam-suggestions');
  const browseRestaurantsBanner = resolveEditorialBanner('browse_restaurants_banner', 'بدك تختار المطعم بنفسك؟', 'كل المطاعم والمنيوات بمكان واحد.', '/restaurants');

  return { hasVersion: !!active, hero, packages, timeNow, tamamPicks, budget, newDiscovery, mixPlus, homeKitchenBanner, lateNightBanner, browseRestaurantsBanner, featuredRestaurants, shownMealIds: [...shownMealIds] };
}

// Section metadata for validation and defaults
const SECTION_META = {
  hero: { label: 'البانر الرئيسي', requiresMedia: true },
  active_order: { label: 'بطاقة الطلب النشط', system: true },
  game_promo: { label: 'ترويج لعبة TAMAM' },
  suggestions: { label: 'اقتراحات TAMAM' },
  active_deal: { label: 'بانر العرض الجماعي النشط' },
  upcoming_deal: { label: 'بانر العرض القادم' },
  most_ordered: { label: 'الأكثر طلبًا' },
  popular_meals: { label: 'الأكلات الشعبية' },
  popular_categories: { label: 'تصنيفات شعبية' },
  featured_restaurants: { label: 'مطاعم مميزة' },
  recommended_suggestions: { label: 'اقتراحات موصى بها' },
  trust_payments: { label: 'الدفع والثقة' },
  tracking_trust: { label: 'تتبع الطلب والثقة' },
  rewards: { label: 'النقاط والكوبونات' },
  support: { label: 'الدعم' },
  promo_banner: { label: 'بانرات ترويجية' },
  editorial: { label: 'قسم تحريري' },
  editorial_banner: { label: 'بانر تحريري' },
  lunch_meals: { label: 'غدا اليوم' },
  complete_order: { label: 'كمّل طلبك' },
  time_now: { label: 'شو بناسبك هسا؟' },
  mix_plus_ideas: { label: 'Mix وPlus وأفكار أكثر' },
};

async function buildSnapshot(base44) {
  const sections = await base44.asServiceRole.entities.HomepageSection.list('-display_order', 500);
  const sectionIds = (sections || []).map((s) => s.id);
  let items = [];
  if (sectionIds.length) {
    items = await base44.asServiceRole.entities.HomepageSectionItem.list('-display_order', 2000);
    items = (items || []).filter((it) => sectionIds.includes(it.homepage_section_id));
  }
  return { sections: sections || [], items: items || [], generated_at: new Date().toISOString() };
}

function validateSnapshot(snapshot) {
  const errors = [];
  const warnings = [];
  const { sections = [], items = [] } = snapshot;
  const enabled = sections.filter((s) => s.enabled);
  if (!enabled.length) errors.push('لا يوجد أي قسم مفعّل للنشر.');
  const now = Date.now();
  for (const s of enabled) {
    const meta = SECTION_META[s.section_type] || {};
    if (meta.requiresMedia) {
      const mediaItem = items.find((it) => it.homepage_section_id === s.id && it.item_type === 'media');
      if (!mediaItem || !mediaItem.media_id) errors.push(`القسم "${meta.label || s.section_key}" بحاجة لوسائط.`);
    }
    if (s.starts_at && new Date(s.starts_at).getTime() > now) warnings.push(`القسم "${meta.label || s.section_key}" مجدول ولم يبدأ بعد.`);
    if (s.ends_at && new Date(s.ends_at).getTime() < now) warnings.push(`القسم "${meta.label || s.section_key}" منتهي الصلاحية.`);
    if (s.view_all_route && !s.view_all_route.startsWith('/')) warnings.push(`القسم "${meta.label || s.section_key}" يحتوي وجهة غير صحيحة.`);
    // manual meal references
    const sectionItems = items.filter((it) => it.homepage_section_id === s.id && it.enabled);
    for (const it of sectionItems) {
      if (it.item_type === 'meal' && !it.meal_id) errors.push('هناك عنصر وجبة بدون معرف صالح.');
      if (it.item_type === 'restaurant' && !it.restaurant_id) errors.push('هناك عنصر مطعم بدون معرف صالح.');
      if (it.item_type === 'deal' && !it.deal_id) errors.push('هناك عنصر عرض بدون معرف صالح.');
    }
  }
  // ordering conflicts
  const orders = enabled.map((s) => s.display_order || 0);
  if (new Set(orders).size !== orders.length) warnings.push('هناك تعارض في ترتيب العرض بين بعض الأقسام.');
  return { errors, warnings };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { action, payload = {} } = await req.json();

    // Public: customer homepage config
    if (action === 'getPublishedConfig') {
      const versions = await base44.asServiceRole.entities.HomepageVersion.filter({ is_active: true });
      if (!versions || !versions.length) return Response.json({ data: null });
      const active = versions[0];
      const snapshot = parseJSON(active.snapshot_json, null);
      if (!snapshot) return Response.json({ data: null });
      const now = Date.now();
      const sections = (snapshot.sections || []).filter((s) => {
        if (!s.enabled) return false;
        if (s.starts_at && new Date(s.starts_at).getTime() > now) return false;
        if (s.ends_at && new Date(s.ends_at).getTime() < now) return false;
        return true;
      }).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      return Response.json({ data: { version_number: active.version_number, sections, items: snapshot.items || [], generated_at: snapshot.generated_at } });
    }

    // Public: game moods with suggestion availability
    if (action === 'getPublicMoods') {
      const [moods, sets] = await Promise.all([
        base44.asServiceRole.entities.TamamMood.list('sort_order', 100),
        base44.asServiceRole.entities.TamamSuggestionSet.filter({ is_active: true }, 'sort_order', 500),
      ]);
      const moodIdsWithSets = new Set((sets || []).map((s) => s.mood_id).filter(Boolean));
      const result = (moods || [])
        .filter((m) => m.is_active !== false)
        .map((m) => ({
          id: m.id,
          name_ar: m.name_ar,
          slug: m.slug,
          icon: m.icon,
          description_ar: m.description_ar,
          image_url: m.image_url,
          sort_order: m.sort_order || 0,
          has_suggestions: moodIdsWithSets.has(m.id),
        }))
        .sort((a, b) => a.sort_order - b.sort_order);
      return Response.json({ data: result });
    }

    // Public: all active suggestion sets + items (for catalog)
    if (action === 'getPublicSuggestions') {
      const [sets, allItems] = await Promise.all([
        base44.asServiceRole.entities.TamamSuggestionSet.filter({ is_active: true }, 'sort_order', 500),
        base44.asServiceRole.entities.TamamSuggestionItem.list('sort_order', 500),
      ]);
      const setIds = (sets || []).map((s) => s.id);
      const items = (allItems || []).filter((i) => setIds.includes(i.suggestion_set_id));
      return Response.json({ data: { sets: sets || [], items } });
    }

    // Public: mood record + its active suggestion sets + items
    if (action === 'getPublicMoodData') {
      const moodId = payload.mood_id;
      if (!moodId) return Response.json({ error: 'mood_id required' }, { status: 400 });
      const [moods, sets] = await Promise.all([
        base44.asServiceRole.entities.TamamMood.list('sort_order', 200),
        base44.asServiceRole.entities.TamamSuggestionSet.filter({ mood_id: moodId, is_active: true }, 'sort_order', 200),
      ]);
      const mood = (moods || []).find((m) => m.id === moodId) || null;
      const setIds = (sets || []).map((s) => s.id);
      let items = [];
      if (setIds.length) {
        const allItems = await base44.asServiceRole.entities.TamamSuggestionItem.list('sort_order', 500);
        items = (allItems || []).filter((i) => setIds.includes(i.suggestion_set_id));
      }
      return Response.json({ data: { mood, sets: sets || [], items } });
    }

    // Public: single suggestion set + its items + mood (for the TAMAM order page)
    if (action === 'getPublicSuggestionSet') {
      const setId = payload.set_id;
      if (!setId) return Response.json({ error: 'set_id required' }, { status: 400 });
      const set = await base44.asServiceRole.entities.TamamSuggestionSet.get(setId).catch(() => null);
      if (!set) return Response.json({ data: null });
      const items = await base44.asServiceRole.entities.TamamSuggestionItem.filter({ suggestion_set_id: setId }, 'sort_order', 200);
      let mood = null;
      if (set.mood_id) mood = await base44.asServiceRole.entities.TamamMood.get(set.mood_id).catch(() => null);
      return Response.json({ data: { set, items: items || [], mood } });
    }

    // Public: fully-resolved published homepage (hero media, packages, most-ordered, popular categories with meals, featured restaurants)
    if (action === 'getPublishedHomepage') {
      return Response.json({ data: await buildPublishedHomepage(base44) });
    }

    // Admin-only actions
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    switch (action) {
      case 'getDraftConfig': {
        const snapshot = await buildSnapshot(base44);
        return Response.json({ data: snapshot });
      }
      case 'validatePublish': {
        const snapshot = await buildSnapshot(base44);
        const { errors, warnings } = validateSnapshot(snapshot);
        return Response.json({ data: { canPublish: errors.length === 0, errors, warnings } });
      }
      case 'publishDraft': {
        const snapshot = await buildSnapshot(base44);
        const { errors } = validateSnapshot(snapshot);
        if (errors.length) return Response.json({ error: 'validation_failed', errors }, { status: 400 });
        const versions = await base44.asServiceRole.entities.HomepageVersion.list('-version_number', 500);
        const lastNum = (versions || []).reduce((m, v) => Math.max(m, v.version_number || 0), 0);
        // Deactivate all previous
        if (versions && versions.length) {
          await base44.asServiceRole.entities.HomepageVersion.bulkUpdate(
            (versions || []).map((v) => ({ id: v.id, is_active: false }))
          );
        }
        const created = await base44.asServiceRole.entities.HomepageVersion.create({
          version_number: lastNum + 1,
          label: payload.label || `نسخة ${lastNum + 1}`,
          snapshot_json: JSON.stringify(snapshot),
          is_active: true,
          published_by_name: user.full_name || '',
          published_by_id: user.id || '',
          change_summary: payload.changeSummary || '',
          is_rollback: false,
        });
        return Response.json({ data: { published: true, version_number: created.version_number, id: created.id } });
      }
      case 'listVersions': {
        const versions = await base44.asServiceRole.entities.HomepageVersion.list('-version_number', 100);
        return Response.json({ data: versions || [] });
      }
      case 'diagnoseDriveImages': {
        const driveRe = /drive\.google\.com|lh3\.googleusercontent\.com|docs\.google\.com/;
        const records = [];
        for (const s of DRIVE_ENTITIES) {
          let all = [];
          try { all = await base44.asServiceRole.entities[s.entity].list('-created_date', 500); } catch (e) { console.error('diag list error', s.entity, e); }
          for (const r of (all || [])) {
            const v = r[s.field];
            if (!v || !driveRe.test(String(v))) continue;
            const fileId = extractDriveId(String(v));
            let httpStatus = null, contentType = null;
            if (fileId) {
              try {
                const res = await fetch(`https://lh3.googleusercontent.com/d/${fileId}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
                httpStatus = res.status;
                contentType = res.headers.get('content-type');
              } catch (e) { httpStatus = 'fetch_error'; console.error('drive fetch error', fileId, e); }
            }
            records.push({
              entity: s.entity, id: r.id, field: s.field, label: s.label,
              title: r.title_ar || r.title || r.name_ar || '',
              url: String(v).substring(0, 200), fileId,
              httpStatus, contentType,
              publicOk: httpStatus === 200 && contentType && contentType.startsWith('image/'),
              isFolder: /drive\.google\.com\/drive\/folders\//.test(String(v)),
            });
          }
        }
        const uniqueFiles = [...new Set(records.map(r => r.fileId).filter(Boolean))];
        return Response.json({ data: {
          total: records.length,
          uniqueFiles: uniqueFiles.length,
          publicOk: records.filter(r => r.publicOk).length,
          private: records.filter(r => r.fileId && !r.publicOk).length,
          folders: records.filter(r => r.isFolder).length,
          records,
        }});
      }
      case 'migrateDriveImages': {
        const driveRe = /drive\.google\.com/;
        const results = [];
        for (const s of DRIVE_ENTITIES) {
          let all = [];
          try { all = await base44.asServiceRole.entities[s.entity].list('-created_date', 500); } catch (e) { console.error('migrate list error', s.entity, e); }
          for (const r of (all || [])) {
            const v = r[s.field];
            if (!v || !driveRe.test(String(v))) continue;
            const fileId = extractDriveId(String(v));
            if (!fileId) { results.push({ id: r.id, entity: s.entity, status: 'no_file_id' }); continue; }
            try {
              const imgRes = await fetch(`https://lh3.googleusercontent.com/d/${fileId}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
              const ct = imgRes.headers.get('content-type') || '';
              if (!imgRes.ok || !ct.startsWith('image/')) {
                results.push({ id: r.id, entity: s.entity, fileId, status: 'not_public', httpStatus: imgRes.status, contentType: ct });
                continue;
              }
              const blob = await imgRes.blob();
              const upload = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
              const newUrl = upload?.file_url || upload?.url || (upload?.data && (upload.data.file_url || upload.data.url));
              if (!newUrl) { results.push({ id: r.id, entity: s.entity, fileId, status: 'upload_failed' }); continue; }
              await base44.asServiceRole.entities[s.entity].update(r.id, { [s.field]: newUrl });
              results.push({ id: r.id, entity: s.entity, fileId, status: 'migrated', newUrl });
            } catch (e) {
              console.error('drive migration error', r.id, e);
              results.push({ id: r.id, entity: s.entity, fileId, status: 'error', error: String(e).substring(0, 150) });
            }
          }
        }
        return Response.json({ data: {
          migrated: results.filter(r => r.status === 'migrated').length,
          failed: results.filter(r => r.status !== 'migrated').length,
          results,
        }});
      }
      case 'rollbackToVersion': {
        const versions = await base44.asServiceRole.entities.HomepageVersion.list('-version_number', 500);
        const target = (versions || []).find((v) => v.id === payload.version_id);
        if (!target) return Response.json({ error: 'version_not_found' }, { status: 404 });
        const targetSnapshot = parseJSON(target.snapshot_json, null);
        if (!targetSnapshot) return Response.json({ error: 'snapshot_corrupt' }, { status: 500 });
        // Wipe current draft sections+items, recreate from snapshot
        const currentSections = await base44.asServiceRole.entities.HomepageSection.list('-display_order', 500);
        const currentIds = (currentSections || []).map((s) => s.id);
        let currentItems = [];
        if (currentIds.length) {
          currentItems = await base44.asServiceRole.entities.HomepageSectionItem.list('-display_order', 2000);
          currentItems = (currentItems || []).filter((it) => currentIds.includes(it.homepage_section_id));
        }
        // Delete items first
        if (currentItems.length) {
          await Promise.all(currentItems.map((it) => base44.asServiceRole.entities.HomepageSectionItem.delete(it.id).catch(() => null)));
        }
        // Delete sections
        if (currentSections && currentSections.length) {
          await Promise.all(currentSections.map((s) => base44.asServiceRole.entities.HomepageSection.delete(s.id).catch(() => null)));
        }
        // Recreate sections
        const idMap = {};
        for (const s of targetSnapshot.sections || []) {
          const { id, created_date, updated_date, created_by_id, ...rest } = s;
          const created = await base44.asServiceRole.entities.HomepageSection.create(rest);
          idMap[id] = created.id;
        }
        // Recreate items
        for (const it of targetSnapshot.items || []) {
          const { id, created_date, updated_date, created_by_id, ...rest } = it;
          const newSectionId = idMap[rest.homepage_section_id];
          if (!newSectionId) continue;
          await base44.asServiceRole.entities.HomepageSectionItem.create({ ...rest, homepage_section_id: newSectionId });
        }
        // Create a new active version marking this as rollback
        const lastNum = (versions || []).reduce((m, v) => Math.max(m, v.version_number || 0), 0);
        const newSnapshot = await buildSnapshot(base44);
        if (versions && versions.length) {
          await base44.asServiceRole.entities.HomepageVersion.bulkUpdate(
            (versions || []).map((v) => ({ id: v.id, is_active: false }))
          );
        }
        await base44.asServiceRole.entities.HomepageVersion.create({
          version_number: lastNum + 1,
          label: `استرجاع النسخة ${target.version_number}`,
          snapshot_json: JSON.stringify(newSnapshot),
          is_active: true,
          published_by_name: user.full_name || '',
          published_by_id: user.id || '',
          change_summary: `استرجاع للنسخة رقم ${target.version_number}`,
          is_rollback: true,
        });
        return Response.json({ data: { rolledBack: true, to_version: target.version_number } });
      }
      case 'diagnoseMoods': {
        const [moods, sets] = await Promise.all([
          base44.asServiceRole.entities.TamamMood.list('sort_order', 200),
          base44.asServiceRole.entities.TamamSuggestionSet.list('sort_order', 500),
        ]);
        const moodIds = new Set((moods || []).map((m) => m.id));
        const moodsMissingNames = (moods || []).filter((m) => !m.name_ar && !m.name);
        const moodsMissingImages = (moods || []).filter((m) => !m.image_url);
        const activeMoods = (moods || []).filter((m) => m.is_active !== false);
        const moodsWithSets = new Set((sets || []).filter((s) => s.is_active !== false).map((s) => s.mood_id).filter(Boolean));
        const moodsWithoutSuggestions = activeMoods.filter((m) => !moodsWithSets.has(m.id));
        const orphanedSets = (sets || []).filter((s) => s.mood_id && !moodIds.has(s.mood_id));
        return Response.json({
          data: {
            entityName: 'TamamMood',
            totalMoods: (moods || []).length,
            activeMoods: activeMoods.length,
            moodsMissingNames: moodsMissingNames.length,
            moodsMissingImages: moodsMissingImages.length,
            moodsWithSuggestions: moodsWithSets.size,
            moodsWithoutSuggestions: moodsWithoutSuggestions.length,
            orphanedSets: orphanedSets.length,
            orphanedSetDetails: orphanedSets.slice(0, 10).map((s) => ({ id: s.id, title: s.title_ar, mood_id: s.mood_id })),
          },
        });
      }
      case 'autoRankMostOrdered': {
        // Invoke supabaseProxy for date-filtered most-ordered meals
        const days = Number(payload.days) || 30;
        const limit = Number(payload.limit) || 8;
        const res = await base44.asServiceRole.functions.invoke('supabaseProxy', { action: 'getMostOrderedMeals', payload: { days, limit } });
        const meals = (res && res.data && (res.data.data || res.data)) || [];
        return Response.json({ data: meals });
      }
      case 'addMissingCuratedSections': {
        const existing = await base44.asServiceRole.entities.HomepageSection.list('-display_order', 200);
        const haveKeys = new Set((existing || []).map((s) => s.section_key));
        const curatedDefs = [
          { section_key: 'tamam_picks', section_type: 'tamam_picks', title: 'اختيارات تستاهل التجربة', subtitle: 'وجبات اخترناها بعناية من منيوهات TAMAM.', display_order: 20, selection_mode: 'manual', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'manual', badge: 'اختيار TAMAM', most_ordered_threshold: { enabled: false, min_orders: 100, period_days: 30, min_customers: 20 } }) },
          { section_key: 'budget', section_type: 'budget_meals', title: 'خيارات بسعر مريح', subtitle: 'وجبات ومقترحات تناسب ميزانيات مختلفة.', display_order: 21, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ price_ranges: [{ label: 'لحد ₪40', min: 0, max: 40 }, { label: '₪40–₪70', min: 40, max: 70 }, { label: '₪70–₪100', min: 70, max: 100 }, { label: '₪100 وفوق', min: 100, max: null }] }) },
          { section_key: 'family', section_type: 'family_meals', title: 'للعيلة واللّمات', subtitle: 'وجبات بتكفي الكل بدون ما تحتار.', display_order: 22, selection_mode: 'manual', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'manual' }) },
          { section_key: 'quick', section_type: 'quick_meals', title: 'سريع وخفيف', subtitle: 'للجوع السريع أو لما بدك إشي خفيف.', display_order: 23, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'category' }) },
          { section_key: 'home_style', section_type: 'home_style_meals', title: 'أكل بيتي', subtitle: 'لما نفسك بأكلة بتذكّرك بالبيت.', display_order: 24, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'category' }) },
          { section_key: 'new', section_type: 'new_meals', title: 'جديد على TAMAM', subtitle: 'وجبات انضافت جديد وتستاهل تنجرّب.', display_order: 25, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'new', new_days: 30, badge: 'جديد' }) },
          { section_key: 'desserts', section_type: 'desserts_snacks', title: 'حلويات وتسالي', subtitle: 'كمّل الطلب بإشي حلو أو تسالي للجلسة.', display_order: 26, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'category' }) },
          { section_key: 'lunch', section_type: 'lunch_meals', title: 'غدا اليوم', subtitle: 'وجبات مشبعة للغدا بدون ما تضيع وقت بالاختيار.', display_order: 27, selection_mode: 'manual', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'category', active_hours: '' }) },
          { section_key: 'complete_order', section_type: 'complete_order', title: 'كمّل طلبك', subtitle: 'مشروب، تحلاية أو إضافة صغيرة بتكمّل الوجبة.', display_order: 28, selection_mode: 'automatic', max_items: 10, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'category' }) },
          { section_key: 'home_kitchen_banner', section_type: 'editorial_banner', title: 'مطبخ البيت مسكّر؟', subtitle: 'لقينا لك وجبات جاهزة للعيلة.', display_order: 29, selection_mode: 'automatic', view_all_route: '/restaurants', settings_json: JSON.stringify({ layout: 'large', media_kind: 'image', headline: 'مطبخ البيت مسكّر؟', subtitle: 'لقينا لك وجبات جاهزة للعيلة.', cta_label: 'شوف الوجبات' }) },
          { section_key: 'late_night_banner', section_type: 'editorial_banner', title: 'جعان آخر الليل؟', subtitle: 'في إشياء سريعة بتوصل لحد عندك.', display_order: 30, selection_mode: 'automatic', view_all_route: '/tamam-suggestions', settings_json: JSON.stringify({ layout: 'large', media_kind: 'image', headline: 'جعان آخر الليل؟', subtitle: 'في إشياء سريعة بتوصل لحد عندك.', cta_label: 'شوف اقتراحات آخر الليل' }) },
          { section_key: 'browse_restaurants_banner', section_type: 'editorial_banner', title: 'بدك تختار المطعم بنفسك؟', subtitle: 'كل المطاعم والمنيوات بمكان واحد.', display_order: 31, selection_mode: 'automatic', view_all_route: '/restaurants', settings_json: JSON.stringify({ layout: 'large', media_kind: 'image', headline: 'بدك تختار المطعم بنفسك؟', subtitle: 'كل المطاعم والمنيوات بمكان واحد.', cta_label: 'تصفح كل المطاعم' }) },
          { section_key: 'time_now', section_type: 'time_now', title: 'شو بناسبك هسا؟', subtitle: 'اقتراحات حسب الوقت والمود.', display_order: 15, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'time', active_hours: '' }) },
          { section_key: 'mix_plus_ideas', section_type: 'mix_plus_ideas', title: 'Mix وPlus وأفكار أكثر', subtitle: 'مقترحات جاهزة، وجبات للعيلة، وتجميعات مختلفة.', display_order: 35, selection_mode: 'automatic', max_items: 8, view_all_route: '/tamam-suggestions?package=all', settings_json: JSON.stringify({ include_classic: false, include_group_deals: true, active_hours: '' }) },
        ];
        const missing = curatedDefs.filter((d) => !haveKeys.has(d.section_key));
        if (missing.length) await base44.asServiceRole.entities.HomepageSection.bulkCreate(missing);
        return Response.json({ data: { created: missing.length } });
      }
      case 'seedDefaults': {
        // Create default section records if none exist
        const existing = await base44.asServiceRole.entities.HomepageSection.list('-display_order', 100);
        if (existing && existing.length) return Response.json({ data: { seeded: false, message: 'الأقسام موجودة مسبقًا' } });
        const defaults = [
          { section_key: 'hero', section_type: 'hero', title: 'محتار شو تاكل اليوم؟', subtitle: 'اختار مودك وTAMAM يرتّبلك', display_order: 1, settings_json: JSON.stringify({ media_kind: 'image' }) },
          { section_key: 'active_order', section_type: 'active_order', title: 'طلبك النشط', display_order: 2, selection_mode: 'automatic' },
          { section_key: 'game_promo', section_type: 'game_promo', title: 'ساعدني أختار', subtitle: 'لعبة TAMAM', display_order: 3, view_all_label: 'ابدأ اللعب', view_all_route: '/tamam-game' },
          { section_key: 'suggestions', section_type: 'suggestions', title: 'اقتراحات TAMAM', display_order: 4, max_items: 8 },
          { section_key: 'active_deal', section_type: 'active_deal', title: 'عروض TAMAM', display_order: 5, selection_mode: 'automatic' },
          { section_key: 'upcoming_deal', section_type: 'upcoming_deal', title: 'عروض قادمة', display_order: 6, selection_mode: 'automatic' },
          { section_key: 'most_ordered', section_type: 'most_ordered', title: 'الأكثر طلبًا', display_order: 7, selection_mode: 'automatic', max_items: 8, enabled: false, settings_json: JSON.stringify({ most_ordered_threshold: { enabled: false, min_orders: 100, period_days: 30, min_customers: 20 } }) },
          { section_key: 'popular_meals', section_type: 'popular_meals', title: 'الأكلات الشعبية', display_order: 8, selection_mode: 'manual', max_items: 8, enabled: false },
          { section_key: 'popular_categories', section_type: 'popular_categories', title: 'تصنيفات شعبية', display_order: 9, selection_mode: 'automatic', max_items: 8, enabled: false },
          { section_key: 'tamam_picks', section_type: 'tamam_picks', title: 'اختيارات تستاهل التجربة', subtitle: 'وجبات اخترناها بعناية من منيوهات TAMAM.', display_order: 20, selection_mode: 'manual', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'manual', badge: 'اختيار TAMAM' }) },
          { section_key: 'budget', section_type: 'budget_meals', title: 'خيارات بسعر مريح', subtitle: 'وجبات ومقترحات تناسب ميزانيات مختلفة.', display_order: 21, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ price_ranges: [{ label: 'لحد ₪40', min: 0, max: 40 }, { label: '₪40–₪70', min: 40, max: 70 }, { label: '₪70–₪100', min: 70, max: 100 }, { label: '₪100 وفوق', min: 100, max: null }] }) },
          { section_key: 'family', section_type: 'family_meals', title: 'للعيلة واللّمات', subtitle: 'وجبات بتكفي الكل بدون ما تحتار.', display_order: 22, selection_mode: 'manual', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'manual' }) },
          { section_key: 'quick', section_type: 'quick_meals', title: 'سريع وخفيف', subtitle: 'للجوع السريع أو لما بدك إشي خفيف.', display_order: 23, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'category' }) },
          { section_key: 'home_style', section_type: 'home_style_meals', title: 'أكل بيتي', subtitle: 'لما نفسك بأكلة بتذكّرك بالبيت.', display_order: 24, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'category' }) },
          { section_key: 'new', section_type: 'new_meals', title: 'جديد على TAMAM', subtitle: 'وجبات انضافت جديد وتستاهل تنجرّب.', display_order: 25, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'new', new_days: 30, badge: 'جديد' }) },
          { section_key: 'desserts', section_type: 'desserts_snacks', title: 'حلويات وتسالي', subtitle: 'كمّل الطلب بإشي حلو أو تسالي للجلسة.', display_order: 26, selection_mode: 'automatic', max_items: 8, view_all_route: '/restaurants', settings_json: JSON.stringify({ auto_mode: 'category' }) },
          { section_key: 'featured_restaurants', section_type: 'featured_restaurants', title: 'مطاعم بنرشحها', display_order: 30, selection_mode: 'automatic', max_items: 6 },
          { section_key: 'trust_payments', section_type: 'trust_payments', title: 'الدفع والثقة', display_order: 11, subtitle: 'طلبك معنا من أول كبسة لحد باب البيت', settings_json: JSON.stringify({ items: ['visa', 'googlepay', 'cash', 'secure', 'tracking'] }) },
          { section_key: 'tracking_trust', section_type: 'tracking_trust', title: 'تتبع طلبك', display_order: 12 },
          { section_key: 'rewards', section_type: 'rewards', title: 'النقاط والكوبونات', display_order: 13, settings_json: JSON.stringify({ show_balance: true, show_pending: true, show_coupon_count: true }) },
          { section_key: 'support', section_type: 'support', title: 'الدعم', display_order: 14 },
        ];
        const created = await base44.asServiceRole.entities.HomepageSection.bulkCreate(defaults);
        return Response.json({ data: { seeded: true, count: created.length } });
      }
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('homepageEngine error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}