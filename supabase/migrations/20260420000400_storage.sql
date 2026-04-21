-- =====================================================================
-- Storage: exercise videos + avatars
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('exercise-videos', 'exercise-videos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Exercise videos: coach uploads to exercise-videos/{auth.uid()}/...
-- Anyone in coach's network can read through signed URLs (access checked via exercises RLS on read path).
create policy "coach uploads own video" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exercise-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "coach updates own video" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'exercise-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "coach deletes own video" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exercise-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "authenticated reads exercise videos" on storage.objects
  for select to authenticated
  using (bucket_id = 'exercise-videos');

-- Avatars: public bucket, per-user folder.
create policy "user uploads avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "user updates avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
