alter table public.daily_menus
  add column if not exists included_note text;
