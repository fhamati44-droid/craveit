-- A menu can be published once and reused on every date from service_date onward.
-- The existing row stays the source of truth for title, restaurant, price and image.
alter table public.daily_menus
  add column if not exists is_daily boolean not null default false;

create index if not exists daily_menus_published_daily_start_date_idx
  on public.daily_menus (service_date)
  where published = true and is_daily = true;
