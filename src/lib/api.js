import { base44 } from '@/api/base44Client';

async function call(action, payload = {}) {
  const res = await base44.functions.invoke('supabaseProxy', { action, payload });
  return res.data.data;
}

// Restaurants
export const getRestaurants = () => call('getRestaurants');

export const getRestaurantBySlug = (slug) => call('getRestaurantBySlug', { slug });

// Menu
export const getMenuCategories = (restaurantId) => call('getMenuCategories', { restaurantId });

export const getMenuItems = (categoryId) => call('getMenuItems', { categoryId });

export const getMenuItemsByRestaurant = async (restaurantId) => {
  const categories = await getMenuCategories(restaurantId);
  if (!categories || !categories.length) return [];
  return Promise.all(
    categories.map(cat =>
      getMenuItems(cat.id)
        .then(items => ({ ...cat, items: items || [] }))
        .catch(() => ({ ...cat, items: [] }))
    )
  );
};

// Extras
export const getExtraGroups = (itemId) => call('getExtraGroups', { itemId });

// Deals
export const getDeals = () => call('getDeals').catch(() => []);

// Orders
export const createOrder = (orderData) => call('createOrder', { orderData });

export const getOrderById = (id) => call('getOrderById', { id });

export const getOrdersByPhone = (phone) => call('getOrdersByPhone', { phone }).catch(() => []);