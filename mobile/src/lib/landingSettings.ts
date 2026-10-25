import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./api";

export type LandingPageKey = "daily-meal" | "home-cooked";
export type LandingLocale = "ar" | "he" | "en";
export type LandingCopy = { eyebrow: string; title: string; description: string; action_label: string };
export type LandingCopyByLocale = Record<LandingLocale, LandingCopy>;
export interface LandingPageSettings {
  page_key: LandingPageKey;
  images: string[];
  copy: LandingCopyByLocale;
  updated_at?: string;
}

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
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

export async function getLandingPageSettings(pageKey: LandingPageKey, token?: string) {
  const rows = await request<LandingPageSettings[]>(
    `landing_page_settings?select=*&page_key=eq.${encodeURIComponent(pageKey)}&limit=1`,
    token,
  );
  return rows[0] || null;
}

export async function getAdminLandingPageSettings(token: string) {
  return request<LandingPageSettings[]>("landing_page_settings?select=*&order=page_key.asc", token);
}

export async function saveLandingPageSettings(token: string, settings: LandingPageSettings) {
  return request<LandingPageSettings[]>("landing_page_settings?on_conflict=page_key&select=*", token, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...settings, updated_at: new Date().toISOString() }),
  });
}

export async function uploadLandingHeroImage(token: string, pageKey: LandingPageKey, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("الملف لازم يكون صورة.");
  if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة لازم يكون أقل من 5 ميغابايت.");
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const uniqueId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const objectPath = `landing/${pageKey}/${uniqueId}.${extension}`;
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/daily-meal-images/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: file,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(data?.message || data?.error || "تعذر رفع الصورة. تأكد من إعداد مساحة الصور في Supabase.");
  }
  return `${SUPABASE_URL}/storage/v1/object/public/daily-meal-images/${encodedPath}`;
}

export function localizedLandingCopy(
  settings: LandingPageSettings | null | undefined,
  locale: LandingLocale,
  fallback: LandingCopy,
): LandingCopy {
  const saved = settings?.copy?.[locale];
  return {
    eyebrow: saved?.eyebrow?.trim() || fallback.eyebrow,
    title: saved?.title?.trim() || fallback.title,
    description: saved?.description?.trim() || fallback.description,
    action_label: saved?.action_label?.trim() || fallback.action_label,
  };
}

export const emptyLandingCopy: LandingCopyByLocale = {
  ar: { eyebrow: "", title: "", description: "", action_label: "" },
  he: { eyebrow: "", title: "", description: "", action_label: "" },
  en: { eyebrow: "", title: "", description: "", action_label: "" },
};
