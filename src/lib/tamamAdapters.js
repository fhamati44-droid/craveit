/**
 * Data adapters — decouple TAMAM UI components from raw entity/API shapes.
 * Each tolerates optional fields and returns safe fallbacks (never undefined/null/NaN).
 */

export function restaurantToCard(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name || r.name_ar || r.restaurant_name || 'مطعم',
    coverUrl: r.image_url || r.cover_image_url || r.logo_url || null,
    categories: [r.category, r.cuisine_type].filter(Boolean),
    rating: r.rating ?? null,
    deliveryMin: r.delivery_time ?? r.estimated_delivery_time ?? null,
    deliveryFee: r.delivery_fee ?? null,
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