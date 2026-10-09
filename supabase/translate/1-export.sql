-- TAMAM translations, step 1 of 2.
-- Paste everything into Supabase → SQL Editor → Run, then click
-- "Export" → "Download CSV" on the result and send the file.
--
-- Part A only ADDS empty columns (safe: nothing existing changes; the CRM and
-- the old site ignore them). Part B just lists the texts. Safe to re-run.

-- A. translation columns ------------------------------------------------------
alter table public.restaurants
  add column if not exists name_ar text, add column if not exists name_he text,
  add column if not exists name_en text, add column if not exists description text,
  add column if not exists description_ar text, add column if not exists description_he text,
  add column if not exists description_en text;
alter table public.menu_items
  add column if not exists name_ar text, add column if not exists name_he text,
  add column if not exists name_en text, add column if not exists description text,
  add column if not exists description_ar text, add column if not exists description_he text,
  add column if not exists description_en text;
alter table public.menu_categories
  add column if not exists name_ar text, add column if not exists name_he text,
  add column if not exists name_en text;
alter table public.menu_extra_groups
  add column if not exists name_ar text, add column if not exists name_he text,
  add column if not exists name_en text;
alter table public.menu_extras
  add column if not exists name_ar text, add column if not exists name_he text,
  add column if not exists name_en text;
alter table public.tamam_moods
  add column if not exists name_he text, add column if not exists name_en text,
  add column if not exists description_he text, add column if not exists description_en text;
alter table public.tamam_suggestion_sets
  add column if not exists title_he text, add column if not exists title_en text,
  add column if not exists description_he text, add column if not exists description_en text,
  add column if not exists badge_text_he text, add column if not exists badge_text_en text;

-- B. every text, one row per record --------------------------------------------
select * from (
  select 'restaurants' as tbl, id::text as id, name as name, name_ar, description, description_ar, null::text as badge from public.restaurants
  union all
  select 'menu_categories', id::text, name, name_ar, null, null, null from public.menu_categories
  union all
  select 'menu_items', id::text, name, name_ar, description, description_ar, null from public.menu_items
  union all
  select 'menu_extra_groups', id::text, name, name_ar, null, null, null from public.menu_extra_groups
  union all
  select 'menu_extras', id::text, name, name_ar, null, null, null from public.menu_extras
  union all
  select 'tamam_moods', id, null, name_ar, null, description_ar, null from public.tamam_moods
  union all
  select 'tamam_suggestion_sets', id, null, title_ar, null, description_ar, badge_text_ar from public.tamam_suggestion_sets
) t
order by tbl, id;
