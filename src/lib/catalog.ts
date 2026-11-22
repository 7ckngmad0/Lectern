/**
 * Lookups over the subject → module → topic catalog held in useCatalogStore
 * (mock in demo mode, Supabase otherwise). Screens under (app) only render once
 * the catalog is ready, so these synchronous reads are safe there.
 */
import { useCatalogStore } from '@/store/catalog';
import type { ContentItem, ExerciseCategory, MaterialType, Module, Subject, Topic } from '@/types';

interface Index {
  subjects: Subject[];
  modules: Module[];
  topics: Topic[];
  subjectById: Map<string, Subject>;
  subjectByCode: Map<string, Subject>;
  moduleById: Map<string, Module>;
  topicById: Map<string, Topic>;
}

let cached: Index | null = null;

/** Rebuilds lookup maps only when the catalog arrays change. */
function index(): Index {
  const { subjects, modules, topics } = useCatalogStore.getState();
  if (!cached || cached.subjects !== subjects || cached.modules !== modules || cached.topics !== topics) {
    cached = {
      subjects,
      modules,
      topics,
      subjectById: new Map(subjects.map((s) => [s.id, s])),
      subjectByCode: new Map(subjects.map((s) => [s.code, s])),
      moduleById: new Map(modules.map((m) => [m.id, m])),
      topicById: new Map(topics.map((t) => [t.id, t])),
    };
  }
  return cached;
}

export const getSubjects = (): Subject[] => index().subjects;
/** Reactive list of subjects (re-renders when the catalog loads). */
export const useSubjects = (): Subject[] => useCatalogStore((s) => s.subjects);

export const getSubject = (id?: string | null): Subject | undefined => (id ? index().subjectById.get(id) : undefined);
export const getModule = (id?: string | null): Module | undefined => (id ? index().moduleById.get(id) : undefined);
export const getTopic = (id?: string | null): Topic | undefined => (id ? index().topicById.get(id) : undefined);
export const getSubjectByCode = (code: string): Subject | undefined => index().subjectByCode.get(code);

export const codesFromSubjectIds = (ids: string[]): string[] =>
  ids.map((id) => getSubject(id)?.code).filter((c): c is string => !!c);

export const modulesFor = (subjectId: string): Module[] =>
  index().modules.filter((m) => m.subjectId === subjectId).sort((a, b) => a.order - b.order);

export const topicsFor = (subjectId: string, moduleId?: string | null): Topic[] =>
  index().topics.filter((t) => t.subjectId === subjectId && (!moduleId || t.moduleId === moduleId));

export const EXERCISE_CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'activity', label: 'Activity' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'lab', label: 'Lab' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'worksheet', label: 'Worksheet' },
];

export const MATERIAL_TYPES: { value: MaterialType; label: string; plural: string }[] = [
  { value: 'presentation', label: 'Presentation', plural: 'Presentations' },
  { value: 'pdf', label: 'PDF', plural: 'PDFs' },
  { value: 'exercise', label: 'Exercise', plural: 'Exercises' },
  { value: 'reviewer', label: 'Reviewer', plural: 'Reviewers' },
  { value: 'notes', label: 'Notes', plural: 'Notes' },
  { value: 'handout', label: 'Handout', plural: 'Handouts' },
  { value: 'other', label: 'Other', plural: 'Other' },
];

export const categoryLabel = (c: ExerciseCategory) => EXERCISE_CATEGORIES.find((x) => x.value === c)?.label ?? c;
export const materialTypeLabel = (t: MaterialType) => MATERIAL_TYPES.find((x) => x.value === t)?.label ?? t;

export const KIND_LABEL = {
  presentation: 'Presentation',
  exercise: 'Exercise',
  material: 'Learning material',
} as const;

/** "REST API Design · IT 202" */
export function itemContext(item: ContentItem): string {
  const topic = getTopic(item.topicId)?.title;
  const subject = getSubject(item.subjectId)?.code;
  return [topic, subject].filter(Boolean).join(' · ');
}
