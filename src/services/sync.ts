/**
 * Loads signed-in data in Supabase mode: the catalog, all content the user may
 * see (presentations, exercises, library materials) and their own bookmarks,
 * recent activity and notifications.
 */
import { useAuthStore } from '@/store/auth';
import { useCatalogStore } from '@/store/catalog';
import { useContentStore } from '@/store/content';
import type { ContentKind } from '@/types';
import { friendlyAuthError } from './auth';
import { fetchPublicProfiles, listItems } from './content';
import { listActivity, listBookmarks, listNotifications } from './personal';

const CONTENT_KINDS: ContentKind[] = ['presentation', 'exercise', 'material'];
const inFlight = new Map<ContentKind, Promise<void>>();

/** Fetches one kind (RLS-filtered) plus the uploaders' display names. Deduplicated. */
export function loadRemote(kind: ContentKind): Promise<void> {
  const pending = inFlight.get(kind);
  if (pending) return pending;
  const run = (async () => {
    const store = useContentStore.getState();
    store.setRemoteStatus(kind, 'loading');
    try {
      const list = await listItems(kind);
      const ownerIds = [...new Set(list.map((p) => p.ownerId).filter(Boolean))];
      const profiles = await fetchPublicProfiles(ownerIds).catch(() => []);
      store.mergePublicProfiles(profiles.map((p) => ({ id: p.id, fullName: p.full_name, role: p.role, avatarUrl: p.avatar_url ?? undefined })));
      store.setRemoteItems(kind, list);
      store.setRemoteStatus(kind, 'ready');
    } catch (e) {
      store.setRemoteStatus(kind, 'error', friendlyAuthError(e));
    } finally {
      inFlight.delete(kind);
    }
  })();
  inFlight.set(kind, run);
  return run;
}

let personalInFlight: Promise<void> | null = null;

/**
 * Bookmarks, recent activity and notifications. Failures keep whatever is
 * already shown: these lists are conveniences, not blockers.
 */
export function loadPersonal(): Promise<void> {
  if (personalInFlight) return personalInFlight;
  personalInFlight = (async () => {
    const [bookmarks, activity, notifications] = await Promise.allSettled([
      listBookmarks(),
      listActivity(),
      listNotifications(),
    ]);
    useContentStore.getState().setPersonal({
      ...(bookmarks.status === 'fulfilled' && { bookmarks: bookmarks.value }),
      ...(activity.status === 'fulfilled' && { activity: activity.value }),
      ...(notifications.status === 'fulfilled' && { notifications: notifications.value }),
    });
  })().finally(() => {
    personalInFlight = null;
  });
  return personalInFlight;
}

/** Pull-to-refresh on the dashboard: everything at once. */
export async function refreshAll(): Promise<void> {
  await Promise.all([...CONTENT_KINDS.map(loadRemote), loadPersonal()]);
}

let lastUserId: string | null = null;

/** Called when a user is signed in (Supabase mode). Safe to call repeatedly. */
export async function bootstrapSignedIn(userId: string): Promise<void> {
  if (lastUserId !== userId) {
    // Never show the previous account's data, even briefly.
    useContentStore.getState().clearForAccountSwitch();
    const me = useAuthStore.getState().user;
    if (me) useContentStore.getState().upsertUser(me);
    lastUserId = userId;
  }
  await useCatalogStore.getState().load();
  if (useCatalogStore.getState().status !== 'ready') return;
  await refreshAll();
}
