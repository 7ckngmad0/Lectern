create or replace function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.id <> old.id then
    raise exception 'Profile id cannot change';
  end if;
  if new.email is distinct from old.email and auth.uid() is not null then
    raise exception 'Email is managed by authentication';
  end if;
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only administrators can change roles or account status';
  end if;
  if new.id = auth.uid() and new.role is distinct from old.role then
    raise exception 'Administrators cannot change their own role';
  end if;
  if new.id = auth.uid() and new.status is distinct from old.status then
    raise exception 'Administrators cannot suspend their own account';
  end if;
  return new;
end $$;

create or replace function public.admin_stats()
returns table (
  students bigint, instructors bigint, admins bigint, suspended bigint,
  presentations bigint, exercises bigint, materials bigint, draft_materials bigint,
  storage_bytes bigint, uploads_7d bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Only instructors and administrators can view statistics' using errcode = '42501';
  end if;
  return query select
    (select count(*) from public.profiles where role = 'student'),
    (select count(*) from public.profiles where role = 'instructor'),
    (select count(*) from public.profiles where role = 'admin'),
    (select count(*) from public.profiles where status = 'suspended'),
    (select count(*) from public.presentations),
    (select count(*) from public.exercises),
    (select count(*) from public.learning_materials),
    (select count(*) from public.learning_materials where status = 'draft'),
    (select coalesce(sum(size_bytes), 0)::bigint from (
       select size_bytes from public.presentations
       union all select size_bytes from public.exercises
       union all select size_bytes from public.learning_materials) f),
    (select count(*) from (
       select created_at from public.presentations
       union all select created_at from public.exercises) u
     where u.created_at > now() - interval '7 days');
end $$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

create or replace function public.send_announcement(p_subject uuid, p_title text, p_body text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_staff() then
    raise exception 'Only instructors and administrators can send announcements' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) = 0 or char_length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'Announcements need a title and a message';
  end if;

  insert into public.notifications (user_id, kind, title, body)
  select p.id, 'announcement', left(btrim(p_title), 120), left(btrim(p_body), 500)
  from public.profiles p
  where p.status = 'active'
    and p.id <> auth.uid()
    and (p_subject is null
         or exists (select 1 from public.enrollments e where e.user_id = p.id and e.subject_id = p_subject));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.send_announcement(uuid, text, text) from public, anon;
grant execute on function public.send_announcement(uuid, text, text) to authenticated;
