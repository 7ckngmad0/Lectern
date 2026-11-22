// Unit tests for the app's pure logic. Run: npm run test:unit
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeRules, getExtension, mimeFor, validateFile } from '@/lib/files';
import { firstName, formatBytes, formatRelative, initials, parseTags, pluralize } from '@/lib/format';
import { canManage, canUploadForSubject, canView } from '@/lib/permissions';
import { filterItems, matchesSearch, sortItems } from '@/lib/query';
import { validateEmail, validateName, validatePassword } from '@/lib/validation';
import type { Exercise, LearningMaterial, Presentation, Profile } from '@/types';

const MB = 1024 * 1024;

const user = (id: string, role: Profile['role'], subjectIds: string[] = ['s1']): Profile => ({
  id,
  role,
  subjectIds,
  fullName: id,
  email: `${id}@school.edu`,
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
});
const student = user('ana', 'student');
const other = user('ben', 'student');
const instructor = user('ivy', 'instructor', []);

const file = (fileName: string, sizeBytes = 1000) => ({ fileName, extension: getExtension(fileName), mimeType: mimeFor(getExtension(fileName)), sizeBytes });

const deck = (over: Partial<Presentation> = {}): Presentation => ({
  id: 'p1',
  kind: 'presentation',
  title: 'Designing REST APIs',
  description: 'Resources and verbs',
  subjectId: 's1',
  topicId: 't1',
  tags: ['http', 'api'],
  visibility: 'shared',
  ownerId: 'ana',
  file: file('rest.pptx', 3 * MB),
  createdAt: '2026-03-02T00:00:00Z',
  updatedAt: '2026-03-02T00:00:00Z',
  ...over,
});
const exercise = (over: Partial<Exercise> = {}): Exercise => ({
  id: 'e1',
  kind: 'exercise',
  title: 'Truth tables',
  description: '',
  subjectId: 's2',
  moduleId: 'm2',
  topicId: 't2',
  category: 'worksheet',
  tags: [],
  isOfficial: false,
  visibility: 'shared',
  ownerId: 'ben',
  file: file('tables.pdf', 1 * MB),
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  ...over,
});
const material = (over: Partial<LearningMaterial> = {}): LearningMaterial => ({
  id: 'm1',
  kind: 'material',
  title: 'Handout',
  description: '',
  subjectId: 's1',
  moduleId: 'm1',
  topicId: 't1',
  type: 'handout',
  tags: [],
  isFeatured: false,
  status: 'published',
  ownerId: 'ivy',
  file: file('handout.pdf'),
  createdAt: '2026-03-03T00:00:00Z',
  updatedAt: '2026-03-03T00:00:00Z',
  ...over,
});

describe('validation', () => {
  it('checks emails', () => {
    assert.equal(validateEmail(''), 'Enter your email address.');
    assert.equal(validateEmail('maria@school'), 'Enter a valid email address.');
    assert.equal(validateEmail('  maria@school.edu '), null);
  });
  it('checks passwords (strict for sign-up)', () => {
    assert.equal(validatePassword('short'), 'Use at least 8 characters.');
    assert.equal(validatePassword('abcdefgh'), null);
    assert.equal(validatePassword('abcdefgh', { strict: true }), 'Include at least one number.');
    assert.equal(validatePassword('12345678', { strict: true }), 'Include at least one letter.');
    assert.equal(validatePassword('abcd1234', { strict: true }), null);
  });
  it('checks names (matches the 80-char database limit)', () => {
    assert.equal(validateName(' '), 'Enter your full name.');
    assert.equal(validateName('A'), 'Name is too short.');
    assert.equal(validateName('x'.repeat(81)), 'Keep your name under 80 characters.');
    assert.equal(validateName('Maria Santos'), null);
  });
});

describe('file rules (must match the bucket + table limits)', () => {
  it('accepts supported presentation files up to 50 MB', () => {
    assert.equal(validateFile('presentation', { fileName: 'Deck.PPTX', sizeBytes: 50 * MB }), null);
    assert.match(validateFile('presentation', { fileName: 'deck.pptx', sizeBytes: 50 * MB + 1 })!, /limit is 50 MB/);
    assert.match(validateFile('presentation', { fileName: 'notes.docx', sizeBytes: 10 })!, /\.docx files aren't supported/);
  });
  it('limits exercises to 25 MB and allows images', () => {
    assert.equal(validateFile('exercise', { fileName: 'answer.jpg', sizeBytes: MB }), null);
    assert.match(validateFile('exercise', { fileName: 'lab.pdf', sizeBytes: 25 * MB + 1 })!, /limit is 25 MB/);
    assert.match(validateFile('exercise', { fileName: 'notes.txt' })!, /aren't supported/);
  });
  it('allows .txt only in the library', () => {
    assert.equal(validateFile('material', { fileName: 'reviewer.txt', sizeBytes: 100 }), null);
  });
  it('rejects empty files and files without an extension', () => {
    assert.equal(validateFile('exercise', { fileName: 'blank.pdf', sizeBytes: 0 }), 'This file appears to be empty.');
    assert.match(validateFile('exercise', { fileName: 'README' })!, /\.\? files/);
  });
  it('skips the size check when the platform does not report a size', () => {
    assert.equal(validateFile('presentation', { fileName: 'deck.pdf', sizeBytes: null }), null);
  });
  it('maps extensions to the MIME types the buckets allow', () => {
    assert.equal(mimeFor('PPTX'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    assert.equal(mimeFor('jpeg'), 'image/jpeg');
    assert.equal(mimeFor('exe'), 'application/octet-stream');
  });
  it('describes the rules for the picker', () => {
    assert.equal(describeRules('presentation'), 'PPT, PPTX, PDF · up to 50 MB');
  });
});

describe('formatting', () => {
  it('formats sizes', () => {
    assert.equal(formatBytes(0), '0 KB');
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(50 * MB), '50 MB');
  });
  it('formats relative times', () => {
    const now = new Date('2026-03-10T12:00:00Z');
    assert.equal(formatRelative('2026-03-10T11:59:40Z', now), 'Just now');
    assert.equal(formatRelative('2026-03-10T11:15:00Z', now), '45m ago');
    assert.equal(formatRelative('2026-03-09T11:00:00Z', now), 'Yesterday');
    assert.equal(formatRelative('2026-03-06T12:00:00Z', now), '4d ago');
  });
  it('handles names and plurals', () => {
    assert.equal(initials('Prof. Daniel Reyes'), 'DR');
    assert.equal(initials('Maria'), 'M');
    assert.equal(firstName('Dr. Grace Villanueva'), 'Grace');
    assert.equal(pluralize(1, 'person', 'people'), '1 person');
    assert.equal(pluralize(3, 'file'), '3 files');
  });
  it('normalizes tags (lowercase, dashes, unique, max 8 like the database)', () => {
    assert.deepEqual(parseTags('REST, http , rest, Web APIs,,'), ['rest', 'http', 'web-apis']);
    assert.equal(parseTags('a,b,c,d,e,f,g,h,i,j').length, 8);
    assert.deepEqual(parseTags('x'.repeat(25)), []);
  });
});

describe('permissions (mirror of the RLS policies)', () => {
  it('shared items are visible to everyone; private ones to owner and staff', () => {
    const priv = deck({ visibility: 'private' });
    assert.equal(canView(other, deck()), true);
    assert.equal(canView(other, priv), false);
    assert.equal(canView(student, priv), true);
    assert.equal(canView(instructor, priv), true);
    assert.equal(canView(null, deck()), false);
  });
  it('drafts are hidden from students', () => {
    assert.equal(canView(student, material({ status: 'draft' })), false);
    assert.equal(canView(instructor, material({ status: 'draft' })), true);
  });
  it('owners and staff manage uploads; only staff manage the library', () => {
    assert.equal(canManage(student, deck()), true);
    assert.equal(canManage(other, deck()), false);
    assert.equal(canManage(instructor, deck()), true);
    assert.equal(canManage(student, material()), false);
    assert.equal(canManage(instructor, material()), true);
  });
  it('students upload only for enrolled subjects', () => {
    assert.equal(canUploadForSubject(student, 's1'), true);
    assert.equal(canUploadForSubject(student, 's2'), false);
    assert.equal(canUploadForSubject(instructor, 's2'), true);
  });
});

describe('search, filter and sort', () => {
  const items = [deck(), exercise(), deck({ id: 'p2', title: 'Agile', createdAt: '2026-02-01T00:00:00Z', file: file('a.pdf', 9 * MB) })];

  it('searches title, tags, topic, module, subject code/name and file name', () => {
    assert.equal(matchesSearch(deck(), 'rest'), true);
    assert.equal(matchesSearch(deck(), 'HTTP'), true);
    assert.equal(matchesSearch(deck(), 'web systems'), true);
    assert.equal(matchesSearch(exercise(), 'propositional'), true);
    assert.equal(matchesSearch(exercise(), 'module 1: logic'), true);
    assert.equal(matchesSearch(exercise(), 'math 115 tables'), true);
    assert.equal(matchesSearch(exercise(), 'rest'), false);
    assert.equal(matchesSearch(deck(), '   '), true);
  });
  it('sorts by newest, oldest, title and size', () => {
    assert.deepEqual(sortItems(items, 'newest').map((x) => x.id), ['p1', 'e1', 'p2']);
    assert.deepEqual(sortItems(items, 'oldest').map((x) => x.id), ['p2', 'e1', 'p1']);
    assert.deepEqual(sortItems(items, 'title').map((x) => x.title), ['Agile', 'Designing REST APIs', 'Truth tables']);
    assert.deepEqual(sortItems(items, 'size').map((x) => x.id), ['p2', 'p1', 'e1']);
  });
  it('combines filters and does not mutate the input', () => {
    const before = items.map((x) => x.id);
    assert.deepEqual(filterItems(items, { subjectId: 's1', sort: 'title' }).map((x) => x.id), ['p2', 'p1']);
    assert.deepEqual(filterItems(items, { ownerId: 'ben' }).map((x) => x.id), ['e1']);
    assert.deepEqual(filterItems(items, { topicId: 't1', search: 'agile' }).map((x) => x.id), ['p2']);
    assert.deepEqual(items.map((x) => x.id), before);
  });
});
