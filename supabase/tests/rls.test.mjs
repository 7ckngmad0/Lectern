// Lectern database security tests.
// Applies supabase/migrations to an in-memory Postgres (PGlite) with stand-ins for
// Supabase's auth and storage schemas, then checks the RLS rules as different users.
// Run: npm run test:db
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const db = new PGlite();

// ── Supabase-like environment ──────────────────────────────────────────────
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant all on storage.objects to authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);

for (const f of [
  '20261119000001_schema.sql',
  '20261119000002_storage.sql',
  '20261119000003_seed_catalog.sql',
  '20261120000001_catalog_public.sql',
  '20261121000001_library_and_activity.sql',
  '20261122000001_admin.sql',
  '20261122000002_grants.sql',
  '20261123000001_course_catalog.sql',
]) {
  let sql = readFileSync(join(migrationsDir, f), 'utf8');
  sql = sql.replace('create extension if not exists pgcrypto;', ''); // gen_random_uuid is core in PG 13+
  await db.exec(sql);
  console.log('applied', f);
}
// Seed and Phase 5 migration must be re-runnable.
await db.exec(readFileSync(join(migrationsDir, '20261119000003_seed_catalog.sql'), 'utf8'));
await db.exec(readFileSync(join(migrationsDir, '20261123000001_course_catalog.sql'), 'utf8'));
await db.exec(readFileSync(join(migrationsDir, '20261121000001_library_and_activity.sql'), 'utf8'));

// ── Helpers ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const ids = { A: '11111111-1111-1111-1111-111111111111', B: '22222222-2222-2222-2222-222222222222',
              I: '33333333-3333-3333-3333-333333333333', X: '44444444-4444-4444-4444-444444444444' };

async function as(who, sql, params = []) {
  await db.exec('reset role');
  if (who === 'anon') await db.exec(`set role anon; set request.jwt.claim.sub = ''`);
  else if (who) await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ids[who]}'`);
  else await db.exec(`set request.jwt.claim.sub = ''`); // superuser / SQL editor
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
}
async function expectOk(name, fn, check) {
  try {
    const r = await fn();
    if (check && !check(r)) throw new Error('check failed: ' + JSON.stringify(r.rows ?? r));
    passed++; console.log('  ✓', name);
  } catch (e) { failed++; console.log('  ✗', name, '→', e.message); }
}
async function expectFail(name, fn, pattern) {
  try { const r = await fn(); failed++; console.log('  ✗', name, '→ expected failure, got', JSON.stringify(r.rows)); }
  catch (e) {
    if (pattern && !pattern.test(e.message)) { failed++; console.log('  ✗', name, '→ wrong error:', e.message); }
    else { passed++; console.log('  ✓', name, `(${e.message.slice(0, 60)})`); }
  }
}
const rows = (n) => (r) => r.rows.length === n;

// ── Fixtures ───────────────────────────────────────────────────────────────
console.log('\nSign-up trigger');
await expectOk('creating auth users creates profiles', () => as(null, `
  insert into auth.users (id, email, raw_user_meta_data) values
   ('${ids.A}', 'a@school.edu', '{"full_name":"Ana Student","course":"BSIT","section":"3-A","role":"admin"}'),
   ('${ids.B}', 'b@school.edu', '{"full_name":"Ben Student","subject_codes":["COMP 015","FAKE 999"]}'),
   ('${ids.I}', 'i@school.edu', '{"full_name":"Prof Ivy"}'),
   ('${ids.X}', 'x@school.edu', '{}')`));
await expectOk('metadata role is ignored (A is student)', () => as(null, `select role, full_name, course from profiles where id = '${ids.A}'`),
  (r) => r.rows[0].role === 'student' && r.rows[0].course === 'BSIT');
await expectOk('missing name falls back to email prefix', () => as(null, `select full_name from profiles where id = '${ids.X}'`),
  (r) => r.rows[0].full_name === 'x');
await expectOk('SQL editor can promote first admin + instructor', () => as(null,
  `update profiles set role = 'admin' where id = '${ids.X}'; `).then(() => as(null, `update profiles set role = 'instructor' where id = '${ids.I}'`)));

const topic = async (code, title) => (await as(null,
  `select t.id from topics t join modules m on m.id = t.module_id join subjects s on s.id = m.subject_id where s.code = $1 and t.title = $2`, [code, title])).rows[0].id;
const restTopic = await topic('INTE 301', 'REST API Design');
const logicTopic = await topic('COMP 018', 'Relational Model & SQL');
const subjectId = async (code) => (await as(null, `select id from subjects where code = $1`, [code])).rows[0].id;
const it202 = await subjectId('INTE 301');

await expectOk('sign-up subject codes become enrollments (unknown codes ignored)', () => as('B', `select s.code from enrollments e join subjects s on s.id = e.subject_id`),
  (r) => r.rows.length === 1 && r.rows[0].code === 'COMP 015');

console.log('\nProfiles');
await expectOk('A reads own profile', () => as('A', `select * from profiles`), rows(1));
await expectOk('A cannot read B profile directly', () => as('A', `select * from profiles where id = '${ids.B}'`), rows(0));
await expectOk('A sees names via public_profiles', () => as('A', `select * from public_profiles`), rows(4));
await expectOk('A can update own name', () => as('A', `update profiles set full_name = 'Ana S.' where id = '${ids.A}' returning id`), rows(1));
await expectFail('A cannot promote self', () => as('A', `update profiles set role = 'admin' where id = '${ids.A}'`), /Only administrators/);
await expectFail('A cannot change own email', () => as('A', `update profiles set email = 'z@z.com' where id = '${ids.A}'`), /Email/);
await expectOk('A cannot update B (0 rows)', () => as('A', `update profiles set full_name = 'hax' where id = '${ids.B}' returning id`), rows(0));
await expectOk('instructor reads all profiles', () => as('I', `select * from profiles`), rows(4));
await expectOk('instructor cannot change roles (0 rows)', () => as('I', `update profiles set role = 'admin' where id = '${ids.B}' returning id`), rows(0));
await expectFail('admin cannot change own role', () => as('X', `update profiles set role = 'student' where id = '${ids.X}'`), /own role/);
await expectFail('anon cannot read profiles', () => as('anon', `select * from profiles`), /permission denied/);
await expectFail('anon cannot read public_profiles', () => as('anon', `select * from public_profiles`), /permission denied/);

console.log('\nCatalog & enrollments');
await expectOk('A reads the class subjects', () => as('A', `select code from subjects order by code`), (r) => r.rows.map((x) => x.code).join() === 'COMP 015,COMP 018,INTE 301');
await expectOk('old placeholder subjects were removed', () => as('A', `select * from subjects where code in ('IT 202','IT 210','MATH 115','ENG 102','CS 101')`), rows(0));
await expectOk('every subject has 3 modules and topics', () => as('A', `select s.code from subjects s join modules m on m.subject_id = s.id join topics t on t.module_id = m.id group by s.code having count(distinct m.id) = 3`), rows(3));
await expectOk('anon can read the catalog (registration form)', () => as('anon', `select * from topics`), rows(21));
await expectFail('anon cannot write the catalog', () => as('anon', `insert into subjects (code, name) values ('ZZ 2', 'Hack')`), /permission denied|row-level security/);
await expectFail('anon cannot read enrollments', () => as('anon', `select * from enrollments`), /permission denied/);
await expectFail('A cannot create subjects', () => as('A', `insert into subjects (code, name) values ('ZZ 1', 'Hack')`), /row-level security/);
await expectOk('A enrolls self in INTE 301', () => as('A', `insert into enrollments (user_id, subject_id) values ('${ids.A}', '${it202}') returning *`), rows(1));
await expectFail('A cannot enroll B', () => as('A', `insert into enrollments (user_id, subject_id) values ('${ids.B}', '${it202}')`), /row-level security/);
await expectOk('A sees only own enrollments', () => as('A', `select * from enrollments`), rows(1));

console.log('\nPresentations');
const pres = (who, topicId, path, ext = 'pptx', vis = 'shared') => as(who, `
  insert into presentations (title, topic_id, visibility, file_path, file_name, file_ext, mime_type, size_bytes)
  values ('Deck', '${topicId}', '${vis}', '${path}', 'deck.${ext}', '${ext}', 'x', 1000) returning id, subject_id, module_id, owner_id`);
let shared, priv;
await expectOk('A uploads for enrolled subject (hierarchy auto-filled)', async () => { const r = await pres('A', restTopic, `${ids.A}/1.pptx`); shared = r.rows[0].id; return r; },
  (r) => r.rows[0].subject_id === it202 && r.rows[0].owner_id === ids.A);
await expectOk('A uploads private deck', async () => { const r = await pres('A', restTopic, `${ids.A}/2.pptx`, 'pptx', 'private'); priv = r.rows[0].id; return r; });
await expectFail('A cannot upload for non-enrolled subject', () => pres('A', logicTopic, `${ids.A}/3.pptx`), /row-level security/);
await expectFail('A cannot write into B folder', () => pres('A', restTopic, `${ids.B}/4.pptx`), /row-level security/);
await expectFail('unsupported extension rejected', () => pres('A', restTopic, `${ids.A}/5.exe`, 'exe'), /check constraint/);
await expectFail('A cannot spoof owner_id', () => as('A', `insert into presentations (owner_id, title, topic_id, file_path, file_name, file_ext, mime_type, size_bytes)
  values ('${ids.B}', 'x', '${restTopic}', '${ids.A}/6.pptx', 'x.pptx', 'pptx', 'x', 10)`), /row-level security/);
await expectOk('B sees shared deck only', () => as('B', `select id from presentations`), (r) => r.rows.length === 1 && r.rows[0].id === shared);
await expectOk('instructor sees private deck too', () => as('I', `select id from presentations`), rows(2));
await expectOk('B cannot edit A deck (0 rows)', () => as('B', `update presentations set title = 'x' where id = '${shared}' returning id`), rows(0));
await expectOk('B cannot delete A deck (0 rows)', () => as('B', `delete from presentations where id = '${shared}' returning id`), rows(0));
await expectFail('owner cannot be transferred', () => as('I', `update presentations set owner_id = '${ids.B}' where id = '${shared}'`), /Owner cannot/);
await expectOk('instructor uploads for any subject', () => pres('I', logicTopic, `${ids.I}/1.pdf`, 'pdf'));

console.log('\nExercises');
await expectOk('student cannot self-mark official', () => as('A', `
  insert into exercises (title, topic_id, is_official, file_path, file_name, file_ext, mime_type, size_bytes)
  values ('Ex', '${restTopic}', true, '${ids.A}/e1.pdf', 'e.pdf', 'pdf', 'x', 10) returning is_official`), (r) => r.rows[0].is_official === false);
await expectOk('instructor can mark official', () => as('I', `update exercises set is_official = true returning is_official`), (r) => r.rows[0]?.is_official === true);
await expectOk('student edit keeps official flag', () => as('A', `update exercises set is_official = false, title = 'Ex2' returning is_official`), (r) => r.rows[0].is_official === true);

const ex = (who, topicId, path, { ext = 'docx', vis = 'shared', category = 'lab', size = 1000 } = {}) => as(who, `
  insert into exercises (title, topic_id, category, visibility, file_path, file_name, file_ext, mime_type, size_bytes)
  values ('Lab', '${topicId}', '${category}', '${vis}', '${path}', 'lab.${ext}', '${ext}', 'x', ${size}) returning id, subject_id, module_id, category`);
let exShared, exPriv;
await expectOk('A uploads exercise (hierarchy + category saved)', async () => { const r = await ex('A', restTopic, `${ids.A}/e2.docx`); exShared = r.rows[0].id; return r; },
  (r) => r.rows[0].subject_id === it202 && r.rows[0].module_id && r.rows[0].category === 'lab');
await expectOk('A uploads private exercise', async () => { const r = await ex('A', restTopic, `${ids.A}/e3.xlsx`, { ext: 'xlsx', vis: 'private' }); exPriv = r.rows[0].id; return r; });
await expectOk('image exercises are allowed', () => ex('A', restTopic, `${ids.A}/e4.jpg`, { ext: 'jpg' }));
await expectFail('A cannot upload exercise for non-enrolled subject', () => ex('A', logicTopic, `${ids.A}/e5.pdf`, { ext: 'pdf' }), /row-level security/);
await expectFail('A cannot put exercise file in B folder', () => ex('A', restTopic, `${ids.B}/e6.pdf`, { ext: 'pdf' }), /row-level security/);
await expectFail('txt is not an exercise file type', () => ex('A', restTopic, `${ids.A}/e7.txt`, { ext: 'txt' }), /check constraint/);
await expectFail('exercise over 25 MB rejected', () => ex('A', restTopic, `${ids.A}/e8.pdf`, { ext: 'pdf', size: 26214401 }), /check constraint/);
await expectFail('unknown category rejected', () => ex('A', restTopic, `${ids.A}/e9.pdf`, { ext: 'pdf', category: 'exam' }), /invalid input value for enum/);
await expectFail('unknown topic rejected', () => ex('A', '00000000-0000-0000-0000-000000000000', `${ids.A}/e10.pdf`, { ext: 'pdf' }), /Unknown topic/);
await expectOk('B sees shared exercises only', () => as('B', `select id from exercises`), (r) => !r.rows.some((x) => x.id === exPriv) && r.rows.some((x) => x.id === exShared));
await expectOk('instructor sees private exercise', () => as('I', `select id from exercises where id = '${exPriv}'`), rows(1));
await expectOk('B cannot edit A exercise (0 rows)', () => as('B', `update exercises set title = 'x' where id = '${exShared}' returning id`), rows(0));
await expectOk('B cannot delete A exercise (0 rows)', () => as('B', `delete from exercises where id = '${exShared}' returning id`), rows(0));
await expectOk('A edits own exercise (category, visibility)', () => as('A', `update exercises set category = 'quiz', visibility = 'private' where id = '${exShared}' returning category`),
  (r) => r.rows[0]?.category === 'quiz');
await expectOk('instructor edits A exercise', () => as('I', `update exercises set visibility = 'shared' where id = '${exShared}' returning id`), rows(1));
await expectOk('instructor uploads exercise for any subject (official kept)', () => as('I', `
  insert into exercises (title, topic_id, is_official, file_path, file_name, file_ext, mime_type, size_bytes)
  values ('Quiz', '${logicTopic}', true, '${ids.I}/q1.pdf', 'q.pdf', 'pdf', 'x', 10) returning is_official`), (r) => r.rows[0].is_official === true);
await expectOk('exercise file: A uploads into own folder', () => as('A', `insert into storage.objects (bucket_id, name) values ('exercises', '${ids.A}/e3.xlsx') returning id`), rows(1));
await expectFail('exercise file: A cannot upload into B folder', () => as('A', `insert into storage.objects (bucket_id, name) values ('exercises', '${ids.B}/e.pdf')`), /row-level security/);
await expectOk('exercise file: B cannot read private exercise file', () => as('B', `select * from storage.objects where bucket_id = 'exercises' and name = '${ids.A}/e3.xlsx'`), rows(0));
await expectOk('exercise file: instructor can read it', () => as('I', `select * from storage.objects where bucket_id = 'exercises' and name = '${ids.A}/e3.xlsx'`), rows(1));
await expectOk('exercise file: B cannot delete it (0 rows)', () => as('B', `delete from storage.objects where bucket_id = 'exercises' and name = '${ids.A}/e3.xlsx' returning id`), rows(0));
await expectOk('deleting an exercise removes its bookmarks', async () => {
  await as('A', `insert into bookmarks (item_kind, item_id) values ('exercise', '${exPriv}')`);
  await as('A', `delete from exercises where id = '${exPriv}'`);
  return as(null, `select * from bookmarks where item_id = '${exPriv}'`);
}, rows(0));

console.log('\nLearning materials');
const mat = (who, status) => as(who, `
  insert into learning_materials (title, topic_id, type, status, file_path, file_name, file_ext, mime_type, size_bytes)
  values ('Handout', '${restTopic}', 'handout', '${status}', '${ids[who]}/m-${status}.pdf', 'h.pdf', 'pdf', 'x', 10) returning id`);
await expectFail('student cannot add materials', () => mat('A', 'published'), /row-level security/);
let pub;
await expectOk('instructor adds published material', async () => { const r = await mat('I', 'published'); pub = r.rows[0].id; return r; });
await expectOk('instructor adds draft material', () => mat('I', 'draft'));
await expectOk('A sees only published material', () => as('A', `select id from learning_materials`), rows(1));
await expectOk('enrolled A was notified about published material', () => as('A', `select * from notifications where kind = 'new_material'`), rows(1));
await expectOk('B (not enrolled) was not notified', () => as('B', `select * from notifications`), rows(0));
await expectOk('A cannot edit material (0 rows)', () => as('A', `update learning_materials set title = 'x' returning id`), rows(0));
await expectOk('A cannot feature/publish material (0 rows)', () => as('A', `update learning_materials set is_featured = true, status = 'published' returning id`), rows(0));
await expectOk('A cannot delete material (0 rows)', () => as('A', `delete from learning_materials returning id`), rows(0));

console.log('\nLibrary notifications (Phase 5)');
const countNotes = (who, kind) => as(who, `select count(*)::int as n from notifications where kind = '${kind}'`).then((r) => r.rows[0].n);
await expectOk('editing a published material notifies enrolled A', async () => {
  await as('I', `update learning_materials set title = 'Handout v2' where id = '${pub}'`);
  return countNotes('A', 'material_updated');
}, (n) => n === 1);
await expectOk('feature-only change sends no update notice', async () => {
  await as('I', `update learning_materials set is_featured = true where id = '${pub}'`);
  return countNotes('A', 'material_updated');
}, (n) => n === 1);
await expectOk('editing a draft sends nothing', async () => {
  await as('I', `update learning_materials set title = 'Draft v2' where status = 'draft'`);
  return countNotes('A', 'material_updated');
}, (n) => n === 1);
await expectOk('the editor is not notified about their own edit', () => countNotes('I', 'material_updated'), (n) => n === 0);
await expectOk('publishing a draft sends "new material" to A', async () => {
  await as('I', `update learning_materials set status = 'published' where status = 'draft'`);
  return countNotes('A', 'new_material');
}, (n) => n === 2);
await expectOk('A marks own notifications read', () => as('A', `update notifications set read = true where read = false returning id`), (r) => r.rows.length === 3);
await expectOk('A cannot mark others notifications (0 rows)', () => as('A', `update notifications set read = true where user_id <> '${ids.A}' returning id`), rows(0));
await expectOk('A deletes own notification', () => as('A', `delete from notifications where kind = 'material_updated' returning id`), rows(1));

console.log('\nRecent activity & popularity (Phase 5)');
const view = (who, itemId, action = 'viewed') =>
  as(who, `insert into recent_activity (action, item_kind, item_id, item_title) values ('${action}', 'material', '${itemId}', 'Handout')`);
await expectOk('re-opening a file keeps one "viewed" row', async () => {
  await view('A', pub); await view('A', pub); await view('A', pub);
  return as('A', `select * from recent_activity where item_id = '${pub}' and action = 'viewed'`);
}, rows(1));
await expectOk('downloads are kept alongside views', async () => {
  await view('A', pub, 'downloaded');
  return as('A', `select * from recent_activity where item_id = '${pub}'`);
}, rows(2));
await expectFail('A cannot log activity as B', () => as('A', `insert into recent_activity (user_id, action, item_kind, item_id, item_title) values ('${ids.B}', 'viewed', 'material', '${pub}', 'x')`), /row-level security/);
await expectOk('B cannot see A activity', () => as('B', `select * from recent_activity`), rows(0));
await expectOk('history is capped at 100 entries per user', async () => {
  for (let i = 0; i < 105; i++) await view('I', '00000000-0000-0000-0000-' + String(i).padStart(12, '0'), 'downloaded');
  return as('I', `select count(*)::int as n from recent_activity`);
}, (r) => r.rows[0].n === 100);
await expectOk('popular_materials counts distinct people', async () => {
  await view('I', pub);
  return as('A', `select * from popular_materials(5)`);
}, (r) => r.rows.length === 1 && r.rows[0].material_id === pub && Number(r.rows[0].people) === 2);
await expectOk('popular_materials ignores drafts', async () => {
  const draft = (await as(null, `insert into learning_materials (owner_id, title, topic_id, type, status, file_path, file_name, file_ext, mime_type, size_bytes)
    values ('${ids.I}', 'Secret', '${restTopic}', 'notes', 'draft', '${ids.I}/secret.pdf', 's.pdf', 'pdf', 'x', 10) returning id`)).rows[0].id;
  await view('I', draft); await view('X', draft);
  return as('A', `select * from popular_materials(5) where material_id = '${draft}'`);
}, rows(0));
await expectFail('anon cannot call popular_materials', () => as('anon', `select * from popular_materials(5)`), /permission denied/);

console.log('\nLibrary bookmarks & files (Phase 5)');
await expectOk('A bookmarks a material', () => as('A', `insert into bookmarks (item_kind, item_id) values ('material', '${pub}') returning *`), rows(1));
await expectOk('bookmarking twice is ignored (upsert)', () => as('A', `insert into bookmarks (item_kind, item_id) values ('material', '${pub}') on conflict do nothing returning *`), rows(0));
await expectOk('A can remove own bookmark', () => as('A', `delete from bookmarks where item_kind = 'material' and item_id = '${pub}' returning *`), rows(1));
await expectOk('instructor uploads a draft library file', () => as('I', `insert into storage.objects (bucket_id, name) values ('learning-materials', '${ids.I}/secret.pdf') returning id`), rows(1));
await expectOk('A cannot read a draft material file', () => as('A', `select * from storage.objects where bucket_id = 'learning-materials' and name = '${ids.I}/secret.pdf'`), rows(0));
await expectOk('deleting a material removes its bookmarks', async () => {
  await as('A', `insert into bookmarks (item_kind, item_id) values ('material', '${pub}')`);
  const tmp = (await as('I', `insert into learning_materials (title, topic_id, type, file_path, file_name, file_ext, mime_type, size_bytes)
    values ('Temp', '${restTopic}', 'notes', '${ids.I}/tmp.pdf', 't.pdf', 'pdf', 'x', 10) returning id`)).rows[0].id;
  await as('A', `insert into bookmarks (item_kind, item_id) values ('material', '${tmp}')`);
  await as('I', `delete from learning_materials where id = '${tmp}'`);
  return as('A', `select * from bookmarks where item_id = '${tmp}'`);
}, rows(0));

console.log('\nBookmarks, activity, notifications');
await expectOk('A bookmarks shared deck', () => as('A', `insert into bookmarks (item_kind, item_id) values ('presentation', '${shared}') returning *`), rows(1));
await expectFail('A cannot bookmark as B', () => as('A', `insert into bookmarks (user_id, item_kind, item_id) values ('${ids.B}', 'presentation', '${shared}')`), /row-level security/);
await expectOk('B cannot see A bookmarks', () => as('B', `select * from bookmarks`), rows(0));
await expectOk('A logs activity', () => as('A', `insert into recent_activity (action, item_kind, item_id, item_title) values ('viewed', 'presentation', '${shared}', 'Deck') returning id`), rows(1));
await expectFail('A cannot notify B', () => as('A', `insert into notifications (user_id, kind, title, body) values ('${ids.B}', 'announcement', 'x', 'y')`), /row-level security/);
await expectOk('instructor can announce to B', async () => { await as('I', `insert into notifications (user_id, kind, title, body) values ('${ids.B}', 'announcement', 'Hi', 'Read this')`); return as('B', `select * from notifications`); }, rows(1));
await expectOk('deleting a deck removes its bookmarks', async () => {
  await as('X', `delete from presentations where id = '${shared}'`);
  return as(null, `select * from bookmarks where item_id = '${shared}'`);
}, rows(0));

console.log('\nStorage');
const obj = (who, bucket, name) => as(who, `insert into storage.objects (bucket_id, name) values ('${bucket}', '${name}') returning id`);
await expectOk('A uploads into own folder', () => obj('A', 'presentations', `${ids.A}/2.pptx`));
await expectFail('A cannot upload into B folder', () => obj('A', 'presentations', `${ids.B}/x.pptx`), /row-level security/);
await expectFail('A cannot upload library files', () => obj('A', 'learning-materials', `${ids.A}/m.pdf`), /row-level security/);
await expectOk('B cannot read A private-deck file', () => as('B', `select * from storage.objects where name = '${ids.A}/2.pptx'`), rows(0));
await expectOk('A share deck → B can read file', async () => {
  await as('A', `update presentations set visibility = 'shared' where id = '${priv}'`);
  return as('B', `select * from storage.objects where name = '${ids.A}/2.pptx'`);
}, rows(1));
await expectOk('B cannot delete A file (0 rows)', () => as('B', `delete from storage.objects where name = '${ids.A}/2.pptx' returning id`), rows(0));
await expectOk('instructor uploads library file', () => obj('I', 'learning-materials', `${ids.I}/m-published.pdf`));
await expectOk('A can read published library file', () => as('A', `select * from storage.objects where bucket_id = 'learning-materials'`), rows(1));

console.log('\nSuspension');
await expectOk('admin suspends B', () => as('X', `update profiles set status = 'suspended' where id = '${ids.B}' returning id`), rows(1));
await expectOk('suspended B sees no content', () => as('B', `select * from presentations`), rows(0));
await expectFail('suspended B cannot enroll', () => as('B', `insert into enrollments (user_id, subject_id) values ('${ids.B}', '${it202}')`), /row-level security/);
await expectFail('suspended B cannot upload files', () => as('B', `insert into storage.objects (bucket_id, name) values ('presentations', '${ids.B}/z.pptx')`), /row-level security/);
await expectOk('admin changes A role', () => as('X', `update profiles set role = 'instructor' where id = '${ids.A}' returning role`), (r) => r.rows[0].role === 'instructor');

console.log('\nAdmin (Phase 6)');
// State here: X admin, A + I instructors, B suspended student.
await expectFail('admin cannot suspend self', () => as('X', `update profiles set status = 'suspended' where id = '${ids.X}'`), /suspend their own/);
await expectOk('admin_stats gives real counts', () => as('X', `select * from admin_stats()`),
  (r) => Number(r.rows[0].students) === 1 && Number(r.rows[0].instructors) === 2 && Number(r.rows[0].admins) === 1 && Number(r.rows[0].suspended) === 1 && Number(r.rows[0].storage_bytes) > 0);
await expectOk('instructors can read admin_stats', () => as('I', `select * from admin_stats()`), rows(1));
await expectFail('students cannot read admin_stats', () => as('B', `select * from admin_stats()`), /Only instructors/);
await expectFail('anon cannot call admin_stats', () => as('anon', `select * from admin_stats()`), /permission denied/);
await expectOk('instructor announces to INTE 301 (enrolled, active, not self)', () => as('I', `select send_announcement('${it202}', 'Quiz moved', 'Quiz is now on Friday.') as n`),
  (r) => r.rows[0].n === 1);
await expectOk('enrolled A received it', () => as('A', `select * from notifications where kind = 'announcement' and title = 'Quiz moved'`), rows(1));
await expectOk('admin announces to everyone (skips suspended + self)', () => as('X', `select send_announcement(null, 'Welcome', 'Lectern is live.') as n`),
  (r) => r.rows[0].n === 2);
await expectFail('announcement needs a title', () => as('I', `select send_announcement(null, '  ', 'x')`), /need a title/);
await expectFail('students cannot announce', () => as('B', `select send_announcement(null, 'Hi', 'spam')`), /Only instructors/);
await expectFail('anon cannot announce', () => as('anon', `select send_announcement(null, 'Hi', 'spam')`), /permission denied/);
await expectOk('admin reactivates B', () => as('X', `update profiles set status = 'active' where id = '${ids.B}' returning status`), (r) => r.rows[0].status === 'active');
await expectOk('reactivated B sees shared content again', () => as('B', `select * from exercises`), (r) => r.rows.length > 0);
await expectOk('instructor still cannot change roles (0 rows)', () => as('I', `update profiles set role = 'admin' where id = '${ids.B}' returning id`), rows(0));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
