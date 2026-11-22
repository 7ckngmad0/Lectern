/**
 * Admin console (Phase 6). Staff can read every profile (RLS), only admins can
 * change roles or suspend (trigger `protect_profile_columns`), and statistics /
 * announcements go through staff-only SECURITY DEFINER functions.
 */
import { requireSupabase } from '@/lib/supabase';
import type { Profile, Role } from '@/types';
import { PROFILE_COLUMNS, toProfile, type ProfileRow } from './auth';

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('full_name')
    .limit(1000)
    .returns<ProfileRow[]>();
  if (error) throw adminError(error);
  return data.map(toProfile);
}

async function updateProfileAdmin(id: string, patch: { role?: Role; status?: Profile['status'] }): Promise<Profile> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select(PROFILE_COLUMNS)
    .maybeSingle<ProfileRow>();
  if (error) throw adminError(error);
  if (!data) throw new Error('Only administrators can change accounts.');
  return toProfile(data);
}

export const setRole = (id: string, role: Role) => updateProfileAdmin(id, { role });
export const setStatus = (id: string, status: Profile['status']) => updateProfileAdmin(id, { status });

export interface AdminStats {
  students: number;
  instructors: number;
  admins: number;
  suspended: number;
  presentations: number;
  exercises: number;
  materials: number;
  draftMaterials: number;
  storageBytes: number;
  uploads7d: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data, error } = await requireSupabase().rpc('admin_stats');
  if (error) throw adminError(error);
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, number | string>;
  const n = (k: string) => Number(r?.[k] ?? 0);
  return {
    students: n('students'),
    instructors: n('instructors'),
    admins: n('admins'),
    suspended: n('suspended'),
    presentations: n('presentations'),
    exercises: n('exercises'),
    materials: n('materials'),
    draftMaterials: n('draft_materials'),
    storageBytes: n('storage_bytes'),
    uploads7d: n('uploads_7d'),
  };
}

/** Returns how many people were notified. `subjectId` null → everyone. */
export async function sendAnnouncement(subjectId: string | null, title: string, body: string): Promise<number> {
  const { data, error } = await requireSupabase().rpc('send_announcement', {
    p_subject: subjectId,
    p_title: title,
    p_body: body,
  });
  if (error) throw adminError(error);
  return Number(data ?? 0);
}

function adminError(error: { message: string; code?: string }): Error {
  if (/cannot suspend their own/i.test(error.message)) return new Error("You can't suspend your own account.");
  if (/cannot change their own role/i.test(error.message)) return new Error("You can't change your own role.");
  if (/only administrators/i.test(error.message)) return new Error('Only administrators can change roles or suspend accounts.');
  if (error.code === '42501') return new Error("You don't have permission to do that.");
  return new Error(error.message);
}
