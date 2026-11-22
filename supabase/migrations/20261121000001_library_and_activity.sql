create or replace function public.notify_material_updated() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status = 'published' and new.status = 'published'
     and (new.file_path is distinct from old.file_path
          or new.title is distinct from old.title
          or new.description is distinct from old.description) then
    insert into public.notifications (user_id, kind, title, body, target_kind, target_id)
    select e.user_id, 'material_updated', 'Material updated',
           format('"%s" was updated in the library.', new.title),
           'material', new.id
    from public.enrollments e
    where e.subject_id = new.subject_id
      and e.user_id is distinct from auth.uid()
      and e.user_id is distinct from new.owner_id;
  end if;
  return new;
end $$;

drop trigger if exists learning_materials_notify_updated on public.learning_materials;
create trigger learning_materials_notify_updated
  after update of file_path, title, description on public.learning_materials
  for each row execute function public.notify_material_updated();

create or replace function public.tidy_recent_activity() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.action = 'viewed' then
    delete from public.recent_activity
    where user_id = new.user_id and action = 'viewed'
      and item_kind = new.item_kind and item_id = new.item_id;
  end if;
  return new;
end $$;

create or replace function public.cap_recent_activity() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.recent_activity
  where user_id = new.user_id
    and id not in (select id from public.recent_activity
                   where user_id = new.user_id
                   order by created_at desc, id
                   limit 100);
  return null;
end $$;

drop trigger if exists recent_activity_tidy on public.recent_activity;
create trigger recent_activity_tidy before insert on public.recent_activity
  for each row execute function public.tidy_recent_activity();
drop trigger if exists recent_activity_cap on public.recent_activity;
create trigger recent_activity_cap after insert on public.recent_activity
  for each row execute function public.cap_recent_activity();

create or replace function public.popular_materials(p_limit int default 6)
returns table (material_id uuid, people bigint)
language sql stable security definer set search_path = public
as $$
  select a.item_id, count(distinct a.user_id) as people
  from public.recent_activity a
  join public.learning_materials m on m.id = a.item_id and m.status = 'published'
  where public.is_active()
    and a.item_kind = 'material'
    and a.action in ('viewed', 'downloaded')
    and a.created_at > now() - interval '30 days'
  group by a.item_id
  order by people desc, max(a.created_at) desc
  limit least(greatest(coalesce(p_limit, 6), 1), 20)
$$;

revoke all on function public.popular_materials(int) from public, anon;
grant execute on function public.popular_materials(int) to authenticated;
