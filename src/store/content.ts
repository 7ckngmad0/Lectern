/**
 * CONTENT STORE: the app's in-memory view of content and per-user data.
 *
 * Supabase mode: presentations, exercises and library materials are loaded from
 * the database (see services/sync). Bookmarks, recent activity and
 * notifications are loaded too, and every change here is applied optimistically
 * and then saved; a failed save is rolled back.
 *
 * Demo mode: everything is mock data held in memory (Phase 1 behaviour).
 */
import { create } from 'zustand';

import * as mock from '@/data/mock';
import { newId } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase';
import * as personal from '@/services/personal';
import type {
  Activity,
  ActivityAction,
  AppNotification,
  Bookmark,
  ContentItem,
  ContentKind,
  Exercise,
  LearningMaterial,
  Presentation,
  Profile,
  Role,
} from '@/types';
import { toast } from './ui';

export type RemoteStatus = 'idle' | 'loading' | 'ready' | 'error';
export interface RemoteState {
  status: RemoteStatus;
  error: string | null;
}

interface ContentState {
  presentations: Presentation[];
  exercises: Exercise[];
  materials: LearningMaterial[];
  users: Profile[];
  bookmarks: Bookmark[];
  activity: Activity[];
  notifications: AppNotification[];
  /** Remote load state per kind (always 'ready' in demo mode). */
  remote: Record<ContentKind, RemoteState>;

  /** Replaces the list for one kind with what the server returned. */
  setRemoteItems: (kind: ContentKind, list: ContentItem[]) => void;
  setRemoteStatus: (kind: ContentKind, status: RemoteStatus, error?: string | null) => void;
  /** Replaces the signed-in user's bookmarks/activity/notifications with server data. */
  setPersonal: (data: Partial<Pick<ContentState, 'bookmarks' | 'activity' | 'notifications'>>) => void;
  /** Adds/updates minimal profiles (name + role) for uploaders shown on cards. */
  mergePublicProfiles: (profiles: { id: string; fullName: string; role: Role; avatarUrl?: string }[]) => void;
  upsertItem: (item: ContentItem) => void;
  removeItem: (kind: ContentKind, id: string) => void;
  /** Returns true when the item is now bookmarked. */
  toggleBookmark: (kind: ContentKind, id: string) => boolean;
  logActivity: (userId: string, action: ActivityAction, item: ContentItem) => void;
  /** Self-notification (e.g. "upload complete"). In Supabase mode it's saved for the given user. */
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>, userId?: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  upsertUser: (user: Profile) => void;
  /** Full account list (staff, Supabase mode). */
  setUsers: (users: Profile[]) => void;
  setUserRole: (id: string, role: Role) => void;
  setUserStatus: (id: string, status: Profile['status']) => void;
  /** Clears everything tied to the previous account (sign-out / account switch). */
  clearForAccountSwitch: () => void;
  resetDemoData: () => void;
}

const remoteInitial = (): Record<ContentKind, RemoteState> => {
  const status: RemoteStatus = isSupabaseConfigured ? 'idle' : 'ready';
  return {
    presentation: { status, error: null },
    exercise: { status, error: null },
    material: { status, error: null },
  };
};

const initialState = () =>
  isSupabaseConfigured
    ? {
        // Real data comes from Supabase after sign-in; nothing mock is mixed in.
        presentations: [] as Presentation[],
        exercises: [] as Exercise[],
        materials: [] as LearningMaterial[],
        remote: remoteInitial(),
        users: [] as Profile[],
        bookmarks: [] as Bookmark[],
        activity: [] as Activity[],
        notifications: [] as AppNotification[],
      }
    : {
        presentations: [...mock.presentations],
        exercises: [...mock.exercises],
        materials: [...mock.materials],
        remote: remoteInitial(),
        users: [...mock.users],
        bookmarks: [...mock.initialBookmarks],
        activity: [...mock.activity],
        notifications: [...mock.notifications],
      };

const listKey = {
  presentation: 'presentations',
  exercise: 'exercises',
  material: 'materials',
} as const;

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const copy = list.slice();
  copy[idx] = item;
  return copy;
}

/** Runs a server write; on failure restores the previous slice and tells the user. */
function persist(write: () => Promise<unknown>, rollback: () => void, message: string) {
  if (!isSupabaseConfigured) return;
  write().catch(() => {
    rollback();
    toast(message, 'error');
  });
}

export const useContentStore = create<ContentState>((set, get) => ({
  ...initialState(),

  setRemoteItems: (kind, list) =>
    set(() => {
      switch (kind) {
        case 'presentation':
          return { presentations: list.filter((x): x is Presentation => x.kind === 'presentation') };
        case 'exercise':
          return { exercises: list.filter((x): x is Exercise => x.kind === 'exercise') };
        case 'material':
          return { materials: list.filter((x): x is LearningMaterial => x.kind === 'material') };
      }
    }),
  setRemoteStatus: (kind, status, error = null) => set((s) => ({ remote: { ...s.remote, [kind]: { status, error } } })),
  setPersonal: (data) => set(data),

  mergePublicProfiles: (profiles) =>
    set((s) => {
      const byId = new Map(s.users.map((u) => [u.id, u]));
      for (const p of profiles) {
        const existing = byId.get(p.id);
        byId.set(
          p.id,
          existing
            ? { ...existing, fullName: p.fullName, role: p.role, avatarUrl: p.avatarUrl }
            : { id: p.id, fullName: p.fullName, role: p.role, avatarUrl: p.avatarUrl, email: '', subjectIds: [], status: 'active', createdAt: '' },
        );
      }
      return { users: [...byId.values()] };
    }),

  upsertItem: (item) =>
    set((s) => {
      switch (item.kind) {
        case 'presentation':
          return { presentations: upsert(s.presentations, item) };
        case 'exercise':
          return { exercises: upsert(s.exercises, item) };
        case 'material':
          return { materials: upsert(s.materials, item) };
      }
    }),

  removeItem: (kind, id) =>
    set((s) => {
      const key = listKey[kind];
      const list = s[key] as ContentItem[];
      // In Supabase mode a database trigger deletes the bookmarks too.
      return {
        [key]: list.filter((x) => x.id !== id),
        bookmarks: s.bookmarks.filter((b) => !(b.kind === kind && b.itemId === id)),
      } as Partial<ContentState>;
    }),

  toggleBookmark: (kind, id) => {
    const before = get().bookmarks;
    const exists = before.some((b) => b.kind === kind && b.itemId === id);
    set({
      bookmarks: exists
        ? before.filter((b) => !(b.kind === kind && b.itemId === id))
        : [{ kind, itemId: id, createdAt: new Date().toISOString() }, ...before],
    });
    persist(
      () => (exists ? personal.removeBookmark(kind, id) : personal.addBookmark(kind, id)),
      () => set({ bookmarks: before }),
      exists ? "Couldn't remove the bookmark" : "Couldn't save the bookmark",
    );
    return !exists;
  },

  logActivity: (userId, action, item) => {
    set((s) => {
      // Collapse repeated "viewed" entries for the same item (the database does the same).
      const rest =
        action === 'viewed'
          ? s.activity.filter((a) => !(a.action === 'viewed' && a.kind === item.kind && a.itemId === item.id))
          : s.activity;
      const entry: Activity = {
        id: newId('a'),
        userId,
        action,
        kind: item.kind,
        itemId: item.id,
        itemTitle: item.title,
        createdAt: new Date().toISOString(),
      };
      return { activity: [entry, ...rest].slice(0, 50) };
    });
    // History is a convenience: a failed save isn't worth interrupting the user.
    if (isSupabaseConfigured) personal.recordActivity(action, item.kind, item.id, item.title).catch(() => {});
  },

  pushNotification: (n, userId) => {
    if (!isSupabaseConfigured || !userId) {
      set((s) => ({
        notifications: [{ ...n, id: newId('n'), read: false, createdAt: new Date().toISOString() }, ...s.notifications],
      }));
      return;
    }
    personal
      .createOwnNotification(userId, n)
      .then((saved) => set((s) => ({ notifications: [saved, ...s.notifications.filter((x) => x.id !== saved.id)] })))
      .catch(() => {});
  },

  markNotificationRead: (id) => {
    const before = get().notifications;
    if (before.find((n) => n.id === id)?.read !== false) return;
    set({ notifications: before.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    persist(() => personal.markNotificationsRead([id]), () => set({ notifications: before }), "Couldn't update the notification");
  },

  markAllNotificationsRead: () => {
    const before = get().notifications;
    set({ notifications: before.map((n) => ({ ...n, read: true })) });
    persist(() => personal.markNotificationsRead('all'), () => set({ notifications: before }), "Couldn't update notifications");
  },

  upsertUser: (user) => set((s) => ({ users: upsert(s.users, user) })),
  setUsers: (users) => set({ users }),
  setUserRole: (id, role) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, role } : u)) })),
  setUserStatus: (id, status) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) })),

  clearForAccountSwitch: () => {
    if (!isSupabaseConfigured) return;
    set({ ...initialState() });
  },

  resetDemoData: () => set(initialState()),
}));

export function findItem(kind: ContentKind, id: string): ContentItem | undefined {
  const s = useContentStore.getState();
  const list: ContentItem[] = s[listKey[kind]];
  return list.find((x) => x.id === id);
}
