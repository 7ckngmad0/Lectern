insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('presentations', 'presentations', false, 52428800, array[
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf']),
  ('exercises', 'exercises', false, 26214400, array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg']),
  ('learning-materials', 'learning-materials', false, 52428800, array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg', 'text/plain']),

  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "presentations: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'presentations' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active());
create policy "presentations: read if row visible" on storage.objects for select to authenticated
  using (bucket_id = 'presentations' and public.is_active() and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.presentations p where p.file_path = name)));
create policy "presentations: update own or staff" on storage.objects for update to authenticated
  using (bucket_id = 'presentations' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy "presentations: delete own or staff" on storage.objects for delete to authenticated
  using (bucket_id = 'presentations' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

create policy "exercises: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'exercises' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active());
create policy "exercises: read if row visible" on storage.objects for select to authenticated
  using (bucket_id = 'exercises' and public.is_active() and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.exercises e where e.file_path = name)));
create policy "exercises: update own or staff" on storage.objects for update to authenticated
  using (bucket_id = 'exercises' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy "exercises: delete own or staff" on storage.objects for delete to authenticated
  using (bucket_id = 'exercises' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

create policy "materials: staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'learning-materials' and public.is_staff()
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "materials: read if row visible" on storage.objects for select to authenticated
  using (bucket_id = 'learning-materials' and public.is_active() and (
    public.is_staff()
    or exists (select 1 from public.learning_materials m where m.file_path = name)));
create policy "materials: staff update" on storage.objects for update to authenticated
  using (bucket_id = 'learning-materials' and public.is_staff());
create policy "materials: staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'learning-materials' and public.is_staff());

create policy "avatars: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
