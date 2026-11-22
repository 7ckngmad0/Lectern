/**
 * Uploaded content in Supabase: presentations (Phase 3), exercises (Phase 4)
 * and library materials (Phase 5). Each kind has its own table + private bucket,
 * so one set of functions handles all three. Every rule (who can see, edit,
 * upload for which subject, who may mark things official/featured/published)
 * is enforced by RLS and triggers; this module only sequences storage + row
 * writes so failures don't leave orphaned files.
 */
import { mimeFor } from '@/lib/files';
import { requireSupabase } from '@/lib/supabase';
import type {
  ContentItem,
  ContentKind,
  ExerciseCategory,
  LearningMaterial,
  MaterialType,
  Visibility,
} from '@/types';
import { newObjectPath, removeFile, uploadFile } from './storage';

type ItemOf<K extends ContentKind> = Extract<ContentItem, { kind: K }>;

const TABLE = { presentation: 'presentations', exercise: 'exercises', material: 'learning_materials' } as const;
const NOUN = { presentation: 'presentation', exercise: 'exercise', material: 'material' } as const;

const FILE_COLUMNS = 'file_path, file_name, file_ext, mime_type, size_bytes, created_at, updated_at';
const BASE_COLUMNS = `id, owner_id, title, description, subject_id, module_id, topic_id, tags, ${FILE_COLUMNS}`;
const COLUMNS: Record<ContentKind, string> = {
  presentation: `${BASE_COLUMNS}, visibility`,
  exercise: `${BASE_COLUMNS}, visibility, category, is_official`,
  material: `${BASE_COLUMNS}, type, is_featured, status`,
};

interface Row {
  id: string;
  owner_id: string | null;
  title: string;
  description: string;
  subject_id: string;
  module_id: string;
  topic_id: string;
  tags: string[] | null;
  file_path: string;
  file_name: string;
  file_ext: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  visibility?: Visibility;
  category?: ExerciseCategory;
  is_official?: boolean;
  type?: MaterialType;
  is_featured?: boolean;
  status?: LearningMaterial['status'];
}

function toItem<K extends ContentKind>(kind: K, r: Row): ItemOf<K> {
  const common = {
    id: r.id,
    title: r.title,
    description: r.description,
    subjectId: r.subject_id,
    topicId: r.topic_id,
    tags: r.tags ?? [],
    // Materials outlive their author's account (owner becomes null).
    ownerId: r.owner_id ?? '',
    file: {
      fileName: r.file_name,
      extension: r.file_ext,
      mimeType: r.mime_type,
      sizeBytes: Number(r.size_bytes),
      storagePath: r.file_path,
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
  let item: ContentItem;
  switch (kind) {
    case 'presentation':
      item = { ...common, kind: 'presentation', visibility: r.visibility ?? 'shared' };
      break;
    case 'exercise':
      item = {
        ...common,
        kind: 'exercise',
        moduleId: r.module_id,
        visibility: r.visibility ?? 'shared',
        category: r.category ?? 'activity',
        isOfficial: !!r.is_official,
      };
      break;
    default:
      item = {
        ...common,
        kind: 'material',
        moduleId: r.module_id,
        type: r.type ?? 'other',
        isFeatured: !!r.is_featured,
        status: r.status ?? 'published',
      };
  }
  return item as ItemOf<K>;
}

/** Everything the current user may see (RLS filters the rows). */
export async function listItems<K extends ContentKind>(kind: K): Promise<ItemOf<K>[]> {
  const { data, error } = await requireSupabase()
    .from(TABLE[kind])
    .select(COLUMNS[kind])
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data as unknown as Row[]).map((r) => toItem(kind, r));
}

export interface PublicProfile {
  id: string;
  full_name: string;
  role: 'student' | 'instructor' | 'admin';
  avatar_url: string | null;
}

/** Uploader names for cards (via the limited public_profiles view). */
export async function fetchPublicProfiles(ids: string[]): Promise<PublicProfile[]> {
  if (!ids.length) return [];
  const { data, error } = await requireSupabase().from('public_profiles').select('id, full_name, role, avatar_url').in('id', ids);
  if (error) throw error;
  return data as PublicProfile[];
}

/** Most opened/downloaded published materials in the last 30 days (aggregate counts only). */
export async function fetchPopularMaterials(limit = 6): Promise<{ id: string; people: number }[]> {
  const { data, error } = await requireSupabase().rpc('popular_materials', { p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as { material_id: string; people: number }[]).map((r) => ({ id: r.material_id, people: Number(r.people) }));
}

export interface ItemFields {
  title: string;
  description: string;
  /** Subject and module are derived from the topic by a database trigger. */
  topicId: string;
  tags: string[];
  /** Presentations and exercises. */
  visibility?: Visibility;
  /** Exercises only. */
  category?: ExerciseCategory;
  /** Exercises only. Ignored by the database unless the user is staff. */
  isOfficial?: boolean;
  /** Materials only (staff-only table). */
  materialType?: MaterialType;
  isFeatured?: boolean;
  status?: LearningMaterial['status'];
}

export interface PickedFile {
  localUri: string;
  fileName: string;
  extension: string;
}

export interface TransferOptions {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

async function uploadPicked(kind: ContentKind, userId: string, file: PickedFile, opts: TransferOptions) {
  const path = newObjectPath(userId, file.extension);
  const mimeType = mimeFor(file.extension); // must match the bucket's allowed list
  const sizeBytes = await uploadFile({
    kind,
    path,
    localUri: file.localUri,
    mimeType,
    onProgress: opts.onProgress,
    signal: opts.signal,
  });
  return {
    file_path: path,
    file_name: file.fileName,
    file_ext: file.extension,
    mime_type: mimeType,
    size_bytes: sizeBytes,
  };
}

function fieldColumns(kind: ContentKind, f: ItemFields): Record<string, unknown> {
  const base = { title: f.title, description: f.description, topic_id: f.topicId, tags: f.tags };
  switch (kind) {
    case 'presentation':
      return { ...base, visibility: f.visibility ?? 'shared' };
    case 'exercise':
      return {
        ...base,
        visibility: f.visibility ?? 'shared',
        category: f.category ?? 'activity',
        ...(f.isOfficial !== undefined && { is_official: f.isOfficial }),
      };
    case 'material':
      return {
        ...base,
        type: f.materialType ?? 'other',
        is_featured: f.isFeatured ?? false,
        status: f.status ?? 'published',
      };
  }
}

/** Upload first, then insert the row; removes the file again if the insert fails. */
export async function createItem<K extends ContentKind>(
  kind: K,
  userId: string,
  fields: ItemFields,
  file: PickedFile,
  opts: TransferOptions = {},
): Promise<ItemOf<K>> {
  const fileColumns = await uploadPicked(kind, userId, file, opts);
  const { data, error } = await requireSupabase()
    .from(TABLE[kind])
    .insert({ ...fieldColumns(kind, fields), ...fileColumns })
    .select(COLUMNS[kind])
    .single();
  if (error) {
    await removeFile(kind, fileColumns.file_path).catch(() => {});
    throw rowError(kind, error);
  }
  return toItem(kind, data as unknown as Row);
}

/**
 * Updates details, optionally replacing the file. The new file is uploaded
 * first; the old one is deleted only after the row points at the new one.
 */
export async function updateItem<K extends ContentKind>(
  kind: K,
  userId: string,
  existing: ItemOf<K>,
  fields: ItemFields,
  newFile: PickedFile | null,
  opts: TransferOptions = {},
): Promise<ItemOf<K>> {
  const fileColumns = newFile ? await uploadPicked(kind, userId, newFile, opts) : null;
  const { data, error } = await requireSupabase()
    .from(TABLE[kind])
    .update({ ...fieldColumns(kind, fields), ...(fileColumns ?? {}) })
    .eq('id', existing.id)
    .select(COLUMNS[kind])
    .maybeSingle();

  if (error || !data) {
    if (fileColumns) await removeFile(kind, fileColumns.file_path).catch(() => {});
    throw error ? rowError(kind, error) : new Error(`You don't have permission to edit this ${NOUN[kind]}.`);
  }
  if (fileColumns && existing.file.storagePath) {
    await removeFile(kind, existing.file.storagePath).catch(() => {});
  }
  return toItem(kind, data as unknown as Row);
}

/** Quick publish/unpublish/feature toggles from the admin list (staff only, enforced by RLS). */
export async function setMaterialFlags(
  m: LearningMaterial,
  patch: { status?: LearningMaterial['status']; isFeatured?: boolean },
): Promise<LearningMaterial> {
  const { data, error } = await requireSupabase()
    .from('learning_materials')
    .update({
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.isFeatured !== undefined && { is_featured: patch.isFeatured }),
    })
    .eq('id', m.id)
    .select(COLUMNS.material)
    .maybeSingle();
  if (error) throw rowError('material', error);
  if (!data) throw new Error('Only instructors and admins can change library materials.');
  return toItem('material', data as unknown as Row);
}

/** Deletes the row (RLS decides), then its file. */
export async function deleteItem(item: ContentItem): Promise<void> {
  const { data, error } = await requireSupabase().from(TABLE[item.kind]).delete().eq('id', item.id).select('id');
  if (error) throw rowError(item.kind, error);
  if (!data?.length) throw new Error(`You don't have permission to delete this ${NOUN[item.kind]}.`);
  if (item.file.storagePath) await removeFile(item.kind, item.file.storagePath).catch(() => {});
}

/** Postgres/PostgREST errors → readable messages. */
function rowError(kind: ContentKind, error: { message: string; code?: string }): Error {
  if (error.code === '42501' || /row-level security/i.test(error.message)) {
    return new Error(
      kind === 'material'
        ? 'Only instructors and admins can manage library materials.'
        : `You can only upload ${NOUN[kind]}s for subjects you are enrolled in. Check your subjects in Edit profile.`,
    );
  }
  if (error.code === '23514') return new Error('Some details are invalid (title length, file type or size).');
  if (/unknown topic/i.test(error.message)) return new Error('That topic no longer exists. Pick another one.');
  return new Error(error.message);
}
