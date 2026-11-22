insert into public.subjects (code, name, color) values
  ('INTE 301', 'System Integration and Architecture 1', '#3B5BDB'),
  ('COMP 015', 'Web Development', '#0CA678'),
  ('COMP 018', 'Database Administration', '#E67700')
on conflict (code) do update set name = excluded.name, color = excluded.color;

insert into public.modules (subject_id, title, position)
select s.id, v.title, v.position from (values
  ('INTE 301', 'Module 1: Integration Fundamentals', 1),
  ('INTE 301', 'Module 2: Web Services & APIs', 2),
  ('INTE 301', 'Module 3: Data & Systems Integration', 3),
  ('COMP 015', 'Module 1: Front-End Basics', 1),
  ('COMP 015', 'Module 2: JavaScript', 2),
  ('COMP 015', 'Module 3: Back-End & Deployment', 3),
  ('COMP 018', 'Module 1: Database Fundamentals', 1),
  ('COMP 018', 'Module 2: Administration & Security', 2),
  ('COMP 018', 'Module 3: Performance & Maintenance', 3)
) as v(code, title, position)
join public.subjects s on s.code = v.code
on conflict (subject_id, position) do nothing;

insert into public.topics (module_id, title)
select m.id, v.title from (values
  ('INTE 301', 1, 'Enterprise Integration Patterns'),
  ('INTE 301', 1, 'Middleware & Message Queues'),
  ('INTE 301', 2, 'REST API Design'),
  ('INTE 301', 2, 'SOAP & Web Services'),
  ('INTE 301', 2, 'API Security'),
  ('INTE 301', 3, 'Data Exchange Formats'),
  ('INTE 301', 3, 'ETL & Data Synchronization'),
  ('COMP 015', 1, 'HTML & Semantic Markup'),
  ('COMP 015', 1, 'CSS & Responsive Layout'),
  ('COMP 015', 2, 'JavaScript Fundamentals'),
  ('COMP 015', 2, 'DOM & Events'),
  ('COMP 015', 2, 'Fetching Data'),
  ('COMP 015', 3, 'Server-Side Basics'),
  ('COMP 015', 3, 'Databases for the Web'),
  ('COMP 015', 3, 'Deployment & Hosting'),
  ('COMP 018', 1, 'Relational Model & SQL'),
  ('COMP 018', 1, 'Normalization'),
  ('COMP 018', 2, 'Users, Roles & Permissions'),
  ('COMP 018', 2, 'Backup & Recovery'),
  ('COMP 018', 3, 'Indexing & Query Tuning'),
  ('COMP 018', 3, 'Monitoring & Maintenance')
) as v(code, position, title)
join public.subjects s on s.code = v.code
join public.modules m on m.subject_id = s.id and m.position = v.position
on conflict (module_id, title) do nothing;

delete from public.subjects s
where s.code in ('IT 202', 'IT 210', 'MATH 115', 'ENG 102', 'CS 101')
  and not exists (select 1 from public.presentations x where x.subject_id = s.id)
  and not exists (select 1 from public.exercises x where x.subject_id = s.id)
  and not exists (select 1 from public.learning_materials x where x.subject_id = s.id);
