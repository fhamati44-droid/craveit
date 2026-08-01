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

// Resolve raw menu_items rows into enriched meal objects with restaurant + customization flags.
async function enrichMeals(meals, excludeIds = []) {
  const filtered = excludeIds.length ? meals.filter((m) => !excludeIds.includes(m.id)) : meals;
  const restIds = [...new Set(filtered.map((m) => m.restaurant_id).filter(Boolean))];
  let restMap = {};
  if (restIds.length) {
    const rests = await supaFetch(`/restaurants?select=id,name,name_ar,slug,active&id=in.(${restIds.join(',')})`);
    (rests || []).forEach((r) => { restMap[r.id] = r; });
  }
  const itemIds = filtered.map((m) => m.id);
  let groupMap = {};
  if (itemIds.length) {
    const groups = await supaFetch(`/menu_extra_groups?select=item_id,required&item_id=in.(${itemIds.join(',')})`);
    (groups || []).forEach((g) => { (groupMap[g.item_id] = groupMap[g.item_id] || []).push(g); });
  }
  return filtered.filter((m) => { const r = restMap[m.restaurant_id]; return r && r.active !== false; }).map((m) => {
    const r = restMap[m.restaurant_id];
    const groups = groupMap[m.id] || [];
    return {
      id: m.id, name: m.name_ar || m.name, name_ar: m.name_ar, name_en: m.name,
      description: m.description_ar || m.description || '',
      price: m.price, image_url: m.image_url, category_id: m.category_id,
      restaurant_id: m.restaurant_id, restaurant_name: r.name_ar || r.name, restaurant_slug: r.slug,
      is_available: m.is_available !== false,
      prep_time: m.prep_time || m.preparation_time || m.prep_time_minutes || null,
      serves_count: m.serves_count || m.people_count || m.family_meal || null,
      has_extras: groups.length > 0,
      has_required_extras: groups.some((g) => g.required === true || g.required === 'true' || g.required === 1),
      created_at: m.created_at || null,
    };
  });
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

      case 'getRestaurantById':
        result = await supaFetch(`/restaurants?select=*&id=eq.${payload.id}`);
        result = Array.isArray(result) ? result[0] : result;
        break;

      case 'getMenuCategories':
        result = await supaFetch(`/menu_categories?select=*&restaurant_id=eq.${payload.restaurantId}&order=sort_order.asc`);
        break;

      case 'getMenuItems':
        result = await supaFetch(`/menu_items?select=*&category_id=eq.${payload.categoryId}&order=sort_order.asc`);
        break;

      case 'getAllMenuCategories':
        result = await supaFetch('/menu_categories?select=id,restaurant_id,name,name_ar');
        break;

      case 'getMenuItemsByIds': {
        const ids = (payload.ids || []).join(',');
        if (!ids) { result = []; break; }
        result = await supaFetch(`/menu_items?select=*&id=in.(${ids})`);
        break;
      }

      case 'getRestaurantsByIds': {
        const rIds = (payload.ids || []).join(',');
        if (!rIds) { result = []; break; }
        result = await supaFetch(`/restaurants?select=*&id=in.(${rIds})`);
        break;
      }

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

      case 'getPopularMeals': {
        const orders = await supaFetch('/orders?select=kitchen_id,order_items,status&order=created_at.desc&limit=200');
        const counts = {};
        (orders || []).forEach(o => {
          (o.order_items || []).forEach(it => {
            const name = (it.name || '').trim();
            if (!name) return;
            if (!counts[name]) counts[name] = { name, count: 0, price: it.price || 0, kitchen_id: o.kitchen_id };
            counts[name].count += (it.quantity || 1);
            if (!counts[name].price && it.price) counts[name].price = it.price;
          });
        });
        result = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, payload?.limit || 10);
        break;
      }

      case 'inspectOrders':
        result = await supaFetch('/orders?select=*&limit=1');
        break;

      case 'getMostOrderedMeals': {
        const days = Number(payload?.days) || 30;
        const limit = Number(payload?.limit) || 8;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const orders = await supaFetch(`/orders?select=kitchen_id,order_items,status,created_at&created_at=gte.${since}&order=created_at.desc&limit=500`);
        const counts = {};
        (orders || []).forEach((o) => {
          (o.order_items || []).forEach((it) => {
            const name = (it.name || '').trim();
            if (!name) return;
            const key = `${o.kitchen_id}:${name}`;
            if (!counts[key]) counts[key] = { name, count: 0, price: it.price || 0, kitchen_id: o.kitchen_id };
            counts[key].count += (it.quantity || 1);
            if (!counts[key].price && it.price) counts[key].price = it.price;
          });
        });
        const ranked = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, limit);
        // Resolve meal records by name+restaurant
        if (ranked.length) {
          const restaurants = await supaFetch('/restaurants?select=*&active=eq.true');
          const restMap = {};
          (restaurants || []).forEach((r) => { restMap[r.id] = r; });
          const names = ranked.map((r) => r.name).map((n) => `'${n.replace(/'/g, "''")}'`).join(',');
          const meals = await supaFetch(`/menu_items?select=id,name,name_ar,price,image_url,category_id,restaurant_id,is_available&name=in.(${names})`);
          const mealMap = {};
          (meals || []).forEach((m) => { mealMap[`${m.restaurant_id}:${m.name}`] = m; });
          ranked.forEach((r) => {
            const meal = mealMap[`${r.kitchen_id}:${r.name}`];
            r.meal_id = meal?.id || null;
            r.meal = meal || null;
            r.restaurant = restMap[r.kitchen_id] || null;
          });
        }
        result = ranked.filter((r) => r.meal_id && r.restaurant);
        break;
      }

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

      case 'getMealsByCategoryNames': {
        const names = (payload?.names || []).map((n) => String(n).trim()).filter(Boolean);
        const perCategory = Number(payload?.perCategory) || 6;
        if (!names.length) { result = []; break; }
        const allCats = await supaFetch('/menu_categories?select=id,restaurant_id,name,name_ar');
        const nameSet = new Set(names);
        const matched = (allCats || []).filter((c) => nameSet.has((c.name_ar || '').trim()) || nameSet.has((c.name || '').trim()));
        const catIds = matched.map((c) => c.id);
        let meals = [];
        if (catIds.length) {
          meals = await supaFetch(`/menu_items?select=id,name,name_ar,price,image_url,category_id,restaurant_id,is_available&category_id=in.(${catIds.join(',')})&is_available=eq.true`);
        }
        const byCat = {};
        (meals || []).forEach((m) => { (byCat[m.category_id] = byCat[m.category_id] || []).push(m); });
        const catName = {};
        matched.forEach((c) => { catName[c.id] = (c.name_ar || c.name || '').trim(); });
        const restIds = [...new Set((meals || []).map((m) => m.restaurant_id))];
        let restMap = {};
        if (restIds.length) {
          const rests = await supaFetch('/restaurants?select=id,name,name_ar,active&active=eq.true');
          (rests || []).forEach((r) => { restMap[r.id] = r; });
        }
        result = matched.map((c) => ({
          id: c.id,
          name: catName[c.id],
          meals: (byCat[c.id] || []).slice(0, perCategory).map((m) => ({
            ...m, restaurant_name: restMap[m.restaurant_id]?.name_ar || restMap[m.restaurant_id]?.name || '',
          })).filter((m) => restMap[m.restaurant_id]),
        })).filter((c) => c.meals.length > 0);
        break;
      }
      case 'getMealsByIdsResolved': {
        const ids = (payload.ids || []).filter(Boolean);
        if (!ids.length) { result = []; break; }
        const meals = await supaFetch(`/menu_items?select=*&id=in.(${ids.join(',')})`);
        result = await enrichMeals(meals || []);
        break;
      }
      case 'getMealsByPriceRange': {
        const min = Number(payload.min) || 0;
        const max = payload.max != null ? Number(payload.max) : null;
        const limit = Number(payload.limit) || 8;
        const excludeIds = (payload.excludeIds || []).filter(Boolean);
        let path = `/menu_items?select=*&price=gte.${min}&is_available=eq.true&order=sort_order.asc&limit=${limit * 4}`;
        if (max != null) path = `/menu_items?select=*&price=gte.${min}&price=lte.${max}&is_available=eq.true&order=sort_order.asc&limit=${limit * 4}`;
        const meals = await supaFetch(path);
        result = (await enrichMeals(meals || [], excludeIds)).slice(0, limit);
        break;
      }
      case 'getNewMeals': {
        const days = Number(payload.days) || 30;
        const limit = Number(payload.limit) || 8;
        const excludeIds = (payload.excludeIds || []).filter(Boolean);
        const since = new Date(Date.now() - days * 86400000).toISOString();
        let meals = [];
        try { meals = await supaFetch(`/menu_items?select=*&created_at=gte.${since}&is_available=eq.true&order=created_at.desc&limit=${limit * 4}`); }
        catch (e) { meals = await supaFetch(`/menu_items?select=*&is_available=eq.true&order=id.desc&limit=${limit * 4}`); }
        result = (await enrichMeals(meals || [], excludeIds)).slice(0, limit);
        break;
      }
      case 'getRandomMeals': {
        const limit = Number(payload.limit) || 8;
        const excludeIds = (payload.excludeIds || []).filter(Boolean);
        const meals = await supaFetch(`/menu_items?select=*&is_available=eq.true&order=id.desc&limit=${limit * 5}`);
        const enriched = await enrichMeals(meals || [], excludeIds);
        for (let i = enriched.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [enriched[i], enriched[j]] = [enriched[j], enriched[i]]; }
        result = enriched.slice(0, limit);
        break;
      }
      case 'getMealsByCategoryNamesFlat': {
        const names = (payload.names || []).map((n) => String(n).trim()).filter(Boolean);
        const limit = Number(payload.limit) || 8;
        const excludeIds = (payload.excludeIds || []).filter(Boolean);
        if (!names.length) { result = []; break; }
        const allCats = await supaFetch('/menu_categories?select=id,name,name_ar');
        const nameSet = new Set(names);
        const matched = (allCats || []).filter((c) => nameSet.has((c.name_ar || '').trim()) || nameSet.has((c.name || '').trim()));
        const catIds = matched.map((c) => c.id);
        let meals = [];
        if (catIds.length) meals = await supaFetch(`/menu_items?select=*&category_id=in.(${catIds.join(',')})&is_available=eq.true&order=sort_order.asc&limit=${limit * 4}`);
        result = (await enrichMeals(meals || [], excludeIds)).slice(0, limit);
        break;
      }
      case 'getCompletedOrderStats': {
        const days = Number(payload.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const orders = await supaFetch(`/orders?select=phone,status,created_at&created_at=gte.${since}`);
        const completed = (orders || []).filter((o) => o.status === 'delivered' || o.status === 'completed' || o.status === 'paid');
        const phones = new Set(completed.map((o) => o.phone).filter(Boolean));
        result = { total_orders: completed.length, unique_customers: phones.size, period_days: days };
        break;
      }
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});