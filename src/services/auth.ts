/**
 * Supabase Auth + profile access. All permission checks happen in the
 * database (RLS + triggers); this module only maps data and errors.
 */
import { AuthError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { codesFromSubjectIds } from '@/lib/catalog';
import { requireSupabase } from '@/lib/supabase';
import type { Profile } from '@/types';

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: Profile['role'];
  status: Profile['status'];
  course: string | null;
  section: string | null;
  avatar_url: string | null;
  created_at: string;
  enrollments: { subject_id: string }[] | null;
}

export const PROFILE_COLUMNS =
  'id, full_name, email, role, status, course, section, avatar_url, created_at, enrollments(subject_id)';

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    status: row.status,
    course: row.course ?? undefined,
    section: row.section ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
    // Catalog ids are database ids in Supabase mode.
    subjectIds: (row.enrollments ?? []).map((e) => e.subject_id),
  };
}

/** Turns Supabase errors into messages a student can act on. */
export function friendlyAuthError(error: unknown): string {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Incorrect email or password.';
      case 'email_not_confirmed':
        return 'Please confirm your email first. Check your inbox for the link.';
      case 'user_already_exists':
      case 'email_exists':
        return 'An account with this email already exists. Try signing in.';
      case 'weak_password':
        return 'That password is too weak. Use at least 8 characters with letters and numbers.';
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'Too many attempts. Please wait a minute and try again.';
      case 'same_password':
        return 'Your new password must be different from the old one.';
      case 'flow_state_expired':
      case 'otp_expired':
        return 'This link has expired. Request a new one.';
    }
    if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
      return "Can't reach the server. Check your internet connection.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    if (/network request failed|fetch failed/i.test(error.message)) {
      return "Can't reach the server. Check your internet connection.";
    }
    return error.message;
  }
  // PostgREST/Storage errors are plain objects ({ message, code, hint }), not Error instances.
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message) {
    const { message } = error;
    if (/permission denied|row-level security/i.test(message)) {
      return `The database refused access (${message}). Check that all SQL files ran and the table permissions are granted.`;
    }
    return message;
  }
  return 'Something went wrong. Please try again.';
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single<ProfileRow>();
  if (error) throw error;
  return toProfile(data);
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  course?: string;
  section?: string;
  subjectIds: string[];
}

/** Returns `needsConfirmation: true` when the project requires email confirmation. */
export async function signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await requireSupabase().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      // Read by the handle_new_user trigger. The role is never taken from here.
      data: {
        full_name: input.fullName.trim(),
        course: input.course?.trim() || null,
        section: input.section?.trim() || null,
        subject_codes: codesFromSubjectIds(input.subjectIds),
      },
      emailRedirectTo: Linking.createURL('/login'),
    },
  });
  if (error) throw error;
  // With email-enumeration protection, an existing address returns a user with no identities.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error('An account with this email already exists. Try signing in.');
  }
  return { needsConfirmation: !data.session };
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await requireSupabase().auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: Linking.createURL('/login') },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

/** URL the reset email links back to. In Expo Go this is an exp:// URL. */
export const passwordResetRedirect = () => Linking.createURL('/reset-password');

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: passwordResetRedirect(),
  });
  if (error) throw error;
}

/** Completes the PKCE flow from the reset email link and signs the user in. */
export async function exchangeRecoveryCode(code: string): Promise<void> {
  const { error } = await requireSupabase().auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function updateProfileRow(
  userId: string,
  patch: { fullName?: string; course?: string | null; section?: string | null },
): Promise<void> {
  const row: Record<string, string | null> = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.course !== undefined) row.course = patch.course;
  if (patch.section !== undefined) row.section = patch.section;
  const { error } = await requireSupabase().from('profiles').update(row).eq('id', userId);
  if (error) throw error;
}

/** Replaces the user's enrollments with the given subjects (database ids). */
export async function setEnrollments(userId: string, subjectIds: string[]): Promise<void> {
  const sb = requireSupabase();
  const wanted = new Set(subjectIds);

  const { data: current, error: currentError } = await sb.from('enrollments').select('subject_id').eq('user_id', userId);
  if (currentError) throw currentError;
  const have = new Set((current ?? []).map((e: { subject_id: string }) => e.subject_id));

  const toRemove = [...have].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !have.has(id));

  if (toRemove.length) {
    const { error } = await sb.from('enrollments').delete().eq('user_id', userId).in('subject_id', toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await sb.from('enrollments').insert(toAdd.map((subject_id) => ({ user_id: userId, subject_id })));
    if (error) throw error;
  }
}
