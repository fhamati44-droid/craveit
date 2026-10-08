import type {
  Category,
  ExtraGroup,
  HomeConfig,
  Id,
  Meal,
  Mood,
  Restaurant,
  Suggestion,
} from "./types";

export interface Connection {
  appId: string;
  appBaseUrl: string;
}
export const defaultConnection: Connection = {
  appId: process.env.EXPO_PUBLIC_BASE44_APP_ID || "69eb2d67d2208986b7d60a5d",
  appBaseUrl: process.env.EXPO_PUBLIC_BASE44_APP_BASE_URL || "https://crave-it-delivery.base44.app",
};
export function createApi(connection: Connection) {
  async function invoke<T>(
    name: string,
    action: string,
    payload: object = {},
  ): Promise<T> {
    if (!connection.appId)
      throw new Error("يلزم ربط التطبيق بخادم CraveIt من صفحة حسابي.");
    // Same HTTPS function contract as @base44/sdk 0.8.53; the SDK's invoke
    // references browser File globals that are unavailable on React Native.
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
  const proxy = <T>(action: string, payload = {}) =>
    invoke<T>("supabaseProxy", action, payload);
  return {
    restaurants: () => proxy<Restaurant[]>("getRestaurants"),
    restaurant: (id: Id) => proxy<Restaurant>("getRestaurantById", { id }),
    menu: async (restaurantId: Id): Promise<Category[]> => {
      const categories = await proxy<Category[]>("getMenuCategories", {
        restaurantId,
      });
      return Promise.all(
        categories.map(async (cat) => ({
          ...cat,
          items: await proxy<Meal[]>("getMenuItems", { categoryId: cat.id }),
        })),
      );
    },
    extras: (itemId: Id) => proxy<ExtraGroup[]>("getExtraGroups", { itemId }),
    home: () => invoke<HomeConfig>("homepageEngine", "getPublishedConfig"),
    moods: () => invoke<Mood[]>("homepageEngine", "getPublicMoods"),
    suggestions: (moodId?: Id) =>
      invoke<{ sets: Suggestion[] }>(
        "homepageEngine",
        moodId ? "getPublicMoodData" : "getPublicSuggestions",
        moodId ? { mood_id: moodId } : {},
      ),
    suggestion: (id: Id) =>
      invoke<{
        set: Suggestion;
        items: { meal_id: Id; restaurant_id: Id; quantity?: number }[];
      }>("homepageEngine", "getPublicSuggestionSet", { set_id: id }),
  };
}
export type Api = ReturnType<typeof createApi>;
