import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://dcpqgxlgiitrdozkykbq.supabase.co/rest/v1';

function getHeaders() {
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

async function supaFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

Deno.serve(async (req) => {
  try {
    const { action, payload } = await req.json();

    let result;

    switch (action) {
      case 'getRestaurants':
        result = await supaFetch('/restaurants?select=*&active=eq.true&order=id.asc');
        break;

      case 'getRestaurantBySlug':
        result = await supaFetch(`/restaurants?select=*&slug=eq.${payload.slug}`);
        result = Array.isArray(result) ? result[0] : result;
        break;

      case 'getMenuCategories':
        result = await supaFetch(`/menu_categories?select=*&restaurant_id=eq.${payload.restaurantId}&order=sort_order.asc`);
        break;

      case 'getMenuItems':
        result = await supaFetch(`/menu_items?select=*&category_id=eq.${payload.categoryId}&order=sort_order.asc`);
        break;

      case 'getExtraGroups': {
        const groups = await supaFetch(`/menu_extra_groups?select=*&item_id=eq.${payload.itemId}&order=sort_order.asc`);
        if (!groups || !groups.length) { result = []; break; }
        result = await Promise.all(
          groups.map(g =>
            supaFetch(`/menu_extras?select=*&group_id=eq.${g.id}&order=sort_order.asc`)
              .then(opts => ({ ...g, menu_extra_options: opts || [] }))
              .catch(() => ({ ...g, menu_extra_options: [] }))
          )
        );
        break;
      }

      case 'getDeals':
        result = await supaFetch('/deals?select=*&active=eq.true&order=sort_order.asc');
        break;

      case 'createOrder':
        result = await supaFetch('/orders', {
          method: 'POST',
          body: JSON.stringify(payload.orderData),
        });
        result = Array.isArray(result) ? result[0] : result;
        break;

      case 'getOrderById':
        result = await supaFetch(`/orders?select=*&id=eq.${payload.id}`);
        result = Array.isArray(result) ? result[0] : result;
        break;

      case 'getOrdersByPhone':
        result = await supaFetch(`/orders?select=*&phone=eq.${encodeURIComponent(payload.phone)}&order=created_at.desc`);
        break;

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});