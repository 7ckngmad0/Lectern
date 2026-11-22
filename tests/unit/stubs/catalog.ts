// Test stand-in for src/lib/catalog (which reads the Zustand catalog store).
import type { Module, Subject, Topic } from '../../../src/types/index.ts';

export const subjects: Subject[] = [
  { id: 's1', code: 'IT 202', name: 'Web Systems', color: '#000' },
  { id: 's2', code: 'MATH 115', name: 'Discrete Mathematics', color: '#000' },
];
export const modules: Module[] = [
  { id: 'm1', subjectId: 's1', title: 'Module 1: APIs', order: 1 },
  { id: 'm2', subjectId: 's2', title: 'Module 1: Logic', order: 1 },
];
export const topics: Topic[] = [
  { id: 't1', subjectId: 's1', moduleId: 'm1', title: 'REST API Design' },
  { id: 't2', subjectId: 's2', moduleId: 'm2', title: 'Propositional Logic' },
];

export const getSubject = (id?: string) => subjects.find((s) => s.id === id);
export const getModule = (id?: string) => modules.find((m) => m.id === id);
export const getTopic = (id?: string) => topics.find((t) => t.id === id);
