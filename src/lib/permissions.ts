/**
 * Client-side permission checks used to shape the UI.
 * These mirror the Row Level Security policies added in Phase 2 — the database
 * remains the source of truth; hiding a button here is a convenience, not security.
 */
import type { ContentItem, Profile } from '@/types';

export const isStaff = (user: Profile | null | undefined): boolean =>
  user?.role === 'instructor' || user?.role === 'admin';

export function canView(user: Profile | null | undefined, item: ContentItem): boolean {
  if (!user) return false;
  if (isStaff(user) || item.ownerId === user.id) return true;
  if (item.kind === 'material') return item.status === 'published';
  return item.visibility === 'shared';
}

export function canManage(user: Profile | null | undefined, item: ContentItem): boolean {
  if (!user) return false;
  if (item.kind === 'material') return isStaff(user);
  return item.ownerId === user.id || isStaff(user);
}

/** Students may only upload for subjects they're enrolled in. */
export function canUploadForSubject(user: Profile | null | undefined, subjectId: string): boolean {
  if (!user) return false;
  return isStaff(user) || user.subjectIds.includes(subjectId);
}
