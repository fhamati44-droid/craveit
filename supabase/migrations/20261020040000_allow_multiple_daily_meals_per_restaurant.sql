-- Allow several daily meals from the same restaurant on one service date.
alter table public.daily_menus
  drop constraint if exists daily_menus_restaurant_id_service_date_key;

-- Also remove a standalone unique index if the original schema used one.
drop index if exists public.daily_menus_restaurant_id_service_date_key;
