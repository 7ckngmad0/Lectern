/**
 * DEMO MODE DATA. Used only when Supabase isn't configured (no .env.local).
 * Shapes match src/types. Never mixed with real data in Supabase mode.
 */
import type {
  Activity,
  AppNotification,
  Exercise,
  FileMeta,
  LearningMaterial,
  Module,
  Presentation,
  Profile,
  Subject,
  Topic,
} from '@/types';
import { getExtension, mimeFor } from '@/lib/files';

const HOUR = 3600 * 1000;
const ago = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * HOUR).toISOString();

const MB = 1024 * 1024;
const file = (fileName: string, sizeMb: number): FileMeta => {
  const extension = getExtension(fileName);
  return { fileName, extension, mimeType: mimeFor(extension), sizeBytes: Math.round(sizeMb * MB) };
};

// ─── Subjects / modules / topics ────────────────────────────────────────────

export const subjects: Subject[] = [
  { id: 'sub_it202', code: 'IT 202', name: 'Systems Integration & Architecture', color: '#3B5BDB' },
  { id: 'sub_it210', code: 'IT 210', name: 'Mobile Application Development', color: '#0CA678' },
  { id: 'sub_math115', code: 'MATH 115', name: 'Discrete Mathematics', color: '#AE3EC9' },
  { id: 'sub_eng102', code: 'ENG 102', name: 'Technical Writing', color: '#1098AD' },
  { id: 'sub_cs101', code: 'CS 101', name: 'Introduction to Computing', color: '#E67700' },
];

const hierarchy: Record<string, { title: string; topics: string[] }[]> = {
  sub_it202: [
    { title: 'Integration Fundamentals', topics: ['Enterprise Integration Patterns', 'Middleware & Message Queues'] },
    { title: 'Service Architecture', topics: ['REST API Design', 'Microservices vs. Monoliths', 'API Gateways'] },
    { title: 'Data Integration', topics: ['ETL Pipelines', 'Data Synchronization'] },
  ],
  sub_it210: [
    { title: 'Getting Started', topics: ['Mobile Platforms Overview', 'React Native Basics'] },
    { title: 'UI & Navigation', topics: ['Layouts with Flexbox', 'Navigation Patterns', 'Accessibility on Mobile'] },
    { title: 'Data & Storage', topics: ['Local Storage', 'Consuming REST APIs'] },
  ],
  sub_math115: [
    { title: 'Logic & Proofs', topics: ['Propositional Logic', 'Proof Techniques'] },
    { title: 'Sets & Relations', topics: ['Set Theory', 'Relations & Functions'] },
    { title: 'Graph Theory', topics: ['Graphs & Trees', 'Shortest Paths'] },
  ],
  sub_eng102: [
    { title: 'Foundations', topics: ['Audience Analysis', 'Plain Language'] },
    { title: 'Technical Documents', topics: ['User Manuals', 'Project Proposals'] },
  ],
  sub_cs101: [
    { title: 'Computer Basics', topics: ['Hardware & Software', 'Number Systems'] },
    { title: 'Problem Solving', topics: ['Algorithms & Flowcharts', 'Pseudocode'] },
  ],
};

export const modules: Module[] = [];
export const topics: Topic[] = [];

for (const [subjectId, mods] of Object.entries(hierarchy)) {
  mods.forEach((mod, mi) => {
    const moduleId = `${subjectId}_m${mi + 1}`;
    modules.push({ id: moduleId, subjectId, title: `Module ${mi + 1}: ${mod.title}`, order: mi + 1 });
    mod.topics.forEach((title, ti) => {
      topics.push({ id: `${moduleId}_t${ti + 1}`, subjectId, moduleId, title });
    });
  });
}

const topicRef = (title: string) => {
  const t = topics.find((x) => x.title === title);
  if (!t) throw new Error(`Unknown mock topic: ${title}`);
  return { subjectId: t.subjectId, moduleId: t.moduleId, topicId: t.id };
};

// ─── Users ──────────────────────────────────────────────────────────────────

export const users: Profile[] = [
  {
    id: 'u_maria',
    fullName: 'Maria Santos',
    email: 'maria.santos@school.edu',
    role: 'student',
    course: 'BS Information Technology',
    section: 'BSIT 3-A',
    subjectIds: ['sub_it202', 'sub_it210', 'sub_math115', 'sub_eng102'],
    status: 'active',
    createdAt: ago(120),
  },
  {
    id: 'u_reyes',
    fullName: 'Prof. Daniel Reyes',
    email: 'd.reyes@school.edu',
    role: 'instructor',
    course: 'College of Computing',
    subjectIds: ['sub_it202', 'sub_it210', 'sub_cs101'],
    status: 'active',
    createdAt: ago(400),
  },
  {
    id: 'u_admin',
    fullName: 'Grace Villanueva',
    email: 'g.villanueva@school.edu',
    role: 'admin',
    course: 'Academic Affairs',
    subjectIds: subjects.map((s) => s.id),
    status: 'active',
    createdAt: ago(600),
  },
  {
    id: 'u_paolo',
    fullName: 'Paolo Mendoza',
    email: 'paolo.mendoza@school.edu',
    role: 'student',
    course: 'BS Information Technology',
    section: 'BSIT 3-A',
    subjectIds: ['sub_it202', 'sub_it210', 'sub_math115'],
    status: 'active',
    createdAt: ago(110),
  },
  {
    id: 'u_andrea',
    fullName: 'Andrea Cruz',
    email: 'andrea.cruz@school.edu',
    role: 'student',
    course: 'BS Computer Science',
    section: 'BSCS 2-B',
    subjectIds: ['sub_math115', 'sub_eng102', 'sub_cs101'],
    status: 'active',
    createdAt: ago(90),
  },
  {
    id: 'u_kevin',
    fullName: 'Kevin Lim',
    email: 'kevin.lim@school.edu',
    role: 'student',
    course: 'BS Information Technology',
    section: 'BSIT 3-A',
    subjectIds: ['sub_it202', 'sub_it210'],
    status: 'active',
    createdAt: ago(75),
  },
  {
    id: 'u_bianca',
    fullName: 'Bianca Torres',
    email: 'bianca.torres@school.edu',
    role: 'student',
    course: 'BS Computer Science',
    section: 'BSCS 2-B',
    subjectIds: ['sub_cs101', 'sub_eng102'],
    status: 'suspended',
    createdAt: ago(60),
  },
  {
    id: 'u_lopez',
    fullName: 'Prof. Ana Lopez',
    email: 'a.lopez@school.edu',
    role: 'instructor',
    course: 'Department of Mathematics',
    subjectIds: ['sub_math115', 'sub_eng102'],
    status: 'active',
    createdAt: ago(500),
  },
];

export const DEMO_ACCOUNTS = {
  student: 'u_maria',
  instructor: 'u_reyes',
  admin: 'u_admin',
} as const;

// ─── Presentations ──────────────────────────────────────────────────────────

const pres = (
  id: string,
  title: string,
  topic: string,
  ownerId: string,
  fileName: string,
  sizeMb: number,
  daysAgo: number,
  description: string,
  tags: string[],
  visibility: Presentation['visibility'] = 'shared',
): Presentation => {
  const ref = topicRef(topic);
  return {
    id,
    kind: 'presentation',
    title,
    description,
    subjectId: ref.subjectId,
    topicId: ref.topicId,
    tags,
    visibility,
    ownerId,
    file: file(fileName, sizeMb),
    createdAt: ago(daysAgo, 3),
    updatedAt: ago(daysAgo, 3),
  };
};

export const presentations: Presentation[] = [
  pres('p_1', 'Designing Clean REST APIs', 'REST API Design', 'u_maria', 'rest-api-design.pptx', 8.4, 1,
    'Group report covering resource naming, HTTP verbs, status codes, pagination and versioning, with examples from public APIs.',
    ['rest', 'http', 'api']),
  pres('p_2', 'Message Queues in Practice', 'Middleware & Message Queues', 'u_paolo', 'message-queues.pptx', 12.1, 3,
    'How producers, consumers and brokers interact. Compares RabbitMQ, Kafka and cloud-managed queues.',
    ['middleware', 'kafka', 'rabbitmq']),
  pres('p_3', 'Flexbox Layouts for Mobile', 'Layouts with Flexbox', 'u_maria', 'flexbox-layouts.pdf', 3.2, 6,
    'Exported slides with visual examples of flexDirection, justifyContent and alignItems on phone screens.',
    ['react-native', 'layout']),
  pres('p_4', 'Proof by Induction, Step by Step', 'Proof Techniques', 'u_andrea', 'induction-proofs.pptx', 5.6, 8,
    'Walkthrough of weak and strong induction with five worked examples and common mistakes.',
    ['induction', 'proofs']),
  pres('p_5', 'Microservices: When Not To', 'Microservices vs. Monoliths', 'u_kevin', 'microservices-tradeoffs.pptx', 9.8, 11,
    'Trade-offs between service decomposition and a modular monolith, with a decision checklist.',
    ['architecture', 'microservices']),
  pres('p_6', 'Writing for Your Audience', 'Audience Analysis', 'u_maria', 'audience-analysis.ppt', 4.1, 15,
    'Personal draft for the ENG 102 reporting. Still revising the examples section.',
    ['writing'], 'private'),
  pres('p_7', 'Navigating Between Screens', 'Navigation Patterns', 'u_paolo', 'navigation-patterns.pptx', 7.3, 18,
    'Stack, tab and drawer navigation compared, with when to use each and UX pitfalls.',
    ['navigation', 'ux']),
  pres('p_8', 'Graphs, Trees & Traversals', 'Graphs & Trees', 'u_kevin', 'graphs-trees.pdf', 2.7, 21,
    'BFS and DFS visualized, plus spanning trees. Exported from Google Slides.',
    ['graphs', 'bfs', 'dfs']),
];

// ─── Exercises ──────────────────────────────────────────────────────────────

const ex = (
  id: string,
  title: string,
  topic: string,
  ownerId: string,
  category: Exercise['category'],
  fileName: string,
  sizeMb: number,
  daysAgo: number,
  description: string,
  isOfficial: boolean,
  tags: string[] = [],
): Exercise => {
  const ref = topicRef(topic);
  return {
    id,
    kind: 'exercise',
    title,
    description,
    ...ref,
    category,
    tags,
    isOfficial,
    visibility: 'shared',
    ownerId,
    file: file(fileName, sizeMb),
    createdAt: ago(daysAgo, 5),
    updatedAt: ago(daysAgo, 5),
  };
};

export const exercises: Exercise[] = [
  ex('e_1', 'Lab 4: Build a REST Endpoint', 'REST API Design', 'u_reyes', 'lab', 'lab4-rest-endpoint.pdf', 0.9, 2,
    'Implement GET and POST endpoints for a "courses" resource. Submit screenshots of your Postman tests.', true, ['lab', 'rest']),
  ex('e_2', 'Truth Tables Worksheet', 'Propositional Logic', 'u_lopez', 'worksheet', 'truth-tables.docx', 0.3, 4,
    'Complete truth tables for the 12 compound propositions and identify tautologies.', true, ['logic']),
  ex('e_3', 'Flexbox Practice Answers', 'Layouts with Flexbox', 'u_maria', 'activity', 'flexbox-practice.pdf', 1.4, 5,
    'My solutions to the in-class flexbox activity with screenshots from Expo Go.', false, ['flexbox']),
  ex('e_4', 'Quiz 2 Reviewer: Sets', 'Set Theory', 'u_andrea', 'quiz', 'sets-quiz-reviewer.docx', 0.2, 7,
    'Practice questions on unions, intersections, power sets and Venn diagrams.', false, ['sets', 'reviewer']),
  ex('e_5', 'ETL Mapping Activity', 'ETL Pipelines', 'u_reyes', 'activity', 'etl-mapping.xlsx', 0.6, 9,
    'Map source columns to the target warehouse schema and note required transformations.', true, ['etl', 'data']),
  ex('e_6', 'User Manual Draft Assignment', 'User Manuals', 'u_lopez', 'assignment', 'user-manual-assignment.pdf', 0.4, 12,
    'Write a 3-page user manual for a simple mobile app. Rubric included on page 2.', true, ['writing']),
  ex('e_7', 'Shortest Path Exercises', 'Shortest Paths', 'u_paolo', 'worksheet', 'dijkstra-exercises.pdf', 1.1, 14,
    'Dijkstra practice on four weighted graphs, with my worked solutions.', false, ['graphs']),
  ex('e_8', 'Wireframe Sketch: Navigation', 'Navigation Patterns', 'u_maria', 'activity', 'nav-wireframe.png', 2.3, 20,
    'Paper wireframe for the tab navigation activity.', false, ['wireframe']),
];

// ─── Learning materials (library) ──────────────────────────────────────────

const lm = (
  id: string,
  title: string,
  topic: string,
  type: LearningMaterial['type'],
  ownerId: string,
  fileName: string,
  sizeMb: number,
  daysAgo: number,
  description: string,
  opts: { featured?: boolean; status?: LearningMaterial['status']; tags?: string[] } = {},
): LearningMaterial => {
  const ref = topicRef(topic);
  return {
    id,
    kind: 'material',
    title,
    description,
    ...ref,
    type,
    tags: opts.tags ?? [],
    isFeatured: opts.featured ?? false,
    status: opts.status ?? 'published',
    ownerId,
    file: file(fileName, sizeMb),
    createdAt: ago(daysAgo, 2),
    updatedAt: ago(daysAgo, 2),
  };
};

export const materials: LearningMaterial[] = [
  lm('m_1', 'Integration Patterns Handbook', 'Enterprise Integration Patterns', 'handout', 'u_reyes', 'integration-patterns.pdf', 6.2, 1,
    'Official course handbook summarizing the core integration patterns we cover this term.', { featured: true, tags: ['patterns'] }),
  lm('m_2', 'Midterm Reviewer: Logic & Sets', 'Set Theory', 'reviewer', 'u_lopez', 'midterm-reviewer-math115.pdf', 2.4, 2,
    'Coverage, sample problems and answer key for the MATH 115 midterm.', { featured: true, tags: ['midterm', 'reviewer'] }),
  lm('m_3', 'React Native Basics (Lecture 2)', 'React Native Basics', 'presentation', 'u_reyes', 'lecture2-rn-basics.pptx', 14.8, 4,
    'Lecture slides: components, props, state and the Expo workflow.', { featured: true, tags: ['lecture'] }),
  lm('m_4', 'API Gateway Lecture Notes', 'API Gateways', 'notes', 'u_reyes', 'api-gateway-notes.pdf', 1.1, 6,
    'Notes on routing, rate limiting and authentication at the gateway layer.'),
  lm('m_5', 'Plain Language Checklist', 'Plain Language', 'handout', 'u_lopez', 'plain-language-checklist.pdf', 0.3, 8,
    'One-page checklist to apply before submitting any technical document.', { tags: ['checklist'] }),
  lm('m_6', 'Accessibility on Mobile', 'Accessibility on Mobile', 'pdf', 'u_reyes', 'mobile-a11y.pdf', 3.6, 10,
    'Screen readers, touch target sizes, color contrast and dynamic type.', { tags: ['a11y'] }),
  lm('m_7', 'Number Systems Practice Set', 'Number Systems', 'exercise', 'u_reyes', 'number-systems-practice.docx', 0.5, 13,
    'Binary, octal and hexadecimal conversion drills with answers.'),
  lm('m_8', 'Proposal Template', 'Project Proposals', 'other', 'u_lopez', 'proposal-template.docx', 0.2, 16,
    'Editable template for the final project proposal.'),
  lm('m_9', 'Data Synchronization Strategies', 'Data Synchronization', 'presentation', 'u_reyes', 'data-sync.pptx', 10.5, 19,
    'Polling, webhooks, CDC and conflict resolution strategies.'),
  lm('m_10', 'Graph Theory Reviewer (Draft)', 'Graphs & Trees', 'reviewer', 'u_lopez', 'graph-theory-reviewer.pdf', 1.8, 0,
    'Draft reviewer for the finals. Not yet visible to students.', { status: 'draft' }),
];

// ─── Notifications & activity (for the student demo account) ───────────────

export const notifications: AppNotification[] = [
  {
    id: 'n_1',
    kind: 'new_material',
    title: 'New learning material',
    body: 'Prof. Daniel Reyes added "Integration Patterns Handbook" to IT 202.',
    read: false,
    createdAt: ago(0, 20),
    target: { kind: 'material', id: 'm_1' },
  },
  {
    id: 'n_2',
    kind: 'upload_success',
    title: 'Upload complete',
    body: '"Designing Clean REST APIs" was uploaded successfully.',
    read: false,
    createdAt: ago(1, 3),
    target: { kind: 'presentation', id: 'p_1' },
  },
  {
    id: 'n_3',
    kind: 'announcement',
    title: 'Reporting schedule posted',
    body: 'IT 202 group reports start next Monday. Upload your slides at least one day before.',
    read: true,
    createdAt: ago(2, 1),
  },
  {
    id: 'n_4',
    kind: 'material_updated',
    title: 'Material updated',
    body: '"Midterm Reviewer: Logic & Sets" has a new version with corrected answers.',
    read: true,
    createdAt: ago(2, 6),
    target: { kind: 'material', id: 'm_2' },
  },
];

export const activity: Activity[] = [
  { id: 'a_1', userId: 'u_maria', action: 'viewed', kind: 'material', itemId: 'm_1', itemTitle: 'Integration Patterns Handbook', createdAt: ago(0, 6) },
  { id: 'a_2', userId: 'u_maria', action: 'uploaded', kind: 'presentation', itemId: 'p_1', itemTitle: 'Designing Clean REST APIs', createdAt: ago(1, 3) },
  { id: 'a_3', userId: 'u_maria', action: 'viewed', kind: 'exercise', itemId: 'e_1', itemTitle: 'Lab 4: Build a REST Endpoint', createdAt: ago(1, 8) },
  { id: 'a_4', userId: 'u_maria', action: 'viewed', kind: 'material', itemId: 'm_2', itemTitle: 'Midterm Reviewer: Logic & Sets', createdAt: ago(2, 2) },
  { id: 'a_5', userId: 'u_maria', action: 'uploaded', kind: 'exercise', itemId: 'e_3', itemTitle: 'Flexbox Practice Answers', createdAt: ago(5, 5) },
];

export const initialBookmarks = [
  { kind: 'material' as const, itemId: 'm_2', createdAt: ago(2) },
  { kind: 'presentation' as const, itemId: 'p_2', createdAt: ago(3) },
  { kind: 'exercise' as const, itemId: 'e_1', createdAt: ago(1) },
];
