/**
 * Data adapters — decouple TAMAM UI components from raw entity/API shapes.
 * Each tolerates optional fields and returns safe fallbacks (never undefined/null/NaN).
 */

export function restaurantToCard(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name_ar || r.name || r.restaurant_name || 'مطعم',
    coverUrl: r.cover_url || r.image_url || r.cover_image_url || null,
    logoUrl: r.logo_url || r.image_url || null,
    categories: [r.category, r.cuisine_type].filter(Boolean),
    description: r.description_ar || r.description || null,
    rating: r.rating ?? null,
    reviewCount: r.review_count ?? r.reviews_count ?? r.ratings_count ?? null,
    deliveryMin: r.delivery_time ?? r.estimated_delivery_time ?? null,
    deliveryFee: r.delivery_fee ?? null,
    minOrder: r.min_order ?? r.minimum_order ?? null,
    isOpen: r.is_open ?? r.active ?? true,
  };
}

export function mealToCard(m) {
  if (!m) return null;
  return {
    id: m.id,
    name: m.name || m.name_ar || 'وجبة',
    imageUrl: m.image_url || null,
    price: m.price ?? null,
    description: m.description || m.description_ar || '',
    available: m.is_available ?? m.available ?? true,
    badge: m.badge_text || m.badge || null,
  };
}

export function suggestionToCard(s, opts = {}) {
  if (!s) return null;
  return {
    id: s.id,
    tier: s.package_level || 'classic',
    name: s.title_ar || s.title || 'اقتراح TAMAM',
    imageUrl: s.hero_image_url || opts.imageUrl || null,
    summary: s.description_ar || s.description || opts.summary || '',
    price:
      s.display_price_override != null
        ? s.display_price_override
        : (s.display_price ?? opts.totalPrice ?? null),
    peopleCount: opts.peopleCount ?? null,
  };
}

export function normalizeMood(record) {
  if (!record?.id) return null;
  const name =
    record.name_ar ?? record.arabic_name ?? record.name ??
    record.title_ar ?? record.title ?? record.label ?? record.mood_name;
  if (!name) return null;
  return {
    id: String(record.id),
    name: String(name),
    name_ar: String(name),
    slug: record.slug || null,
    icon: record.icon ?? record.emoji ?? record.symbol ?? null,
    description: record.description_ar ?? record.description ?? null,
    image: record.image_url ?? record.image ?? record.cover_image ?? record.media ?? null,
    image_url: record.image_url ?? record.image ?? record.cover_image ?? null,
    sortOrder: Number(record.sort_order ?? record.order ?? record.priority ?? 0),
    isActive: record.is_active !== false,
    hasSuggestions: Boolean(record.has_suggestions),
    raw: record,
  };
}

export function extractRecords(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

export function dealToCard(d) {
  if (!d) return null;
  return {
    id: d.id,
    name: d.title || d.title_ar || d.name || 'صفقة جماعية',
    imageUrl: d.image_url || d.hero_image_url || null,
    restaurantName: d.restaurant_name || null,
    currentPrice: d.current_price ?? d.price ?? null,
    originalPrice: d.original_price ?? null,
    participants: d.participants_count ?? d.participants ?? 0,
    nextThreshold: d.next_threshold ?? null,
    endAt: d.end_time || d.valid_until || null,
  };
}