-- Shared soups, additions, and salads are stored once instead of copied onto
-- every restaurant/date menu. Main dishes remain attached to a daily menu.
alter table public.daily_menu_options
  alter column menu_id drop not null;

-- Promote one active copy of each existing fixed option to the shared list.
-- Keep duplicate rows (with their IDs) for old reservations, but deactivate
-- them so customers do not see duplicate choices after the migration.
with ranked as (
  select
    id,
    row_number() over (
      partition by category, lower(regexp_replace(trim(coalesce(name_ar, name)), '\s+', ' ', 'g'))
      order by (nullif(trim(image_url), '') is not null) desc, sort_order asc, id asc
    ) as position
  from public.daily_menu_options
  where category in ('soup', 'addition', 'salad')
    and active = true
)
update public.daily_menu_options as option
set menu_id = null
from ranked
where option.id = ranked.id
  and ranked.position = 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by category, lower(regexp_replace(trim(coalesce(name_ar, name)), '\s+', ' ', 'g'))
      order by (nullif(trim(image_url), '') is not null) desc, sort_order asc, id asc
    ) as position
  from public.daily_menu_options
  where category in ('soup', 'addition', 'salad')
    and active = true
)
update public.daily_menu_options as option
set active = false
from ranked
where option.id = ranked.id
  and ranked.position > 1;
