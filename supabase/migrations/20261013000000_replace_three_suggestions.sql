-- Replace three TAMAM suggestions with live catalog meals; retain IDs and moods.
-- Run in the existing Supabase project SQL Editor. Atomic and repeatable.
begin;
create table if not exists public.tamam_content_backup_20261013 (
 kind text not null, row_id text not null, snapshot jsonb not null,
 saved_at timestamptz not null default now(), primary key(kind,row_id)
);
alter table public.tamam_content_backup_20261013 enable row level security;
revoke all on public.tamam_content_backup_20261013 from anon, authenticated;
insert into public.tamam_content_backup_20261013(kind,row_id,snapshot)
select 'set',id,to_jsonb(s) from public.tamam_suggestion_sets s
where id in ('6a6def7b1fd08c198ddb09f7','6a6a4c7a1f0f856e222462b7','6a6defd1fee624e248a2e682')
on conflict do nothing;
insert into public.tamam_content_backup_20261013(kind,row_id,snapshot)
select 'item',id,to_jsonb(i) from public.tamam_suggestion_items i
where suggestion_set_id in ('6a6def7b1fd08c198ddb09f7','6a6a4c7a1f0f856e222462b7','6a6defd1fee624e248a2e682')
on conflict do nothing;
insert into public.tamam_content_backup_20261013(kind,row_id,snapshot)
select 'restaurant',id::text,to_jsonb(r) from public.restaurants r on conflict do nothing;

do $$
begin
 if (select count(*) from public.tamam_suggestion_sets where id in
 ('6a6def7b1fd08c198ddb09f7','6a6a4c7a1f0f856e222462b7','6a6defd1fee624e248a2e682')) <> 3
 then raise exception 'Expected all three existing suggestions'; end if;
 if (select count(*) from public.menu_items where
 (id=426 and restaurant_id=10 or id in (482,495) and restaurant_id=11 or id=102 and restaurant_id=4)
 and active and is_available is not false and price>0) <> 4
 then raise exception 'Selected meals must remain active, available and correctly mapped'; end if;
 if exists(select 1 from public.menu_items where id in (426,482,102) and coalesce(image_url,'')='')
 then raise exception 'Missing selected meal image'; end if;
end $$;

with choices(set_id,meal_id) as (values
 ('6a6def7b1fd08c198ddb09f7',426),
 ('6a6a4c7a1f0f856e222462b7',482),
 ('6a6defd1fee624e248a2e682',102))
update public.tamam_suggestion_sets s set
 title_ar=m.name_ar, title_he=m.name, title_en=m.name_en,
 description_ar=coalesce(m.description_ar,'') || case when m.id=482 then ' مع رغيف خبز واحد.' else '' end,
 description_he=coalesce(m.description,'') || case when m.id=482 then ' כולל פיתה אחת.' else '' end,
 description_en=coalesce(m.description_en,'') || case when m.id=482 then ' Includes one pita.' else '' end,
 hero_image_url=m.image_url,
 display_price=m.price+case when m.id=482 then (select price from public.menu_items where id=495) else 0 end,
 display_price_override=null,
 badge_text_ar='اقتراح TAMAM',badge_text_he='הצעת TAMAM',badge_text_en='TAMAM selection'
from choices c join public.menu_items m on m.id=c.meal_id
where s.id=c.set_id;

delete from public.tamam_suggestion_items where suggestion_set_id in
 ('6a6def7b1fd08c198ddb09f7','6a6a4c7a1f0f856e222462b7','6a6defd1fee624e248a2e682');
insert into public.tamam_suggestion_items
(id,suggestion_set_id,restaurant_id,meal_id,quantity,selected_addon_ids,selected_drink_ids,item_note,is_required,sort_order)
values
 ('tamam_20261013_tishreen','6a6def7b1fd08c198ddb09f7',10,426,1,'[]','[]','',true,0),
 ('tamam_20261013_shaabi','6a6a4c7a1f0f856e222462b7',11,482,1,'[]','[]','',true,0),
 ('tamam_20261013_shaabi_pita','6a6a4c7a1f0f856e222462b7',11,495,1,'[]','[]','',true,1),
 ('tamam_20261013_home','6a6defd1fee624e248a2e682',4,102,1,'[]','[]','',true,0);
update public.restaurants set min_order=50;
commit;

select s.id,s.title_he,s.display_price,
 sum(m.price*i.quantity) as cart_price,
 bool_and(m.restaurant_id=i.restaurant_id) as restaurant_matches
from public.tamam_suggestion_sets s
join public.tamam_suggestion_items i on i.suggestion_set_id=s.id
join public.menu_items m on m.id=i.meal_id
where s.id in ('6a6def7b1fd08c198ddb09f7','6a6a4c7a1f0f856e222462b7','6a6defd1fee624e248a2e682')
group by s.id,s.title_he,s.display_price;
