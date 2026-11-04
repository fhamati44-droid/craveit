import { createApi, rest } from "./api";
import { getPublishedMenus, isDailyMenuAvailableOnDate } from "./dailyMeals";
import { mealProfiles } from "./basketProfiles";
import type { Offer } from "./basketEngine";
import type { Meal, Restaurant, Id } from "./types";

export interface OrderableOffer extends Offer {
  meal: Meal; restaurant: Restaurant; dailyMenuId?: number; serviceDate?: string;
}
type MenuRow = Meal & { restaurant_id: Id; active?: boolean; prep_time?: number };
const numberOr = (x: unknown, fallback: number) => x == null || x === "" ? fallback : Number(x);
export async function loadBasketCatalog(): Promise<OrderableOffer[]> {
  const api = createApi();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  // If any source fails, surface the failure rather than quietly rank a partial catalogue.
  const [restaurants, items, homes, daily] = await Promise.all([
    api.restaurants(),
    rest<MenuRow[]>("menu_items?select=*&active=eq.true"),
    api.homeCookedCatalog(),
    getPublishedMenus(date, date),
  ]);
  const byRestaurant = new Map(restaurants.map(r => [String(r.id), r]));
  const result: OrderableOffer[] = [];
  const seen = new Set<string>();
  const add = (uid: string, profileUid: string, meal: Meal, restaurant: Restaurant, kind: Offer["kind"], extrasSourceId: Id | null | undefined, prep: number, dailyMenuId?: number) => {
    const profile = mealProfiles[uid] || mealProfiles[profileUid];
    if (!profile || profile.role === "سوق") return;
    const group = profile.group, key = `${restaurant.id}:${group}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ uid, group, restaurantId: String(restaurant.id), name: meal.name_ar || meal.name || "", description: meal.description_ar || meal.description || "",
      price: Number(meal.price),
      // Daily reservations have their own checkout; that existing flow adds no separate fee.
      delivery: kind === "daily" ? 0 : numberOr(restaurant.delivery_fee, 0),
      minimum: kind === "daily" ? 0 : numberOr(restaurant.min_order ?? restaurant.minimum_order, 0),
      prep: numberOr(prep, 15), transport: 20,
      available: meal.is_available !== false && restaurant.active !== false && restaurant.is_open !== false,
      profile, extrasSourceId, kind, meal, restaurant, dailyMenuId, serviceDate: kind === "daily" ? date : undefined });
  };
  for (const item of items) {
    const restaurant = byRestaurant.get(String(item.restaurant_id));
    if (restaurant && item.active !== false) add(`M${item.id}`, `M${item.id}`, item, restaurant, "menu", undefined, item.prep_time || 15);
  }
  for (const group of homes) for (const { product, offer, restaurant } of group.offers) {
    const meal: Meal = { id: `home-cooked-${product.id}`, name: product.name, name_ar: product.name_ar || undefined,
      name_he: product.name_he || undefined, name_en: product.name_en || undefined, description: product.description || undefined,
      description_ar: product.description_ar || undefined, image_url: product.image_url || undefined, price: Number(offer.price), is_available: offer.is_available };
    add(`H${offer.id}`, `M${product.source_menu_item_id}`, meal, restaurant, "home", offer.extras_source_menu_item_id ?? null, 15);
  }
  for (const menu of daily) {
    const restaurant = byRestaurant.get(String(menu.restaurant_id));
    if (restaurant && isDailyMenuAvailableOnDate(menu, date)) add(`D${menu.id}`, `D${menu.id}`, { id: `daily-${menu.id}`, name: menu.title, name_ar: menu.title, price: Number(menu.price), image_url: menu.image_url || undefined }, restaurant, "daily", null, 30, menu.id);
  }
  return result;
}
