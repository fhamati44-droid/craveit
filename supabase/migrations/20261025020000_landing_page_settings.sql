-- Admin-managed hero images and text for the daily-meal and home-cooked pages.
create table if not exists public.landing_page_settings (
  page_key text primary key check (page_key in ('daily-meal', 'home-cooked')),
  images text[] not null default '{}'::text[],
  copy jsonb not null default '{"ar":{"eyebrow":"","title":"","description":"","action_label":""},"he":{"eyebrow":"","title":"","description":"","action_label":""},"en":{"eyebrow":"","title":"","description":"","action_label":""}}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.landing_page_settings (page_key)
values ('daily-meal'), ('home-cooked')
on conflict (page_key) do nothing;

alter table public.landing_page_settings enable row level security;
revoke all on public.landing_page_settings from anon, authenticated;
grant select on public.landing_page_settings to anon, authenticated;
grant insert, update on public.landing_page_settings to authenticated;

drop policy if exists "public read landing page settings" on public.landing_page_settings;
create policy "public read landing page settings"
  on public.landing_page_settings for select to anon, authenticated
  using (true);

drop policy if exists "daily meal admins manage landing page settings" on public.landing_page_settings;
create policy "daily meal admins manage landing page settings"
  on public.landing_page_settings for all to authenticated
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
