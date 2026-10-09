import type {
  Category,
  Extra,
  ExtraGroup,
  Id,
  Meal,
  Mood,
  Order,
  Restaurant,
  SiteSettings,
  Suggestion,
  SuggestionItem,
} from "./types";

// Error messages that are translation keys (errOffline…) are shown translated
// by the UI (see useT().msg).
// Everything goes to Supabase directly — the same project the CRM
// (food-crm-final) and the old site (craveit-nextjs) use. No Base44.
// The anon key is public by design (it ships in every web bundle); what
// protects the data is Row Level Security on each table.

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://dcpqgxlgiitrdozkykbq.supabase.co";
// Public anon key (role "anon", project dcpqgxlgiitrdozkykbq) — same value as
// NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel. Safe to ship; RLS protects data.
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjcHFneGxnaWl0cmRvemt5a2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTg2NzQsImV4cCI6MjA5MDg5NDY3NH0.smWoCEMbvQ2XwO-N40vTUh1vE6g5kFbwBfAZt9JpGWk";

export class DbError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** True when a table/view does not exist yet (e.g. TAMAM tables before migration). */
export const isMissingTable = (e: unknown) =>
  e instanceof DbError &&
  (e.code === "PGRST205" || e.code === "42P01" || e.status === 404);

export async function rest<T>(
  path: string,
  init: { method?: string; body?: unknown; prefer?: string } = {},
  key: string = SUPABASE_ANON_KEY,
): Promise<T> {
  if (!key)
    throw new DbError(
      "errNoKey",
      401,
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: init.method || "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    if (response.status === 204) return null as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const err = data as { message?: string; code?: string } | null;
      throw new DbError(
        err?.message || "errServer",
        response.status,
        err?.code,
      );
    }
    return data as T;
  } catch (e) {
    if (e instanceof DbError) throw e;
    throw new DbError("errOffline", 0);
  } finally {
    clearTimeout(timeout);
  }
}

/** `in.(1,2,3)` filter value; ids are URL-encoded. */
export const inList = (ids: (string | number)[]) =>
  `in.(${ids.map((id) => encodeURIComponent(String(id))).join(",")})`;
const eq = (value: Id) => `eq.${encodeURIComponent(String(value))}`;

/** TAMAM tables may not exist until the migration SQL has run. */
async function orEmpty<T>(load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (e) {
    if (isMissingTable(e)) return [];
    throw e;
  }
}

/** `key` is only overridable for tests. */
export function createApi(key: string = SUPABASE_ANON_KEY) {
  const get = <T>(path: string) => rest<T>(path, {}, key);
  return {
    restaurants: () =>
      get<Restaurant[]>("restaurants?select=*&active=eq.true&order=id.asc"),
    restaurant: async (id: Id) => {
      const rows = await get<Restaurant[]>(`restaurants?select=*&id=${eq(id)}`);
      if (!rows?.[0]) throw new Error("errNotFound");
      return rows[0];
    },
    menu: async (restaurantId: Id): Promise<Category[]> => {
      const [categories, meals] = await Promise.all([
        get<Category[]>(
          `menu_categories?select=*&restaurant_id=${eq(restaurantId)}&order=sort_order.asc`,
        ),
        get<(Meal & { category_id: Id; active?: boolean })[]>(
          `menu_items?select=*&restaurant_id=${eq(restaurantId)}&order=sort_order.asc`,
        ),
      ]);
      return (categories || []).map((cat) => ({
        ...cat,
        items: (meals || []).filter(
          (m) => String(m.category_id) === String(cat.id) && m.active !== false,
        ),
      }));
    },
    extras: async (itemId: Id): Promise<ExtraGroup[]> => {
      const groups = await get<(ExtraGroup & { name?: string })[]>(
        `menu_extra_groups?select=*,menu_extra_options:menu_extras(*)&item_id=${eq(itemId)}&order=sort_order.asc`,
      );
      return (groups || []).map((g) => ({
        ...g,
        group_name: g.group_name || g.name_ar || g.name || "+",
        menu_extra_options: [...(g.menu_extra_options || [])].sort(
          (a, b) =>
            Number((a as { sort_order?: number }).sort_order || 0) -
            Number((b as { sort_order?: number }).sort_order || 0),
        ),
      }));
    },

    /** Branding/covers the old site already manages (table `site_settings`). */
    settings: async () => {
      const rows = await orEmpty(() =>
        get<SiteSettings[]>("site_settings?select=*&id=eq.1"),
      );
      return rows[0] || null;
    },

    moods: async () => {
      const [moods, sets] = await Promise.all([
        orEmpty(() =>
          get<Mood[]>("tamam_moods?select=*&is_active=eq.true&order=sort_order.asc"),
        ),
        orEmpty(() =>
          get<{ mood_id: Id }[]>("tamam_suggestion_sets?select=mood_id&is_active=eq.true"),
        ),
      ]);
      const withSets = new Set(sets.map((s) => String(s.mood_id)));
      return moods.map((m) => ({ ...m, has_suggestions: withSets.has(String(m.id)) }));
    },
    suggestions: async (moodId?: Id) => ({
      sets: await orEmpty(() =>
        get<Suggestion[]>(
          `tamam_suggestion_sets?select=*&is_active=eq.true${moodId ? `&mood_id=${eq(moodId)}` : ""}&order=sort_order.asc`,
        ),
      ),
    }),
    suggestion: async (id: Id) => {
      const [sets, items] = await Promise.all([
        get<Suggestion[]>(`tamam_suggestion_sets?select=*&id=${eq(id)}`),
        get<SuggestionItem[]>(
          `tamam_suggestion_items?select=*&suggestion_set_id=${eq(id)}&order=sort_order.asc`,
        ),
      ]);
      if (!sets[0]) throw new Error("errNotFound");
      return { set: sets[0], items };
    },

    /** Resolve a TAMAM package into real meals, restaurants and add-ons. */
    resolvePackage: async (items: SuggestionItem[]) => {
      const mealIds = [...new Set(items.map((i) => String(i.meal_id)))];
      const restIds = [...new Set(items.map((i) => String(i.restaurant_id)))];
      const extraIds = [
        ...new Set(items.flatMap((i) => (i.selected_addon_ids || []).map(String))),
      ];
      if (!mealIds.length) return [];
      const [meals, restaurants, addons] = await Promise.all([
        get<Meal[]>(`menu_items?select=*&id=${inList(mealIds)}`),
        get<Restaurant[]>(`restaurants?select=*&id=${inList(restIds)}`),
        extraIds.length
          ? get<Extra[]>(`menu_extras?select=*&id=${inList(extraIds)}`)
          : Promise.resolve([] as Extra[]),
      ]);
      return items.flatMap((item) => {
        const meal = meals.find((m) => String(m.id) === String(item.meal_id));
        const restaurant = restaurants.find(
          (r) => String(r.id) === String(item.restaurant_id),
        );
        if (!meal || !restaurant) return [];
        const chosen = (item.selected_addon_ids || []).map(String);
        return [
          {
            meal,
            restaurant,
            quantity: Math.max(1, Number(item.quantity || 1)),
            extras: addons.filter((a) => chosen.includes(String(a.id))),
            note: item.item_note || "",
          },
        ];
      });
    },

    createOrder: async (order: Omit<Order, "id" | "created_at">) => {
      const rows = await rest<Order[]>(
        "orders?select=id",
        { method: "POST", body: order, prefer: "return=representation" },
        key,
      );
      return rows[0];
    },
    order: async (id: Id) =>
      (await get<Order[]>(`orders?select=*&id=${eq(id)}`))[0] || null,
    ordersByIds: (ids: Id[]) =>
      ids.length
        ? get<Order[]>(`orders?select=*&id=${inList(ids)}&order=created_at.desc`)
        : Promise.resolve([] as Order[]),
    ordersByPhone: (phone: string) =>
      get<Order[]>(`orders?select=*&phone=${eq(phone)}&order=created_at.desc&limit=30`),
  };
}
export type Api = ReturnType<typeof createApi>;
