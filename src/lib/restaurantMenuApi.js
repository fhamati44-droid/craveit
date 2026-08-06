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

// ---- CSV template columns ----
export const CSV_COLUMNS = [
  'restaurant_sku', 'name_ar', 'name_en', 'short_description_ar', 'full_description_ar',
  'ingredients_ar', 'included_items_ar', 'allergens_ar', 'portion_description_ar',
  'category', 'subcategory', 'menu_section', 'price', 'compare_at_price', 'currency',
  'tax_included', 'primary_image_url', 'gallery_image_url_1', 'gallery_image_url_2',
  'gallery_image_url_3', 'active', 'available', 'sold_out', 'available_quantity',
  'preparation_time_min', 'preparation_time_max', 'delivery_fee_override',
  'minimum_order_override', 'available_days', 'available_from_time', 'available_until_time',
  'tamam_product_id', 'tamam_product_name', 'meal_set_name', 'tier', 'internal_notes',
];
export const CSV_TEMPLATE = CSV_COLUMNS.join(',');
export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE + '\n'], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tamam_restaurant_menu_template.csv'; a.click();
  URL.revokeObjectURL(url);
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