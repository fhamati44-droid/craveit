const BASE_URL = 'https://dcpqgxlgiitrdozkykbq.supabase.co/rest/v1';

// The anon key is public and safe to use in frontend
// It's the Supabase public/anon key with row-level security
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjcHFneGxnaWl0cmRvemt5a2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjAzMTQsImV4cCI6MjA2MTAzNjMxNH0.lLKNWv3SJMwBx3JXX4GDiWmjA7DZxFXLaGCLHFbKkig';

const getHeaders = () => ({
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
});

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API error ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// Restaurants
export const getRestaurants = () =>
  apiFetch('/restaurants?select=*&active=eq.true&order=rating.desc');

export const getRestaurantBySlug = (slug) =>
  apiFetch(`/restaurants?select=*&slug=eq.${slug}`).then(r => Array.isArray(r) ? r[0] : r);

// Menu Categories
export const getMenuCategories = (restaurantId) =>
  apiFetch(`/menu_categories?select=*&restaurant_id=eq.${restaurantId}&order=sort_order.asc`);

// Menu Items for a category
export const getMenuItems = (categoryId) =>
  apiFetch(`/menu_items?select=*&category_id=eq.${categoryId}&order=sort_order.asc`);

// Full menu: categories + items
export const getMenuItemsByRestaurant = async (restaurantId) => {
  const categories = await getMenuCategories(restaurantId);
  if (!categories || !categories.length) return [];
  const itemsPerCategory = await Promise.all(
    categories.map(cat =>
      getMenuItems(cat.id)
        .then(items => ({ ...cat, items: items || [] }))
        .catch(() => ({ ...cat, items: [] }))
    )
  );
  return itemsPerCategory;
};

// Extra groups for an item
export const getExtraGroups = (itemId) =>
  apiFetch(`/menu_extra_groups?select=*,menu_extra_options(*)&item_id=eq.${itemId}`)
    .catch(() => []);

// Deals
export const getDeals = () =>
  apiFetch('/deals?select=*&active=eq.true&order=created_at.desc')
    .catch(() => []);

// Orders
export const createOrder = (orderData) =>
  apiFetch('/orders', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(orderData),
  }).then(r => Array.isArray(r) ? r[0] : r);

export const getOrderById = (id) =>
  apiFetch(`/orders?select=*&id=eq.${id}`).then(r => Array.isArray(r) ? r[0] : r);

export const getOrdersByPhone = (phone) =>
  apiFetch(`/orders?select=*&phone=eq.${encodeURIComponent(phone)}&order=created_at.desc`)
    .catch(() => []);