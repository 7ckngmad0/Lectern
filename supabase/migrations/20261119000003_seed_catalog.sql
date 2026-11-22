insert into public.subjects (code, name, color) values
  ('IT 202', 'Systems Integration & Architecture', '#3B5BDB'),
  ('IT 210', 'Mobile Application Development', '#0CA678'),
  ('MATH 115', 'Discrete Mathematics', '#AE3EC9'),
  ('ENG 102', 'Technical Writing', '#1098AD'),
  ('CS 101', 'Introduction to Computing', '#E67700')
on conflict (code) do nothing;

insert into public.modules (subject_id, title, position)
select s.id, v.title, v.position from (values
  ('IT 202', 'Module 1: Integration Fundamentals', 1),
  ('IT 202', 'Module 2: Service Architecture', 2),
  ('IT 202', 'Module 3: Data Integration', 3),
  ('IT 210', 'Module 1: Getting Started', 1),
  ('IT 210', 'Module 2: UI & Navigation', 2),
  ('IT 210', 'Module 3: Data & Storage', 3),
  ('MATH 115', 'Module 1: Logic & Proofs', 1),
  ('MATH 115', 'Module 2: Sets & Relations', 2),
  ('MATH 115', 'Module 3: Graph Theory', 3),
  ('ENG 102', 'Module 1: Foundations', 1),
  ('ENG 102', 'Module 2: Technical Documents', 2),
  ('CS 101', 'Module 1: Computer Basics', 1),
  ('CS 101', 'Module 2: Problem Solving', 2)
) as v(code, title, position)
join public.subjects s on s.code = v.code
on conflict (subject_id, position) do nothing;

insert into public.topics (module_id, title)
select m.id, v.title from (values
  ('IT 202', 1, 'Enterprise Integration Patterns'),
  ('IT 202', 1, 'Middleware & Message Queues'),
  ('IT 202', 2, 'REST API Design'),
  ('IT 202', 2, 'Microservices vs. Monoliths'),
  ('IT 202', 2, 'API Gateways'),
  ('IT 202', 3, 'ETL Pipelines'),
  ('IT 202', 3, 'Data Synchronization'),
  ('IT 210', 1, 'Mobile Platforms Overview'),
  ('IT 210', 1, 'React Native Basics'),
  ('IT 210', 2, 'Layouts with Flexbox'),
  ('IT 210', 2, 'Navigation Patterns'),
  ('IT 210', 2, 'Accessibility on Mobile'),
  ('IT 210', 3, 'Local Storage'),
  ('IT 210', 3, 'Consuming REST APIs'),
  ('MATH 115', 1, 'Propositional Logic'),
  ('MATH 115', 1, 'Proof Techniques'),
  ('MATH 115', 2, 'Set Theory'),
  ('MATH 115', 2, 'Relations & Functions'),
  ('MATH 115', 3, 'Graphs & Trees'),
  ('MATH 115', 3, 'Shortest Paths'),
  ('ENG 102', 1, 'Audience Analysis'),
  ('ENG 102', 1, 'Plain Language'),
  ('ENG 102', 2, 'User Manuals'),
  ('ENG 102', 2, 'Project Proposals'),
  ('CS 101', 1, 'Hardware & Software'),
  ('CS 101', 1, 'Number Systems'),
  ('CS 101', 2, 'Algorithms & Flowcharts'),
  ('CS 101', 2, 'Pseudocode')
) as v(code, position, title)
join public.subjects s on s.code = v.code
join public.modules m on m.subject_id = s.id and m.position = v.position
on conflict (module_id, title) do nothing;
