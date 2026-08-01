import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ADMIN = (user) => user && user.role === 'admin';

function parseJSON(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
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
          { section_key: 'most_ordered', section_type: 'most_ordered', title: 'الأكثر طلبًا', display_order: 7, selection_mode: 'automatic', max_items: 8 },
          { section_key: 'popular_meals', section_type: 'popular_meals', title: 'الأكلات الشعبية', display_order: 8, selection_mode: 'manual', max_items: 8 },
          { section_key: 'popular_categories', section_type: 'popular_categories', title: 'تصنيفات شعبية', display_order: 9, selection_mode: 'automatic', max_items: 8 },
          { section_key: 'featured_restaurants', section_type: 'featured_restaurants', title: 'مطاعم قريبة منك', display_order: 10, selection_mode: 'automatic', max_items: 6 },
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