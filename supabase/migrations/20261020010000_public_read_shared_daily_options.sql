-- Customers need to read shared soup, addition, and salad choices.
-- This policy grants SELECT on active shared options only; it grants no writes.
drop policy if exists "public read active shared daily options"
  on public.daily_menu_options;

create policy "public read active shared daily options"
  on public.daily_menu_options
  as permissive
  for select
  to anon, authenticated
  using (
    menu_id is null
    and active = true
    and category in ('soup', 'addition', 'salad')
  );
