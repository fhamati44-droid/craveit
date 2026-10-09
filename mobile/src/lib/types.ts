export type Id = string | number;
export interface Restaurant {
  id: Id;
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  image_url?: string;
  cover_url?: string;
  logo_url?: string;
  slug?: string;
  is_open?: boolean;
  active?: boolean;
  kitchen_id?: number | null;
  delivery_fee?: number;
  delivery_time?: number | string;
  minimum_order?: number;
  min_order?: number;
}
export interface Meal {
  id: Id;
  name?: string;
  name_ar?: string;
  name_he?: string;
  name_en?: string;
  description?: string;
  description_ar?: string;
  image_url?: string;
  price: number;
  is_available?: boolean;
}
export interface Category {
  id: Id;
  name?: string;
  name_ar?: string;
  items: Meal[];
}
export interface Extra {
  id: Id;
  name: string;
  name_ar?: string | null;
  name_he?: string | null;
  name_en?: string | null;
  price: number;
}
export interface ExtraGroup {
  id: Id;
  group_name: string;
  name?: string;
  name_ar?: string | null;
  name_he?: string | null;
  name_en?: string | null;
  required?: boolean;
  min_select?: number;
  max_select?: number;
  menu_extra_options: Extra[];
}
export interface Mood {
  id: Id;
  name?: string;
  name_ar?: string;
  name_he?: string;
  name_en?: string;
  emoji?: string;
  icon?: string;
  description_ar?: string;
  has_suggestions?: boolean;
}
export interface Suggestion {
  is_active?: boolean;
  id: Id;
  mood_id?: Id;
  title_ar?: string;
  title_he?: string;
  title_en?: string;
  title?: string;
  description_ar?: string;
  description_he?: string;
  description_en?: string;
  hero_image_url?: string;
  package_level?: string;
  display_price?: number;
  display_price_override?: number;
  badge_text_ar?: string;
  badge_text_he?: string;
  badge_text_en?: string;
}
export interface SuggestionItem {
  suggestion_set_id?: Id;
  meal_id: Id;
  restaurant_id: Id;
  quantity?: number;
  selected_addon_ids?: Id[];
  item_note?: string;
}
export type OrderStatus =
  | "new"
  | "confirmed"
  | "cooking"
  | "ready"
  | "delivered"
  | "cancelled";
/** Row of the shared `orders` table (read by the CRM kitchen/courier). */
export interface Order {
  id: number;
  customer_name?: string;
  phone?: string;
  address?: string;
  notes?: string | null;
  kitchen_id?: number | null;
  channel?: string;
  items?: string;
  order_items?: {
    name: string;
    quantity: number;
    price: number;
    extras?: { name: string; price: number }[];
    item_total: number;
  }[];
  quantity?: number;
  amount?: number;
  status?: OrderStatus | string;
  created_at?: string;
}
/** Row of `site_settings` (id = 1), managed from the old site's admin. */
export interface SiteSettings {
  id: number;
  title?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  covers?: { type?: "image" | "video"; url: string }[] | null;
}
export const title = (value: { name_ar?: string; name?: string }) =>
  value.name_ar || value.name || "";
