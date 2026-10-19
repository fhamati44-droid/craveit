-- Store a public cover image URL for each daily menu.
-- Upload permissions remain enforced by the daily-meal-images bucket policies.
alter table public.daily_menus
  add column if not exists image_url text;
