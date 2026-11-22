grant select on public.subjects, public.modules, public.topics to anon;

drop policy "subjects: read" on public.subjects;
drop policy "modules: read" on public.modules;
drop policy "topics: read" on public.topics;

create policy "subjects: read" on public.subjects for select to anon, authenticated using (true);
create policy "modules: read" on public.modules for select to anon, authenticated using (true);
create policy "topics: read" on public.topics for select to anon, authenticated using (true);
