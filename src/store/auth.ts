/**
 * Auth state.
 *  - Supabase mode (EXPO_PUBLIC_SUPABASE_* set): real accounts, persisted
 *    sessions, roles from the `profiles` table.
 *  - Demo mode (no config): the Phase 1 mock accounts, nothing leaves the device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { DEMO_ACCOUNTS, users as mockUsers } from '@/data/mock';
import { newId } from '@/lib/format';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import * as authApi from '@/services/auth';
import * as avatarApi from '@/services/avatar';
import type { Profile } from '@/types';
import { useContentStore } from './content';

export type DemoRole = keyof typeof DEMO_ACCOUNTS;
export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  course?: string;
  section?: string;
  subjectIds: string[];
}

export interface ProfilePatch {
  fullName?: string;
  course?: string;
  section?: string;
  subjectIds?: string[];
}

interface AuthState {
  mode: 'supabase' | 'demo';
  status: AuthStatus;
  user: Profile | null;
  hasOnboarded: boolean;
  /** Message shown on the login screen after a forced sign-out (e.g. suspension). */
  notice: string | null;

  initialize: () => Promise<void>;
  completeOnboarding: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInDemo: (role: DemoRole) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ needsConfirmation: boolean }>;
  resendConfirmation: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  completePasswordRecovery: (code: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Uploads a profile photo (Supabase) or keeps it on the device (demo). */
  setAvatar: (localUri: string, extension: string) => Promise<void>;
  clearAvatar: () => Promise<void>;
  signOut: () => Promise<void>;
  clearNotice: () => void;
}

const ONBOARDED_KEY = 'lectern.hasOnboarded';
const fakeLatency = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
let initStarted = false;

/** Keeps the content store's user list (names/avatars on cards) in sync with the signed-in profile. */
const syncUserToContent = (profile: Profile) => useContentStore.getState().upsertUser(profile);

export const useAuthStore = create<AuthState>((set, get) => {
  /** Loads the profile for a session; signs out suspended or broken accounts. */
  async function applySession(session: Session | null) {
    if (!session) {
      set({ user: null, status: 'signedOut' });
      return;
    }
    try {
      const profile = await authApi.fetchProfile(session.user.id);
      if (profile.status === 'suspended') {
        await supabase?.auth.signOut();
        set({ user: null, status: 'signedOut', notice: 'This account is suspended. Contact your instructor or an administrator.' });
        return;
      }
      syncUserToContent(profile);
      set({ user: profile, status: 'signedIn', hasOnboarded: true });
    } catch (e) {
      // A session without a readable profile can't use the app safely.
      await supabase?.auth.signOut();
      set({ user: null, status: 'signedOut', notice: `Couldn't load your profile. ${authApi.friendlyAuthError(e)}` });
    }
  }

  return {
    mode: isSupabaseConfigured ? 'supabase' : 'demo',
    status: 'initializing',
    user: null,
    hasOnboarded: false,
    notice: null,

    initialize: async () => {
      if (initStarted) return;
      initStarted = true;

      try {
        const flag = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (flag === '1') set({ hasOnboarded: true });
      } catch {
        // Storage unavailable: just show onboarding again.
      }

      if (!supabase) {
        set({ status: 'signedOut' });
        return;
      }

      const { data } = await supabase.auth.getSession();
      await applySession(data.session);

      supabase.auth.onAuthStateChange((event, session) => {
        // Supabase warns against awaiting other auth calls inside this callback; defer instead.
        setTimeout(() => {
          if (event === 'SIGNED_OUT') set({ user: null, status: 'signedOut' });
          else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
            const current = get().user;
            if (!current || current.id !== session?.user.id || event !== 'SIGNED_IN') void applySession(session);
          }
        }, 0);
      });
    },

    completeOnboarding: () => {
      set({ hasOnboarded: true });
      AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
    },

    signIn: async (email, password) => {
      set({ notice: null });
      if (get().mode === 'demo') {
        await fakeLatency();
        const profile = useContentStore.getState().users.find((u) => u.email === email.trim().toLowerCase());
        if (!profile) throw new Error('No demo account uses that email. Tap one of the demo accounts below.');
        if (profile.status === 'suspended') throw new Error('This account is suspended. Contact your instructor.');
        set({ user: { ...profile }, status: 'signedIn', hasOnboarded: true });
        return;
      }
      try {
        await authApi.signInWithPassword(email, password);
        const { data } = await supabase!.auth.getSession();
        await applySession(data.session);
        const notice = get().notice;
        if (get().status !== 'signedIn') throw new Error(notice ?? 'Sign-in failed.');
      } catch (e) {
        set({ notice: null });
        throw new Error(authApi.friendlyAuthError(e));
      }
    },

    signInDemo: async (role) => {
      await fakeLatency();
      const profile = mockUsers.find((u) => u.id === DEMO_ACCOUNTS[role]);
      if (!profile) throw new Error('Demo account not found.');
      set({ user: { ...profile }, status: 'signedIn', hasOnboarded: true, notice: null });
    },

    register: async (input) => {
      if (get().mode === 'demo') {
        await fakeLatency(900);
        const profile: Profile = {
          id: newId('u'),
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          role: 'student',
          course: input.course?.trim() || undefined,
          section: input.section?.trim() || undefined,
          subjectIds: input.subjectIds,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        syncUserToContent(profile);
        set({ user: profile, status: 'signedIn', hasOnboarded: true });
        return { needsConfirmation: false };
      }
      try {
        const result = await authApi.signUp(input);
        if (!result.needsConfirmation) {
          const { data } = await supabase!.auth.getSession();
          await applySession(data.session);
        }
        return result;
      } catch (e) {
        throw new Error(authApi.friendlyAuthError(e));
      }
    },

    resendConfirmation: async (email) => {
      if (get().mode === 'demo') return;
      try {
        await authApi.resendConfirmation(email);
      } catch (e) {
        throw new Error(authApi.friendlyAuthError(e));
      }
    },

    requestPasswordReset: async (email) => {
      if (get().mode === 'demo') {
        await fakeLatency(800);
        return;
      }
      try {
        await authApi.sendPasswordReset(email);
      } catch (e) {
        throw new Error(authApi.friendlyAuthError(e));
      }
    },

    completePasswordRecovery: async (code) => {
      try {
        await authApi.exchangeRecoveryCode(code);
        const { data } = await supabase!.auth.getSession();
        await applySession(data.session);
      } catch (e) {
        throw new Error(authApi.friendlyAuthError(e));
      }
    },

    updatePassword: async (password) => {
      if (get().mode === 'demo') {
        await fakeLatency(600);
        return;
      }
      try {
        await authApi.updatePassword(password);
      } catch (e) {
        throw new Error(authApi.friendlyAuthError(e));
      }
    },

    updateProfile: async (patch) => {
      const current = get().user;
      if (!current) return;
      if (get().mode === 'supabase') {
        try {
          await authApi.updateProfileRow(current.id, {
            fullName: patch.fullName,
            course: patch.course === undefined ? undefined : patch.course || null,
            section: patch.section === undefined ? undefined : patch.section || null,
          });
          if (patch.subjectIds) await authApi.setEnrollments(current.id, patch.subjectIds);
          await get().refreshProfile();
          return;
        } catch (e) {
          throw new Error(authApi.friendlyAuthError(e));
        }
      }
      const next: Profile = {
        ...current,
        ...(patch.fullName !== undefined && { fullName: patch.fullName }),
        ...(patch.course !== undefined && { course: patch.course || undefined }),
        ...(patch.section !== undefined && { section: patch.section || undefined }),
        ...(patch.subjectIds && { subjectIds: patch.subjectIds }),
      };
      syncUserToContent(next);
      set({ user: next });
    },

    refreshProfile: async () => {
      const current = get().user;
      if (!current || get().mode === 'demo') return;
      const profile = await authApi.fetchProfile(current.id);
      if (profile.status === 'suspended') {
        // Suspended while signed in: the database already blocks everything; leave cleanly.
        await supabase?.auth.signOut({ scope: 'local' });
        set({ user: null, status: 'signedOut', notice: 'This account is suspended. Contact your instructor or an administrator.' });
        return;
      }
      syncUserToContent(profile);
      set({ user: profile });
    },

    setAvatar: async (localUri, extension) => {
      const current = get().user;
      if (!current) return;
      const avatarUrl =
        get().mode === 'supabase' ? await avatarApi.uploadAvatar(current.id, localUri, extension, current.avatarUrl) : localUri;
      const next = { ...current, avatarUrl };
      syncUserToContent(next);
      set({ user: next });
    },

    clearAvatar: async () => {
      const current = get().user;
      if (!current) return;
      if (get().mode === 'supabase') await avatarApi.removeAvatar(current.id, current.avatarUrl);
      const next = { ...current, avatarUrl: undefined };
      syncUserToContent(next);
      set({ user: next });
    },

    signOut: async () => {
      if (get().mode === 'supabase') {
        try {
          await authApi.signOut();
        } catch {
          // Even if the network call fails, clear the local session below.
          await supabase?.auth.signOut({ scope: 'local' });
        }
      }
      useContentStore.getState().clearForAccountSwitch();
      set({ user: null, status: 'signedOut' });
    },

    clearNotice: () => set({ notice: null }),
  };
});
