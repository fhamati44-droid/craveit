import { base44 } from '@/api/base44Client';

// ---- Restaurant Menus ----
export const getMenusForRestaurant = (rid) => base44.entities.RestaurantMenu.filter({ restaurant_id: rid }, 'created_date', 20);
export const createMenu = (data) => base44.entities.RestaurantMenu.create(data);
export const updateMenu = (id, data) => base44.entities.RestaurantMenu.update(id, data);
export const deleteMenu = (id) => base44.entities.RestaurantMenu.delete(id);

// ---- Restaurant Menu Items (extended RestaurantMealOffer) ----
export const getItemsForRestaurant = (rid) => base44.entities.RestaurantMealOffer.filter({ restaurant_id: rid }, 'display_order', 200);
export const getItemsForMenu = (menuId) => base44.entities.RestaurantMealOffer.filter({ restaurant_menu_id: menuId }, 'display_order', 200);
export const createItem = (data) => base44.entities.RestaurantMealOffer.create(data);
export const updateItem = (id, data) => base44.entities.RestaurantMealOffer.update(id, data);
export const deleteItem = (id) => base44.entities.RestaurantMealOffer.delete(id);
export const getUnmappedItems = (rid) => base44.entities.RestaurantMealOffer.filter({ restaurant_id: rid, mapping_status: 'unmapped' }, 'display_order', 200);

// ---- Modifiers ----
export const getModifierGroups = (itemId) => base44.entities.RestaurantMenuItemModifierGroup.filter({ restaurant_menu_item_id: itemId }, 'display_order', 20);
export const createModifierGroup = (data) => base44.entities.RestaurantMenuItemModifierGroup.create(data);
export const updateModifierGroup = (id, data) => base44.entities.RestaurantMenuItemModifierGroup.update(id, data);
export const deleteModifierGroup = (id) => base44.entities.RestaurantMenuItemModifierGroup.delete(id);
export const getModifiers = (groupId) => base44.entities.RestaurantMenuItemModifier.filter({ modifier_group_id: groupId }, 'display_order', 50);
export const createModifier = (data) => base44.entities.RestaurantMenuItemModifier.create(data);
export const updateModifier = (id, data) => base44.entities.RestaurantMenuItemModifier.update(id, data);
export const deleteModifier = (id) => base44.entities.RestaurantMenuItemModifier.delete(id);

// ---- Import batches ----
export const getImportBatches = (rid) => base44.entities.RestaurantMenuImportBatch.filter({ restaurant_id: rid }, '-created_date', 50);
export const createImportBatch = (data) => base44.entities.RestaurantMenuImportBatch.create(data);
export const getImportRows = (batchId) => base44.entities.RestaurantMenuImportRow.filter({ import_batch_id: batchId }, 'row_number', 500);

// ---- TAMAM master product search (Supabase menu_items) ----
export async function searchTamamProducts(query) {
  if (!query || query.trim().length < 2) return [];
  const res = await base44.functions.invoke('supabaseProxy', { action: 'searchMenuItems', payload: { query, limit: 30 } });
  return res?.data?.data || [];
}

// ---- Mapping suggestions (never auto-applied — admin confirms) ----
export function suggestMappings(itemName, tamamProducts, limit = 5) {
  if (!itemName || !tamamProducts?.length) return [];
  const q = itemName.trim();
  const scored = tamamProducts.map((p) => {
    const name = (p.name_ar || p.name || '').trim();
    let score = 0;
    if (name === q) score = 100;
    else if (name.includes(q)) score = 92;
    else if (q.includes(name)) score = 85;
    else {
      const tokens = q.split(/\s+/).filter(Boolean);
      const matched = tokens.filter((t) => name.includes(t)).length;
      score = matched * 18;
    }
    return { product: p, confidence: Math.min(99, Math.round(score)) };
  }).filter((x) => x.confidence > 0).sort((a, b) => b.confidence - a.confidence);
  return scored.slice(0, limit);
}

// ---- Validation ----
export function validateItem(form) {
  const errors = [];
  const name = (form.restaurant_product_name || form.name_ar || '').trim();
  if (!name) errors.push('اسم الوجبة مطلوب');
  if (form.price == null || form.price === '' || Number(form.price) <= 0) errors.push('السعر مطلوب ويجب أن يكون رقمًا موجبًا');
  return errors;
}

// ---- Publishing rule (Part 15) ----
export function isItemPublishable(item, restaurant) {
  if (!item || !restaurant) return false;
  if (!restaurant.active || !restaurant.accepts_orders) return false;
  if (restaurant.current_status === 'closed' || restaurant.current_status === 'temporarily_unavailable') return false;
  if (!item.active || !item.available) return false;
  if (item.price == null || Number(item.price) <= 0) return false;
  if (!item.meal_id && !item.mapped_meal_set_variant_id) return false;
  return true;
}

// ---- Display priority (Part 12) ----
export function resolveItemDisplayImage(item, tamamProduct) {
  if (item?.primary_image) return item.primary_image;
  if (item?.gallery_images?.length) return item.gallery_images[0];
  if (item?.image_override_url) return item.image_override_url;
  if (tamamProduct?.image_url) return tamamProduct.image_url;
  return null;
}
export function resolveItemDisplayTitle(item, tamamProduct) {
  return item?.restaurant_product_name || item?.name_ar || tamamProduct?.name_ar || tamamProduct?.name || 'وجبة';
}
export function resolveItemDisplayDescription(item, tamamProduct) {
  return item?.customer_visible_description || item?.short_description_ar || item?.full_description_ar || tamamProduct?.description || '';
}
export function resolveItemPayablePrice(item) {
  if (item?.price == null || Number(item.price) <= 0) return null;
  return Number(item.price);
}

// ---- CSV template columns (official, Part 6) ----
export const CSV_COLUMNS = [
  'restaurant_sku', 'external_id',
  'restaurant_item_name_ar', 'restaurant_item_name_en',
  'restaurant_item_short_description_ar', 'restaurant_item_full_description_ar',
  'ingredients_ar', 'included_items_ar', 'allergens_ar',
  'portion_description_ar', 'packaging_description_ar',
  'restaurant_category', 'restaurant_subcategory', 'restaurant_menu_section',
  'restaurant_price', 'compare_at_price', 'currency', 'tax_included',
  'primary_image_file', 'primary_image_url',
  'gallery_image_file_1', 'gallery_image_file_2', 'gallery_image_file_3',
  'gallery_image_url_1', 'gallery_image_url_2', 'gallery_image_url_3',
  'active', 'available', 'sold_out', 'available_quantity', 'daily_capacity',
  'preparation_time_min', 'preparation_time_max',
  'delivery_fee_override', 'minimum_order_override', 'free_delivery_threshold_override',
  'available_days', 'available_from_time', 'available_until_time',
  'tamam_product_id', 'tamam_product_name_reference',
  'meal_set_id', 'meal_set_name_reference', 'meal_set_variant_id', 'tier',
  'modifier_group_1', 'modifier_1_name', 'modifier_1_price', 'modifier_2_name', 'modifier_2_price',
  'internal_notes',
];
export const CSV_TEMPLATE = CSV_COLUMNS.join(',');
export function downloadCsvTemplate() {
  downloadCsv(CSV_TEMPLATE + '\n', 'tamam_restaurant_menu_template.csv');
}
// Example file with 2–3 sample rows clearly marked as examples (never auto-inserted).
export function downloadCsvExample() {
  const sample = [
    `BG-001,EXT-1,دبل برغر فطر وجبنة,Double Mushroom Burger,قطعتان لحم وجبنة شيدر وفطر مشوي,برغر لحم مزدوج مع جبنة شيدر وفطر مشوي وخس وبندورة وصوص المطعم,لحم، خبز، جبنة، فطر، صوص,خبز، جبنة شيدر، فطر,خس وبندورة وبصل,وجبة كاملة,علبة كرتون,برغر,برغر,وجبات رئيسية,54,68,ILS,true,BG-001.jpg,,,,,,true,true,false,20,40,15,25,10,40,0,,,,,true,false,,,,برغر Mix,BRG-MIX,,mix,إضافات,جبنة إضافية,3,صوص فطر,2,مثال — يمسح`,
    `BG-002,,برغر كرسبي مع حلقات بصل,Crispy Burger Rings,برغر مقرمش مع حلقات بصل,برغر دجاج مقرمش مع حلقات بصل وطماطم وصلصة خاصة,دجاج، بقسماط، بصل,حلقات بصل,خس وطماطم,وجبة كاملة,علبة كرتون,برغر,برغر,وجبات رئيسية,47,,ILS,true,BG-002.jpg,,,,,,true,true,false,15,,12,20,8,35,0,,,,,true,false,,,,برغر Mix,BRG-MIX,,mix,,,,,,مثال — يمسح`,
  ].join('\n');
  downloadCsv(CSV_TEMPLATE + '\n' + sample + '\n', 'tamam_restaurant_menu_example.csv');
}
function downloadCsv(content, fileName) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}
// Map a CSV/TAMAM mapping request into the stable entity fields (Part 1).
export function buildMappingFields({ tamam_product_id, meal_set_variant_id, tier, meal_set_id } = {}) {
  const productId = tamam_product_id != null && tamam_product_id !== '' ? Number(tamam_product_id) : null;
  const variantId = meal_set_variant_id || null;
  const hasMapping = productId != null || variantId;
  const fields = {
    mapping_status: hasMapping ? 'mapped' : 'unmapped',
    mapping_confidence: hasMapping ? 100 : 0,
    mapped_at: new Date().toISOString(),
  };
  if (productId != null) { fields.mapped_tamam_product_id = productId; fields.meal_id = productId; }
  if (variantId) fields.mapped_meal_set_variant_id = variantId;
  if (tier) fields.mapped_tier = tier;
  if (meal_set_id) fields.mapped_meal_set_id = meal_set_id;
  return fields;
}
// Index existing items by SKU for update-by-SKU (Part 9).
export function buildSkuIndex(items) {
  const map = new Map();
  (items || []).forEach((it) => { if (it.restaurant_sku) map.set(it.restaurant_sku, it); });
  return map;
}
// ---- CSV exports (Part 17) ----
function rowFromItem(it) {
  const row = {};
  CSV_COLUMNS.forEach((c) => (row[c] = ''));
  row.restaurant_sku = it.restaurant_sku || '';
  row.external_id = it.external_id || '';
  row.restaurant_item_name_ar = it.restaurant_product_name || it.name_ar || '';
  row.restaurant_item_name_en = it.name_en || '';
  row.restaurant_item_short_description_ar = it.customer_visible_description || it.short_description_ar || '';
  row.restaurant_item_full_description_ar = it.full_description_ar || '';
  row.ingredients_ar = it.ingredients_ar || '';
  row.included_items_ar = it.included_items || '';
  row.allergens_ar = it.allergens_ar || '';
  row.portion_description_ar = it.portion_description_ar || '';
  row.packaging_description_ar = it.packaging_description_ar || '';
  row.restaurant_category = it.restaurant_category_name || '';
  row.restaurant_subcategory = it.restaurant_subcategory_name || '';
  row.restaurant_menu_section = it.menu_section_name || '';
  row.restaurant_price = it.price != null ? String(it.price) : '';
  row.compare_at_price = it.compare_at_price != null ? String(it.compare_at_price) : '';
  row.currency = it.currency || 'ILS';
  row.tax_included = it.tax_included === false ? 'false' : 'true';
  row.primary_image_url = it.primary_image || '';
  row.gallery_image_url_1 = it.gallery_images?.[0] || '';
  row.gallery_image_url_2 = it.gallery_images?.[1] || '';
  row.gallery_image_url_3 = it.gallery_images?.[2] || '';
  row.active = it.active === false ? 'false' : 'true';
  row.available = it.available === false ? 'false' : 'true';
  row.sold_out = it.sold_out ? 'true' : 'false';
  row.available_quantity = it.available_quantity != null ? String(it.available_quantity) : '';
  row.daily_capacity = it.daily_capacity != null ? String(it.daily_capacity) : '';
  row.preparation_time_min = it.preparation_time_override != null ? String(it.preparation_time_override) : '';
  row.delivery_fee_override = it.delivery_fee_override != null ? String(it.delivery_fee_override) : '';
  row.minimum_order_override = it.minimum_order_override != null ? String(it.minimum_order_override) : '';
  row.free_delivery_threshold_override = it.free_delivery_threshold_override != null ? String(it.free_delivery_threshold_override) : '';
  row.available_days = (it.available_days || []).join('|');
  row.available_from_time = it.available_from_time || '';
  row.available_until_time = it.available_until_time || '';
  row.tamam_product_id = it.mapped_tamam_product_id || it.meal_id || '';
  row.tamam_product_name_reference = it.meal_name_snapshot || '';
  row.tier = it.mapped_tier || it.package_id || '';
  row.meal_set_variant_id = it.mapped_meal_set_variant_id || '';
  row.meal_set_id = it.mapped_meal_set_id || '';
  row.internal_notes = it.restaurant_notes || '';
  return row;
}
function itemsToCsv(items) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const it of items) {
    const row = rowFromItem(it);
    lines.push(CSV_COLUMNS.map((c) => escCsv(row[c])).join(','));
  }
  return lines.join('\n');
}
function escCsv(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function exportRestaurantMenuCsv(items) { downloadCsv(itemsToCsv(items || []), 'restaurant_menu.csv'); }
export function exportUnmappedCsv(items) { downloadCsv(itemsToCsv((items || []).filter((i) => i.mapping_status === 'unmapped' || i.mapping_status === 'needs_review')), 'restaurant_menu_unmapped.csv'); }
export function exportNoImageCsv(items) { downloadCsv(itemsToCsv((items || []).filter((i) => !i.primary_image && !(i.gallery_images || []).length)), 'restaurant_menu_no_image.csv'); }
export function exportPricesCsv(items) { downloadCsv(itemsToCsv(items || []), 'restaurant_menu_prices.csv'); }
export function exportTamamProductsReferenceCsv(products) {
  const cols = ['tamam_product_id', 'tamam_product_name', 'category', 'menu', 'meal_set_id', 'meal_set_name', 'meal_set_variant_id', 'tier', 'marketing_image_reference'];
  const lines = [cols.join(',')];
  for (const p of products || []) {
    lines.push(cols.map((c) => escCsv(p[c] ?? '')).join(','));
  }
  downloadCsv(lines.join('\n'), 'tamam_master_products_reference.csv');
}

// ---- CSV parse (client-side) ----
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (cells[idx] || '').trim(); });
    obj.__row = i + 1;
    rows.push(obj);
  }
  return rows;
}
function splitCsvLine(line) {
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}
export function validateCsvRow(row, mapping) {
  const errors = [];
  const get = (field) => row[mapping[field]] || row[field] || '';
  const name = get('name_ar') || get('restaurant_product_name');
  if (!name) errors.push('الاسم مطلوب');
  const price = get('price');
  if (price === '' || isNaN(Number(price)) || Number(price) <= 0) errors.push('السعر غير صالح');
  return errors;
}