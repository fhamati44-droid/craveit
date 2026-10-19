-- Keep the shared option library reusable. A menu gets no override by default,
-- so it inherits every active shared option. An override row limits that menu
-- to the listed option IDs; an empty array hides that category for that menu.
create table if not exists public.daily_menu_option_overrides (
  menu_id bigint not null references public.daily_menus(id) on delete cascade,
  category text not null check (category in ('soup', 'addition', 'salad')),
  option_ids bigint[] not null default '{}'::bigint[],
  updated_at timestamptz not null default now(),
  primary key (menu_id, category)
);

alter table public.daily_menu_option_overrides enable row level security;

revoke all on table public.daily_menu_option_overrides from anon, authenticated;
grant select on table public.daily_menu_option_overrides to anon, authenticated;
grant insert, update, delete on table public.daily_menu_option_overrides to authenticated;

drop policy if exists "public read overrides for published daily menus"
  on public.daily_menu_option_overrides;
create policy "public read overrides for published daily menus"
  on public.daily_menu_option_overrides
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.daily_menus m
      where m.id = menu_id and m.published = true
    )
  );

drop policy if exists "daily meal admins manage menu option overrides"
  on public.daily_menu_option_overrides;
create policy "daily meal admins manage menu option overrides"
  on public.daily_menu_option_overrides
  for all
  to authenticated
  using (
    exists (
      select 1 from public.daily_meal_admins a
      where a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.daily_meal_admins a
      where a.user_id = (select auth.uid())
    )
  );
