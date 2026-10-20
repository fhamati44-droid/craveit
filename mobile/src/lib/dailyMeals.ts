import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./api";
import type { Id } from "./types";
import type { DailyCategory, SharedDailyCategory } from "./dailyMealOptionRules";
export { DAILY_CATEGORIES, SHARED_DAILY_CATEGORIES, getVisibleDailyCategories, getVisibleDailyOptions } from "./dailyMealOptionRules";
export type { DailyCategory, SharedDailyCategory } from "./dailyMealOptionRules";


export interface DailyMenu {
  id: number;
  restaurant_id: number;
  service_date: string;
  title: string;
  price: number;
  image_url?: string | null;
  published: boolean;
  created_at?: string;
}
export interface DailyOption {
  id: number;
  menu_id: number | null;
  category: DailyCategory;
  name: string;
  name_ar?: string | null;
  image_url?: string | null;
  description?: string | null;
  sort_order: number;
  active: boolean;
}
export interface DailyMenuOptionOverride {
  menu_id: number;
  category: SharedDailyCategory;
  option_ids: number[];
}

export interface DailyReservation {
  id: number;
  menu_id: number;
  customer_name: string;
  phone: string;
  quantity: number;
  selected_options: Record<string, unknown>;
  unit_price: number;
  status: "new" | "confirmed" | "cancelled" | "completed";
  created_at: string;
}
export interface AdminSession {
  access_token: string;
  user: { id: string; email?: string };
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return null as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body as { message?: string } | null;
    throw new Error(error?.message || `Supabase request failed (${response.status})`);
  }
  return body as T;
}

export const getPublishedMenus = (fromDate: string, toDate: string) =>
  request<DailyMenu[]>(`daily_menus?select=*&published=eq.true&service_date=gte.${encodeURIComponent(fromDate)}&service_date=lte.${encodeURIComponent(toDate)}&order=service_date.asc`);

export const getPublicOptions = (menuIds: number[]) => {
  if (!menuIds.length) return Promise.resolve([] as DailyOption[]);
  const ids = menuIds.map(String).join(",");
  const menuOrShared = encodeURIComponent(`(menu_id.in.(${ids}),menu_id.is.null)`);
  return request<DailyOption[]>(`daily_menu_options?select=*&active=eq.true&or=${menuOrShared}&order=sort_order.asc`);
};

export const getPublicMenuOptionOverrides = (menuIds: number[]) => {
  if (!menuIds.length) return Promise.resolve([] as DailyMenuOptionOverride[]);
  const ids = encodeURIComponent(menuIds.map(String).join(","));
  return request<DailyMenuOptionOverride[]>(`daily_menu_option_overrides?select=*&menu_id=in.(${ids})`)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("daily_menu_option_overrides") || message.includes("PGRST205")) return [];
      throw error;
    });
};

export async function submitDailyReservation(input: {
  menu_id: number;
  customer_name: string;
  phone: string;
  quantity: number;
  selected_options: Partial<Record<DailyCategory, number>>;
  unit_price: number;
}) {
  await request<null>("daily_meal_reservations", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...input, status: "new" }),
  });
}

export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await response.json().catch(() => null) as (AdminSession & { error_description?: string; msg?: string }) | null;
  if (!response.ok || !data?.access_token || !data.user?.id)
    throw new Error(data?.error_description || data?.msg || "تعذر تسجيل الدخول");
  const allowed = await request<{ user_id: string }[]>(`daily_meal_admins?select=user_id&user_id=eq.${encodeURIComponent(data.user.id)}`, {}, data.access_token);
  if (!allowed.length) throw new Error("هذا الحساب غير مخوّل لإدارة وجبات اليوم.");
  return { access_token: data.access_token, user: data.user };
}

export async function sendAdminPasswordRecovery(email: string, redirectTo: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { msg?: string; message?: string } | null;
    throw new Error(data?.msg || data?.message || "تعذر إرسال رابط تعيين كلمة المرور");
  }
}

export async function setAdminPassword(accessToken: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { msg?: string; message?: string } | null;
    throw new Error(data?.msg || data?.message || "تعذر حفظ كلمة المرور");
  }
}

export async function uploadDailyMealImage(accessToken: string, menuId: number, file: File, kind: "option" | "cover" = "option") {
  if (!file.type.startsWith("image/")) throw new Error("الملف لازم يكون صورة.");
  if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة لازم يكون أقل من 5 ميغابايت.");
  const safeName = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "meal-image";
  const uniqueId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const objectPath = `${menuId}/${kind === "cover" ? "cover/" : ""}${uniqueId}-${safeName}`;
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/daily-meal-images/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: file,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(data?.message || data?.error || "تعذر رفع الصورة. تأكد من إعداد مساحة صور وجبة اليوم في Supabase.");
  }
  return `${SUPABASE_URL}/storage/v1/object/public/daily-meal-images/${encodedPath}`;
}

export const getAdminMenus = (token: string) =>
  request<DailyMenu[]>("daily_menus?select=*&order=service_date.desc,id.desc", {}, token);
export const getAdminOptions = (token: string) =>
  request<DailyOption[]>("daily_menu_options?select=*&order=menu_id.desc,sort_order.asc", {}, token);

export const getAdminMenuOptionOverrides = (token: string) =>
  request<DailyMenuOptionOverride[]>("daily_menu_option_overrides?select=*&order=menu_id.asc,category.asc", {}, token)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("daily_menu_option_overrides") || message.includes("PGRST205")) return [];
      throw error;
    });
export const getAdminReservations = (token: string) =>
  request<DailyReservation[]>("daily_meal_reservations?select=*&order=created_at.desc&limit=100", {}, token);

export const saveAdminMenu = (token: string, menu: Partial<DailyMenu> & Pick<DailyMenu, "restaurant_id" | "service_date" | "title" | "price">) =>
  request<DailyMenu[]>(`daily_menus?select=*${menu.id ? `&id=eq.${encodeURIComponent(String(menu.id))}` : ""}`, {
    method: menu.id ? "PATCH" : "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(menu),
  }, token);

export const saveAdminOption = (token: string, option: Partial<DailyOption> & Pick<DailyOption, "category" | "name"> & { menu_id: number | null }) =>
  request<DailyOption[]>(`daily_menu_options?select=*${option.id ? `&id=eq.${encodeURIComponent(String(option.id))}` : ""}`, {
    method: option.id ? "PATCH" : "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(option),
  }, token);

export const saveAdminMenuOptionOverride = (token: string, override: DailyMenuOptionOverride) =>
  request<DailyMenuOptionOverride[]>("daily_menu_option_overrides?on_conflict=menu_id,category&select=*", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...override, option_ids: override.option_ids.map(Number), updated_at: new Date().toISOString() }),
  }, token);

export const deleteAdminMenuOptionOverride = (token: string, menuId: number, category: SharedDailyCategory) =>
  request<null>(`daily_menu_option_overrides?menu_id=eq.${menuId}&category=eq.${category}`, { method: "DELETE" }, token);

export const updateAdminReservation = (token: string, id: Id, status: DailyReservation["status"]) =>
  request<null>(`daily_meal_reservations?id=eq.${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  }, token);

export const deleteAdminOption = (token: string, id: Id) =>
  request<null>(`daily_menu_options?id=eq.${encodeURIComponent(String(id))}`, { method: "DELETE" }, token);
