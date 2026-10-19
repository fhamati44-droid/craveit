-- Publicly viewable meal photos; only users in daily_meal_admins can upload,
-- replace, or delete objects in this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'daily-meal-images',
  'daily-meal-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view daily meal images" on storage.objects;
create policy "public can view daily meal images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'daily-meal-images');

drop policy if exists "daily meal admins can upload images" on storage.objects;
create policy "daily meal admins can upload images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'daily-meal-images'
    and exists (
      select 1 from public.daily_meal_admins a
      where a.user_id = auth.uid()
    )
  );

drop policy if exists "daily meal admins can update images" on storage.objects;
create policy "daily meal admins can update images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'daily-meal-images'
    and exists (
      select 1 from public.daily_meal_admins a
      where a.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'daily-meal-images'
    and exists (
      select 1 from public.daily_meal_admins a
      where a.user_id = auth.uid()
    )
  );

drop policy if exists "daily meal admins can delete images" on storage.objects;
create policy "daily meal admins can delete images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'daily-meal-images'
    and exists (
      select 1 from public.daily_meal_admins a
      where a.user_id = auth.uid()
    )
  );
