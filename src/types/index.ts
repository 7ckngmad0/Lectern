/**
 * Domain model (camelCase). Mirrors the Supabase tables in supabase/migrations;
 * the services layer maps snake_case rows to these shapes.
 */

export type Role = 'student' | 'instructor' | 'admin';

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  course?: string;
  section?: string;
  avatarUrl?: string;
  /** Subjects the user is enrolled in / teaches. Limits which topics a student may upload for. */
  subjectIds: string[];
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  /** Accent color used on subject cards. */
  color: string;
}

export interface Module {
  id: string;
  subjectId: string;
  title: string;
  order: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  moduleId: string;
  title: string;
}

export interface FileMeta {
  fileName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  /** Local file URI of a freshly picked file (not yet uploaded). */
  uri?: string;
  /** Supabase Storage object key, e.g. "<owner uuid>/<random>.pptx". Absent for mock items. */
  storagePath?: string;
}

export type ContentKind = 'presentation' | 'exercise' | 'material';

export type Visibility = 'shared' | 'private';

export interface Presentation {
  id: string;
  kind: 'presentation';
  title: string;
  description: string;
  subjectId: string;
  topicId: string;
  tags: string[];
  visibility: Visibility;
  ownerId: string;
  file: FileMeta;
  createdAt: string;
  updatedAt: string;
}

export type ExerciseCategory = 'activity' | 'quiz' | 'lab' | 'assignment' | 'worksheet';

export interface Exercise {
  id: string;
  kind: 'exercise';
  title: string;
  description: string;
  subjectId: string;
  moduleId: string;
  topicId: string;
  category: ExerciseCategory;
  tags: string[];
  /** Marked by an instructor as an official learning activity. */
  isOfficial: boolean;
  visibility: Visibility;
  ownerId: string;
  file: FileMeta;
  createdAt: string;
  updatedAt: string;
}

export type MaterialType = 'presentation' | 'pdf' | 'exercise' | 'reviewer' | 'notes' | 'handout' | 'other';

export interface LearningMaterial {
  id: string;
  kind: 'material';
  title: string;
  description: string;
  subjectId: string;
  moduleId: string;
  topicId: string;
  type: MaterialType;
  tags: string[];
  isFeatured: boolean;
  status: 'published' | 'draft';
  ownerId: string;
  file: FileMeta;
  createdAt: string;
  updatedAt: string;
}

export type ContentItem = Presentation | Exercise | LearningMaterial;

export interface Bookmark {
  kind: ContentKind;
  itemId: string;
  createdAt: string;
}

export type ActivityAction = 'uploaded' | 'viewed' | 'downloaded' | 'updated' | 'deleted' | 'bookmarked';

export interface Activity {
  id: string;
  userId: string;
  action: ActivityAction;
  kind: ContentKind;
  itemId: string;
  itemTitle: string;
  createdAt: string;
}

export type NotificationKind = 'upload_success' | 'new_material' | 'material_updated' | 'announcement';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  /** Optional deep link to the related item. */
  target?: { kind: ContentKind; id: string };
}

export type SortKey = 'newest' | 'oldest' | 'title' | 'size';
