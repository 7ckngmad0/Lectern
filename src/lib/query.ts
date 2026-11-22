import type { ContentItem, SortKey } from '@/types';
import { getModule, getSubject, getTopic } from './catalog';

export interface ContentFilter {
  search?: string;
  subjectId?: string | null;
  topicId?: string | null;
  ownerId?: string | null;
  sort?: SortKey;
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'size', label: 'Largest files' },
];

/** Case-insensitive match across title, description, tags, topic, module, subject and file name. */
export function matchesSearch(item: ContentItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const subject = getSubject(item.subjectId);
  const haystack = [
    item.title,
    item.description,
    item.file.fileName,
    getTopic(item.topicId)?.title,
    'moduleId' in item ? getModule(item.moduleId)?.title : undefined,
    subject?.code,
    subject?.name,
    ...item.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function sortItems<T extends ContentItem>(items: T[], sort: SortKey = 'newest'): T[] {
  const copy = items.slice();
  switch (sort) {
    case 'newest':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'oldest':
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'size':
      return copy.sort((a, b) => b.file.sizeBytes - a.file.sizeBytes);
  }
}

export function filterItems<T extends ContentItem>(items: T[], f: ContentFilter): T[] {
  const filtered = items.filter(
    (item) =>
      (!f.subjectId || item.subjectId === f.subjectId) &&
      (!f.topicId || item.topicId === f.topicId) &&
      (!f.ownerId || item.ownerId === f.ownerId) &&
      (!f.search || matchesSearch(item, f.search)),
  );
  return sortItems(filtered, f.sort);
}
