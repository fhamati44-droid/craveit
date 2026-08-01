import { base44 } from '@/api/base44Client';

const engine = (action, payload = {}) =>
  base44.functions.invoke('homepageEngine', { action, payload }).then((r) => r.data?.data ?? r.data);

export const getPublishedConfig = () => engine('getPublishedConfig');
export const getPublishedHomepage = () => engine('getPublishedHomepage');
export const getDiscoveryFeed = () => engine('getDiscoveryFeed');
export const getDraftConfig = () => engine('getDraftConfig');
export const validatePublish = () => engine('validatePublish');
export const publishDraft = (label, changeSummary) => engine('publishDraft', { label, changeSummary });
export const listVersions = () => engine('listVersions');
export const rollbackToVersion = (version_id) => engine('rollbackToVersion', { version_id });
export const autoRankMostOrdered = (days, limit) => engine('autoRankMostOrdered', { days, limit });
export const diagnoseMoods = () => engine('diagnoseMoods');
export const seedDefaults = () => engine('seedDefaults');
export const addMissingCuratedSections = () => engine('addMissingCuratedSections');

// Section CRUD (admin role via SDK)
export const listSections = () => base44.entities.HomepageSection.list('-display_order', 200);
export const saveSection = (draft) =>
  draft.id ? base44.entities.HomepageSection.update(draft.id, draft) : base44.entities.HomepageSection.create(draft);
export const deleteSection = (id) => base44.entities.HomepageSection.delete(id);

// Section item CRUD
export const listSectionItems = (sectionId) => base44.entities.HomepageSectionItem.filter({ homepage_section_id: sectionId });
export const saveSectionItem = (draft) =>
  draft.id ? base44.entities.HomepageSectionItem.update(draft.id, draft) : base44.entities.HomepageSectionItem.create(draft);
export const bulkCreateItems = (items) => base44.entities.HomepageSectionItem.bulkCreate(items);
export const replaceSectionItems = async (sectionId, items) => {
  const existing = await listSectionItems(sectionId);
  await Promise.all((existing || []).map((it) => base44.entities.HomepageSectionItem.delete(it.id).catch(() => null)));
  if (items.length) await bulkCreateItems(items);
};

// Media CRUD
export const listMedia = () => base44.entities.HomepageMedia.list('-created_date', 200);
export const saveMedia = (draft) =>
  draft.id ? base44.entities.HomepageMedia.update(draft.id, draft) : base44.entities.HomepageMedia.create(draft);
export const deleteMedia = (id) => base44.entities.HomepageMedia.delete(id);

// Upload via integration
export const uploadFile = (file) => base44.integrations.Core.UploadFile({ file });

export const SECTION_LABELS = {
  hero: 'الفيديو أو البانر الرئيسي',
  active_order: 'بطاقة الطلب النشط',
  game_promo: 'ترويج لعبة TAMAM',
  suggestions: 'اقتراحات TAMAM',
  active_deal: 'بانر العرض الجماعي النشط',
  upcoming_deal: 'بانر العرض القادم',
  most_ordered: 'الأكثر طلبًا',
  popular_meals: 'الأكلات الشعبية',
  popular_categories: 'تصنيفات شعبية',
  featured_restaurants: 'مطاعم بنرشحها',
  recommended_suggestions: 'اقتراحات موصى بها',
  tamam_picks: 'اختيارات تستاهل التجربة',
  budget_meals: 'خيارات بسعر مريح',
  family_meals: 'للعيلة واللّمات',
  quick_meals: 'سريع وخفيف',
  home_style_meals: 'أكل بيتي',
  new_meals: 'جديد على TAMAM',
  desserts_snacks: 'حلويات وتسالي',
  lunch_meals: 'غدا اليوم',
  complete_order: 'كمّل طلبك',
  time_now: 'شو بناسبك هسا؟',
  mix_plus_ideas: 'Mix وPlus وأفكار أكثر',
  editorial_banner: 'بانر تحريري',
  trust_payments: 'الدفع والثقة',
  tracking_trust: 'تتبع الطلب والثقة',
  rewards: 'النقاط والكوبونات',
  support: 'الدعم',
  promo_banner: 'بانرات ترويجية',
  editorial: 'قسم تحريري',
};

export const ROUTE_OPTIONS = [
  { key: 'tamam_game', label: 'لعبة TAMAM', path: '/tamam-game' },
  { key: 'suggestions_all', label: 'كل الاقتراحات', path: '/tamam-suggestions?package=all' },
  { key: 'suggestions_classic', label: 'اقتراحات كلاسيك', path: '/tamam-suggestions?package=classic' },
  { key: 'suggestions_mix', label: 'اقتراحات ميكس', path: '/tamam-suggestions?package=mix' },
  { key: 'suggestions_plus', label: 'اقتراحات بلس', path: '/tamam-suggestions?package=plus' },
  { key: 'restaurants_all', label: 'كل المطاعم', path: '/restaurants' },
  { key: 'deals_all', label: 'كل العروض', path: '/deals' },
  { key: 'orders', label: 'طلباتي', path: '/orders' },
  { key: 'rewards', label: 'النقاط والمكافآت', path: '/account/rewards' },
  { key: 'custom', label: 'مسار مخصص', path: '' },
];