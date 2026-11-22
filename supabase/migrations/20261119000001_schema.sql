create extension if not exists pgcrypto;

create type public.user_role       as enum ('student', 'instructor', 'admin');
create type public.user_status     as enum ('active', 'suspended');
create type public.content_kind    as enum ('presentation', 'exercise', 'material');
create type public.visibility      as enum ('shared', 'private');
create type public.exercise_category as enum ('activity', 'quiz', 'lab', 'assignment', 'worksheet');
create type public.material_type   as enum ('presentation', 'pdf', 'exercise', 'reviewer', 'notes', 'handout', 'other');
create type public.material_status as enum ('published', 'draft');
create type public.activity_action as enum ('uploaded', 'viewed', 'downloaded', 'updated', 'deleted', 'bookmarked');
create type public.notification_kind as enum ('upload_success', 'new_material', 'material_updated', 'announcement');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 80),
  email       text not null,
  role        public.user_role   not null default 'student',
  status      public.user_status not null default 'active',
  course      text check (char_length(course) <= 80),
  section     text check (char_length(section) <= 20),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

create or replace function public.current_role_if_active()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role_if_active() is not null $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role_if_active() in ('instructor', 'admin'), false) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role_if_active() = 'admin', false) $$;

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (char_length(code) between 2 and 20),
  name        text not null check (char_length(name) between 2 and 120),
  color       text not null default '#3B5BDB' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at  timestamptz not null default now()
);

create table public.modules (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  title       text not null check (char_length(title) between 2 and 120),
  position    int  not null check (position > 0),
  created_at  timestamptz not null default now(),
  unique (subject_id, position)
);

create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  title       text not null check (char_length(title) between 2 and 120),
  created_at  timestamptz not null default now(),
  unique (module_id, title)
);
create index topics_module_idx on public.topics (module_id);

create table public.enrollments (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, subject_id)
);
create index enrollments_subject_idx on public.enrollments (subject_id);

create or replace function public.is_enrolled(p_subject uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.enrollments where user_id = auth.uid() and subject_id = p_subject) $$;

create table public.presentations (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  subject_id  uuid not null references public.subjects (id),
  module_id   uuid not null references public.modules (id),
  topic_id    uuid not null references public.topics (id),
  tags        text[] not null default '{}' check (cardinality(tags) <= 8),
  visibility  public.visibility not null default 'shared',
  file_path   text not null unique,
  file_name   text not null check (char_length(file_name) <= 200),
  file_ext    text not null check (file_ext in ('ppt', 'pptx', 'pdf')),
  mime_type   text not null,
  size_bytes  bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.exercises (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  subject_id  uuid not null references public.subjects (id),
  module_id   uuid not null references public.modules (id),
  topic_id    uuid not null references public.topics (id),
  category    public.exercise_category not null default 'activity',
  tags        text[] not null default '{}' check (cardinality(tags) <= 8),
  is_official boolean not null default false,
  visibility  public.visibility not null default 'shared',
  file_path   text not null unique,
  file_name   text not null check (char_length(file_name) <= 200),
  file_ext    text not null check (file_ext in ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg')),
  mime_type   text not null,
  size_bytes  bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.learning_materials (
  id          uuid primary key default gen_random_uuid(),

  owner_id    uuid default auth.uid() references public.profiles (id) on delete set null,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  subject_id  uuid not null references public.subjects (id),
  module_id   uuid not null references public.modules (id),
  topic_id    uuid not null references public.topics (id),
  type        public.material_type not null,
  tags        text[] not null default '{}' check (cardinality(tags) <= 8),
  is_featured boolean not null default false,
  status      public.material_status not null default 'published',
  file_path   text not null unique,
  file_name   text not null check (char_length(file_name) <= 200),
  file_ext    text not null check (file_ext in ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'txt')),
  mime_type   text not null,
  size_bytes  bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.tags_to_text(tags text[]) returns text
language sql immutable parallel safe as $$ select array_to_string(tags, ' ') $$;

do $$
declare t text;
begin
  foreach t in array array['presentations', 'exercises', 'learning_materials'] loop
    execute format('create index %1$s_owner_idx   on public.%1$s (owner_id)', t);
    execute format('create index %1$s_subject_idx on public.%1$s (subject_id, created_at desc)', t);
    execute format('create index %1$s_topic_idx   on public.%1$s (topic_id)', t);
    execute format('create index %1$s_created_idx on public.%1$s (created_at desc)', t);
    execute format('create index %1$s_tags_idx    on public.%1$s using gin (tags)', t);
    execute format(
      'alter table public.%1$s add column search tsvector generated always as (
         setweight(to_tsvector(''simple'', coalesce(title, '''')), ''A'') ||
         setweight(to_tsvector(''simple'', coalesce(public.tags_to_text(tags), '''')), ''B'') ||
         setweight(to_tsvector(''simple'', coalesce(description, '''')), ''C'')
       ) stored', t);
    execute format('create index %1$s_search_idx on public.%1$s using gin (search)', t);
  end loop;
end $$;

create table public.bookmarks (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_kind   public.content_kind not null,
  item_id     uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, item_kind, item_id)
);

create table public.recent_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  action      public.activity_action not null,
  item_kind   public.content_kind not null,
  item_id     uuid not null,
  item_title  text not null,
  created_at  timestamptz not null default now()
);
create index recent_activity_user_idx on public.recent_activity (user_id, created_at desc);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        public.notification_kind not null,
  title       text not null check (char_length(title) <= 120),
  body        text not null check (char_length(body) <= 500),
  read        boolean not null default false,
  target_kind public.content_kind,
  target_id   uuid,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, course, section)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    nullif(btrim(new.raw_user_meta_data ->> 'course'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'section'), '')
  );

  if jsonb_typeof(new.raw_user_meta_data -> 'subject_codes') = 'array' then
    insert into public.enrollments (user_id, subject_id)
    select new.id, s.id
    from public.subjects s
    where s.code in (select jsonb_array_elements_text(new.raw_user_meta_data -> 'subject_codes'))
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.prepare_content_row() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_module uuid;
  v_subject uuid;
begin
  select t.module_id, m.subject_id into v_module, v_subject
  from public.topics t join public.modules m on m.id = t.module_id
  where t.id = new.topic_id;
  if v_module is null then
    raise exception 'Unknown topic %', new.topic_id;
  end if;
  new.module_id := v_module;
  new.subject_id := v_subject;

  if tg_op = 'UPDATE' then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Owner cannot be changed';
    end if;
    if new.created_at is distinct from old.created_at then
      new.created_at := old.created_at;
    end if;
  end if;

  if tg_table_name = 'exercises' and auth.uid() is not null and not public.is_staff() then

    new.is_official := case when tg_op = 'UPDATE' then old.is_official else false end;
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger presentations_prepare before insert or update on public.presentations
  for each row execute function public.prepare_content_row();
create trigger exercises_prepare before insert or update on public.exercises
  for each row execute function public.prepare_content_row();
create trigger learning_materials_prepare before insert or update on public.learning_materials
  for each row execute function public.prepare_content_row();

create or replace function public.cleanup_bookmarks() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.bookmarks
  where item_id = old.id
    and item_kind = (case tg_table_name
                       when 'presentations' then 'presentation'
                       when 'exercises' then 'exercise'
                       else 'material' end)::public.content_kind;
  return old;
end $$;

create trigger presentations_cleanup after delete on public.presentations
  for each row execute function public.cleanup_bookmarks();
create trigger exercises_cleanup after delete on public.exercises
  for each row execute function public.cleanup_bookmarks();
create trigger learning_materials_cleanup after delete on public.learning_materials
  for each row execute function public.cleanup_bookmarks();

create or replace function public.notify_material_published() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    insert into public.notifications (user_id, kind, title, body, target_kind, target_id)
    select e.user_id, 'new_material', 'New learning material',
           format('"%s" is now available in the library.', new.title),
           'material', new.id
    from public.enrollments e
    where e.subject_id = new.subject_id
      and e.user_id is distinct from new.owner_id;
  end if;
  return new;
end $$;

create trigger learning_materials_notify after insert or update of status on public.learning_materials
  for each row execute function public.notify_material_published();

alter table public.profiles           enable row level security;
alter table public.subjects           enable row level security;
alter table public.modules            enable row level security;
alter table public.topics             enable row level security;
alter table public.enrollments        enable row level security;
alter table public.presentations      enable row level security;
alter table public.exercises          enable row level security;
alter table public.learning_materials enable row level security;
alter table public.bookmarks          enable row level security;
alter table public.recent_activity    enable row level security;
alter table public.notifications      enable row level security;

create policy "profiles: read own or staff" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create view public.public_profiles as
  select id, full_name, avatar_url, role from public.profiles;
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

create policy "subjects: read" on public.subjects for select to authenticated using (public.is_active());
create policy "subjects: staff write" on public.subjects for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "modules: read" on public.modules for select to authenticated using (public.is_active());
create policy "modules: staff write" on public.modules for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "topics: read" on public.topics for select to authenticated using (public.is_active());
create policy "topics: staff write" on public.topics for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "enrollments: read own or staff" on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "enrollments: add own or staff" on public.enrollments for insert to authenticated
  with check ((user_id = auth.uid() and public.is_active()) or public.is_staff());
create policy "enrollments: remove own or staff" on public.enrollments for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());

do $$
declare t text;
begin
  foreach t in array array['presentations', 'exercises'] loop
    execute format($p$
      create policy "%1$s: read" on public.%1$s for select to authenticated
        using (public.is_active() and (owner_id = auth.uid() or public.is_staff() or visibility = 'shared'))
    $p$, t);
    execute format($p$
      create policy "%1$s: insert" on public.%1$s for insert to authenticated
        with check (
          public.is_active() and owner_id = auth.uid()
          and (public.is_staff() or public.is_enrolled(subject_id))
          and split_part(file_path, '/', 1) = auth.uid()::text
        )
    $p$, t);
    execute format($p$
      create policy "%1$s: update" on public.%1$s for update to authenticated
        using (public.is_active() and (owner_id = auth.uid() or public.is_staff()))
        with check (public.is_active() and (owner_id = auth.uid() or public.is_staff()))
    $p$, t);
    execute format($p$
      create policy "%1$s: delete" on public.%1$s for delete to authenticated
        using (public.is_active() and (owner_id = auth.uid() or public.is_staff()))
    $p$, t);
  end loop;
end $$;

create policy "materials: read" on public.learning_materials for select to authenticated
  using (public.is_active() and (status = 'published' or public.is_staff()));
create policy "materials: staff insert" on public.learning_materials for insert to authenticated
  with check (public.is_staff() and owner_id = auth.uid());
create policy "materials: staff update" on public.learning_materials for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "materials: staff delete" on public.learning_materials for delete to authenticated
  using (public.is_staff());

create policy "bookmarks: own" on public.bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active());
create policy "activity: read own" on public.recent_activity for select to authenticated
  using (user_id = auth.uid());
create policy "activity: add own" on public.recent_activity for insert to authenticated
  with check (user_id = auth.uid() and public.is_active());
create policy "activity: clear own" on public.recent_activity for delete to authenticated
  using (user_id = auth.uid());

create policy "notifications: read own" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications: update own" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: delete own" on public.notifications for delete to authenticated
  using (user_id = auth.uid());
create policy "notifications: insert own or staff" on public.notifications for insert to authenticated
  with check (user_id = auth.uid() or public.is_staff());

revoke all on all tables in schema public from anon;
