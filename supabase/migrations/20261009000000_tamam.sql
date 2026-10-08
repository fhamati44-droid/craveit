-- TAMAM moods and meal packages, moved from Base44 into the shared Supabase
-- project (the same one the CRM and the old site use).
-- Safe to run more than once. Run in Supabase → SQL Editor.
--
-- ids are text so the existing Base44 ids are kept as-is (packages point at
-- moods by id). New rows get a uuid.

create table if not exists public.tamam_moods (
  id text primary key default gen_random_uuid()::text,
  name_ar text not null,
  slug text,
  icon text,                 -- Material icon name, e.g. "bolt", "bedtime"
  description_ar text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tamam_suggestion_sets (
  id text primary key default gen_random_uuid()::text,
  mood_id text,              -- tamam_moods.id (no FK: inactive moods may be absent)
  package_level text check (package_level in ('classic', 'mix', 'plus')),
  title_ar text not null,
  description_ar text,
  hero_image_url text,
  badge_text_ar text,
  display_price numeric,
  display_price_override numeric,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tamam_sets_mood_idx on public.tamam_suggestion_sets (mood_id);

create table if not exists public.tamam_suggestion_items (
  id text primary key default gen_random_uuid()::text,
  suggestion_set_id text not null
    references public.tamam_suggestion_sets (id) on delete cascade,
  restaurant_id bigint not null,   -- restaurants.id
  meal_id bigint not null,         -- menu_items.id
  variant_id bigint,
  quantity integer not null default 1 check (quantity > 0),
  selected_addon_ids jsonb not null default '[]'::jsonb,  -- menu_extras ids
  selected_drink_ids jsonb not null default '[]'::jsonb,
  item_note text,
  is_required boolean not null default true,
  sort_order integer not null default 0
);
create index if not exists tamam_items_set_idx on public.tamam_suggestion_items (suggestion_set_id);

-- Row Level Security: the app/website (anon key) may only READ active rows.
-- Writes happen from the Supabase dashboard / service role (admin) only.
alter table public.tamam_moods enable row level security;
alter table public.tamam_suggestion_sets enable row level security;
alter table public.tamam_suggestion_items enable row level security;

drop policy if exists "public read active moods" on public.tamam_moods;
create policy "public read active moods" on public.tamam_moods
  for select to anon, authenticated using (is_active);

drop policy if exists "public read active sets" on public.tamam_suggestion_sets;
create policy "public read active sets" on public.tamam_suggestion_sets
  for select to anon, authenticated using (is_active);

drop policy if exists "public read items of active sets" on public.tamam_suggestion_items;
create policy "public read items of active sets" on public.tamam_suggestion_items
  for select to anon, authenticated using (
    exists (
      select 1 from public.tamam_suggestion_sets s
      where s.id = suggestion_set_id and s.is_active
    )
  );
