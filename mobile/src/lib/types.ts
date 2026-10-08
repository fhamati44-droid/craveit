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
  is_open?: boolean;
  active?: boolean;
  delivery_fee?: number;
  delivery_time?: number;
  minimum_order?: number;
  min_order?: number;
}
export interface Meal {
  id: Id;
  name?: string;
  name_ar?: string;
  description?: string;
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
  price: number;
}
export interface ExtraGroup {
  id: Id;
  group_name: string;
  required?: boolean;
  min_select?: number;
  max_select?: number;
  menu_extra_options: Extra[];
}
export interface Mood {
  id: Id;
  name?: string;
  name_ar?: string;
  emoji?: string;
  icon?: string;
  description_ar?: string;
  has_suggestions?: boolean;
}
export interface Suggestion {
  id: Id;
  mood_id?: Id;
  title_ar?: string;
  title?: string;
  description_ar?: string;
  hero_image_url?: string;
  package_level?: string;
  display_price?: number;
  display_price_override?: number;
}
export interface Section {
  id: Id;
  section_key: string;
  enabled?: boolean;
  starts_at?: string;
  ends_at?: string;
  settings_json?: string;
}
export interface HomeConfig {
  sections?: Section[];
  items?: { homepage_section_id: Id; media_id?: string; enabled?: boolean }[];
  media_map?: Record<string, { file_url?: string; media_type?: string }>;
}
export const title = (value: { name_ar?: string; name?: string }) =>
  value.name_ar || value.name || "";
