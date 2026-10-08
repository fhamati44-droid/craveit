import type {
  Category,
  Extra,
  ExtraGroup,
  HomeConfig,
  Id,
  Meal,
  Mood,
  Order,
  Restaurant,
  Suggestion,
  SuggestionItem,
} from "./types";

// Direct Supabase (PostgREST) access — the same project the CRM
// (food-crm-final) and the old site (craveit-nextjs) use.
// The anon key is public by design (it ships in the old site's bundle too);
// what protects the data is Row Level Security on each table.

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://dcpqgxlgiitrdozkykbq.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjcHFneGxnaWl0cmRvemt5a2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjAzMTQsImV4cCI6MjA2MTAzNjMxNH0.lLKNWv3SJMwBx3JXX4GDiWmjA7DZxFXLaGCLHFbKkig";

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

/** Supabase rejected our key (wrong/rotated anon key) — use Base44 meanwhile. */
export const isKeyProblem = (e: unknown) =>
  e instanceof DbError && (e.status === 401 || e.status === 403 || /api key/i.test(e.message));

export async function rest<T>(
  path: string,
  init: { method?: string; body?: unknown; prefer?: string } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: init.method || "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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
        err?.message || `تعذر الاتصال بالخادم (${response.status})`,
        response.status,
        err?.code,
      );
    }
    return data as T;
  } catch (e) {
    if (e instanceof DbError) throw e;
    throw new DbError("ما في اتصال بالإنترنت، أو الخادم مش متاح هسا.", 0);
  } finally {
    clearTimeout(timeout);
  }
}

/** `in.(1,2,3)` filter value; ids are URL-encoded. */
export const inList = (ids: (string | number)[]) =>
  `in.(${ids.map((id) => encodeURIComponent(String(id))).join(",")})`;

/**
 * Data sources, in order of preference:
 *  - Restaurants, menus, extras, orders: Supabase directly (shared with the CRM).
 *  - TAMAM moods / suggestion sets: Supabase `tamam_*` tables once migrated
 *    (supabase/migrations/…_tamam.sql); until then the published Base44 app.
 *  - Homepage CMS: Base44 (optional — the home screen has defaults).
 */
export interface Connection {
  appId: string;
  appBaseUrl: string;
}
export const defaultConnection: Connection = {
  appId: process.env.EXPO_PUBLIC_BASE44_APP_ID || "69eb2d67d2208986b7d60a5d",
  appBaseUrl:
    process.env.EXPO_PUBLIC_BASE44_APP_BASE_URL ||
    "https://crave-it-delivery.base44.app",
};

type Extras = ExtraGroup[];

export function createApi(connection: Connection) {
  async function base44<T>(
    name: string,
    action: string,
    payload: object = {},
  ): Promise<T> {
    if (!connection.appId) throw new Error("Base44 غير مربوط.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(
        `${connection.appBaseUrl || "https://base44.app"}/api/apps/${encodeURIComponent(connection.appId)}/functions/${encodeURIComponent(name)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-App-Id": connection.appId,
          },
          body: JSON.stringify({ action, payload }),
          signal: controller.signal,
        },
      );
      const envelope = (await response.json()) as { data?: T; error?: string };
      if (!response.ok || envelope?.error)
        throw new Error(
          envelope?.error || `تعذر الاتصال بالخادم (${response.status})`,
        );
      return (
        envelope && Object.prototype.hasOwnProperty.call(envelope, "data")
          ? envelope.data
          : envelope
      ) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  // If Supabase rejects the key, keep the app working through the Base44
  // proxy (the previous path) for the rest of the session.
  let useProxy = false;
  async function either<T>(
    fromSupabase: () => Promise<T>,
    fromBase44: () => Promise<T>,
  ): Promise<T> {
    if (useProxy) return fromBase44();
    try {
      return await fromSupabase();
    } catch (e) {
      if (!isKeyProblem(e)) throw e;
      useProxy = true;
      return fromBase44();
    }
  }
  const proxy = <T>(action: string, payload: object = {}) =>
    base44<T>("supabaseProxy", action, payload);

  /** Use the Supabase TAMAM tables when they exist, else Base44. */
  async function tamam<T>(
    fromSupabase: () => Promise<T>,
    fromBase44: () => Promise<T>,
  ): Promise<T> {
    if (useProxy) return fromBase44();
    try {
      return await fromSupabase();
    } catch (e) {
      if (isMissingTable(e) || isKeyProblem(e)) return fromBase44();
      throw e;
    }
  }

  const extras = async (itemId: Id): Promise<Extras> => {
    const groups = await either(
      () =>
        rest<(ExtraGroup & { name?: string })[]>(
          `menu_extra_groups?select=*,menu_extra_options:menu_extras(*)&item_id=eq.${encodeURIComponent(String(itemId))}&order=sort_order.asc`,
        ),
      () => proxy<(ExtraGroup & { name?: string })[]>("getExtraGroups", { itemId }),
    );
    return (groups || []).map((g) => ({
      ...g,
      group_name: g.group_name || g.name_ar || g.name || "إضافات",
      menu_extra_options: [...(g.menu_extra_options || [])].sort(
        (a, b) =>
          Number((a as { sort_order?: number }).sort_order || 0) -
          Number((b as { sort_order?: number }).sort_order || 0),
      ),
    }));
  };

  return {
    restaurants: () =>
      either(
        () => rest<Restaurant[]>("restaurants?select=*&active=eq.true&order=id.asc"),
        () => proxy<Restaurant[]>("getRestaurants"),
      ),
    restaurant: async (id: Id) => {
      const row = await either(
        async () =>
          (
            await rest<Restaurant[]>(
              `restaurants?select=*&id=eq.${encodeURIComponent(String(id))}`,
            )
          )?.[0],
        () => proxy<Restaurant>("getRestaurantById", { id }),
      );
      if (!row) throw new Error("المطعم مش موجود.");
      return row;
    },
    menu: async (restaurantId: Id): Promise<Category[]> => {
      const rid = encodeURIComponent(String(restaurantId));
      type Row = Meal & { category_id: Id; active?: boolean };
      const [categories, meals] = await either(
        () =>
          Promise.all([
            rest<Category[]>(
              `menu_categories?select=*&restaurant_id=eq.${rid}&order=sort_order.asc`,
            ),
            rest<Row[]>(
              `menu_items?select=*&restaurant_id=eq.${rid}&order=sort_order.asc`,
            ),
          ]),
        async () => {
          const cats = await proxy<Category[]>("getMenuCategories", { restaurantId });
          const items = await Promise.all(
            cats.map((c) =>
              proxy<Row[]>("getMenuItems", { categoryId: c.id }).then((rows) =>
                rows.map((m) => ({ ...m, category_id: m.category_id ?? c.id })),
              ),
            ),
          );
          return [cats, items.flat()] as [Category[], Row[]];
        },
      );
      return (categories || []).map((cat) => ({
        ...cat,
        items: (meals || []).filter(
          (m) => String(m.category_id) === String(cat.id) && m.active !== false,
        ),
      }));
    },
    extras,

    home: () => base44<HomeConfig>("homepageEngine", "getPublishedConfig"),

    moods: () =>
      tamam(
        async () => {
          const [moods, sets] = await Promise.all([
            rest<Mood[]>(
              "tamam_moods?select=*&is_active=eq.true&order=sort_order.asc",
            ),
            rest<{ mood_id: Id }[]>(
              "tamam_suggestion_sets?select=mood_id&is_active=eq.true",
            ),
          ]);
          const withSets = new Set(sets.map((s) => String(s.mood_id)));
          return moods.map((m) => ({
            ...m,
            has_suggestions: withSets.has(String(m.id)),
          }));
        },
        () => base44<Mood[]>("homepageEngine", "getPublicMoods"),
      ),
    suggestions: (moodId?: Id) =>
      tamam(
        async () => ({
          sets: await rest<Suggestion[]>(
            `tamam_suggestion_sets?select=*&is_active=eq.true${moodId ? `&mood_id=eq.${encodeURIComponent(String(moodId))}` : ""}&order=sort_order.asc`,
          ),
        }),
        () =>
          base44<{ sets: Suggestion[] }>(
            "homepageEngine",
            moodId ? "getPublicMoodData" : "getPublicSuggestions",
            moodId ? { mood_id: moodId } : {},
          ),
      ),
    suggestion: (id: Id) =>
      tamam(
        async () => {
          const sid = encodeURIComponent(String(id));
          const [sets, items] = await Promise.all([
            rest<Suggestion[]>(`tamam_suggestion_sets?select=*&id=eq.${sid}`),
            rest<SuggestionItem[]>(
              `tamam_suggestion_items?select=*&suggestion_set_id=eq.${sid}&order=sort_order.asc`,
            ),
          ]);
          if (!sets[0]) throw new Error("الاقتراح مش موجود.");
          return { set: sets[0], items };
        },
        () =>
          base44<{ set: Suggestion; items: SuggestionItem[] }>(
            "homepageEngine",
            "getPublicSuggestionSet",
            { set_id: id },
          ),
      ),

    /** Resolve a TAMAM package into real meals, restaurants and add-ons. */
    resolvePackage: async (items: SuggestionItem[]) => {
      const mealIds = [...new Set(items.map((i) => String(i.meal_id)))];
      const restIds = [...new Set(items.map((i) => String(i.restaurant_id)))];
      const extraIds = [
        ...new Set(items.flatMap((i) => (i.selected_addon_ids || []).map(String))),
      ];
      if (!mealIds.length) return [];
      const [meals, restaurants, addons] = await either(
        () =>
          Promise.all([
            rest<Meal[]>(`menu_items?select=*&id=${inList(mealIds)}`),
            rest<Restaurant[]>(`restaurants?select=*&id=${inList(restIds)}`),
            extraIds.length
              ? rest<Extra[]>(`menu_extras?select=*&id=${inList(extraIds)}`)
              : Promise.resolve([] as Extra[]),
          ]),
        () =>
          Promise.all([
            proxy<Meal[]>("getMenuItemsByIds", { ids: mealIds }),
            proxy<Restaurant[]>("getRestaurantsByIds", { ids: restIds }),
            Promise.resolve([] as Extra[]), // no proxy lookup for add-ons by id
          ]),
      );
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

    createOrder: (order: Omit<Order, "id" | "created_at">) =>
      either(
        async () =>
          (
            await rest<Order[]>("orders?select=id", {
              method: "POST",
              body: order,
              prefer: "return=representation",
            })
          )[0],
        () => proxy<Order>("createOrder", { orderData: order }),
      ),
    order: (id: Id) =>
      either(
        async () =>
          (await rest<Order[]>(`orders?select=*&id=eq.${encodeURIComponent(String(id))}`))[0] ||
          null,
        async () => (await proxy<Order | null>("getOrderById", { id })) || null,
      ),
    ordersByIds: (ids: Id[]) =>
      ids.length
        ? either(
            () => rest<Order[]>(`orders?select=*&id=${inList(ids)}&order=created_at.desc`),
            async () =>
              (await Promise.all(ids.map((id) => proxy<Order | null>("getOrderById", { id }))))
                .filter((o): o is Order => !!o),
          )
        : Promise.resolve([] as Order[]),
    ordersByPhone: (phone: string) =>
      either(
        () =>
          rest<Order[]>(
            `orders?select=*&phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=30`,
          ),
        () => proxy<Order[]>("getOrdersByPhone", { phone }),
      ),
  };
}
export type Api = ReturnType<typeof createApi>;
