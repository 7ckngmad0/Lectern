import { useEffect, useMemo, useState } from 'react';

import { canView } from '@/lib/permissions';
import { fetchPopularMaterials } from '@/services/content';
import { loadRemote } from '@/services/sync';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { PREF_FOR_KIND, usePrefsStore } from '@/store/prefs';
import type { AppNotification, ContentItem, ContentKind, Exercise, LearningMaterial, Presentation, Profile } from '@/types';

/** The signed-in user. Screens under (app) are guarded, so this is non-null there. */
export function useCurrentUser(): Profile {
  const user = useAuthStore((s) => s.user);
  if (!user) throw new Error('useCurrentUser called outside an authenticated route.');
  return user;
}

export function useVisiblePresentations(): Presentation[] {
  const user = useAuthStore((s) => s.user);
  const list = useContentStore((s) => s.presentations);
  return useMemo(() => list.filter((p) => canView(user, p)), [list, user]);
}

export function useVisibleExercises(): Exercise[] {
  const user = useAuthStore((s) => s.user);
  const list = useContentStore((s) => s.exercises);
  return useMemo(() => list.filter((e) => canView(user, e)), [list, user]);
}

export function useVisibleMaterials(): LearningMaterial[] {
  const user = useAuthStore((s) => s.user);
  const list = useContentStore((s) => s.materials);
  return useMemo(() => list.filter((m) => canView(user, m)), [list, user]);
}

export function useItem(kind: ContentKind, id: string | undefined): ContentItem | undefined {
  const presentations = useContentStore((s) => s.presentations);
  const exercises = useContentStore((s) => s.exercises);
  const materials = useContentStore((s) => s.materials);
  return useMemo(() => {
    if (!id) return undefined;
    const list: ContentItem[] =
      kind === 'presentation' ? presentations : kind === 'exercise' ? exercises : materials;
    return list.find((x) => x.id === id);
  }, [kind, id, presentations, exercises, materials]);
}

/**
 * Presentations and exercises on the same topic (excluding the item itself),
 * so students can jump between a lesson's slides and its activities.
 */
export function useRelatedItems(item: ContentItem, limit = 6): (Presentation | Exercise)[] {
  const presentations = useVisiblePresentations();
  const exercises = useVisibleExercises();
  return useMemo(
    () =>
      [...exercises, ...presentations]
        .filter((x) => x.topicId === item.topicId && !(x.kind === item.kind && x.id === item.id))
        .sort((a, b) => Number(b.kind === 'exercise' && b.isOfficial) - Number(a.kind === 'exercise' && a.isOfficial) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    [exercises, item.id, item.kind, item.topicId, limit, presentations],
  );
}

/** Items the user opened most recently (from their activity history), newest first. */
export function useRecentlyOpened(limit = 3, kind?: ContentKind): ContentItem[] {
  const user = useAuthStore((s) => s.user);
  const activity = useContentStore((s) => s.activity);
  const presentations = useContentStore((s) => s.presentations);
  const exercises = useContentStore((s) => s.exercises);
  const materials = useContentStore((s) => s.materials);
  return useMemo(() => {
    if (!user) return [];
    const lists: Record<ContentKind, ContentItem[]> = { presentation: presentations, exercise: exercises, material: materials };
    const out: ContentItem[] = [];
    for (const a of activity) {
      if (a.userId !== user.id || a.action !== 'viewed' || (kind && a.kind !== kind)) continue;
      const item = lists[a.kind].find((x) => x.id === a.itemId);
      if (item && canView(user, item) && !out.some((x) => x.kind === item.kind && x.id === item.id)) out.push(item);
      if (out.length === limit) break;
    }
    return out;
  }, [activity, exercises, kind, limit, materials, presentations, user]);
}

/**
 * Most opened/downloaded library materials this month, from real activity.
 * Supabase mode only: demo mode doesn't track popularity, so it returns [].
 */
export function usePopularMaterials(limit = 5): { item: LearningMaterial; people: number }[] {
  const mode = useAuthStore((s) => s.mode);
  const materials = useVisibleMaterials();
  const [ranking, setRanking] = useState<{ id: string; people: number }[]>([]);

  useEffect(() => {
    if (mode !== 'supabase') return;
    let alive = true;
    fetchPopularMaterials(limit)
      .then((r) => alive && setRanking(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [limit, mode, materials.length]);

  return useMemo(
    () =>
      ranking.flatMap(({ id, people }) => {
        const item = materials.find((m) => m.id === id);
        return item ? [{ item, people }] : [];
      }),
    [materials, ranking],
  );
}
export function useIsBookmarked(kind: ContentKind, id: string): boolean {
  return useContentStore((s) => s.bookmarks.some((b) => b.kind === kind && b.itemId === id));
}

export function useUserName(id: string): string {
  return useContentStore((s) => s.users.find((u) => u.id === id)?.fullName ?? 'Unknown user');
}

/** Notifications the user hasn't muted in Settings (muting hides, it doesn't delete). */
export function useVisibleNotifications(): AppNotification[] {
  const notifications = useContentStore((s) => s.notifications);
  const prefs = usePrefsStore((s) => s.notificationPrefs);
  return useMemo(() => notifications.filter((n) => prefs[PREF_FOR_KIND[n.kind]]), [notifications, prefs]);
}

export function useUnreadCount(): number {
  const visible = useVisibleNotifications();
  return useMemo(() => visible.reduce((n, x) => n + (x.read ? 0 : 1), 0), [visible]);
}

/**
 * Loading / error / pull-to-refresh state for a Supabase-backed list.
 * Demo mode simulates latency.
 */
export function useRemoteSync(kind: ContentKind) {
  const mode = useAuthStore((s) => s.mode);
  const { status, error } = useContentStore((s) => s.remote[kind]);
  const count = useContentStore((s) =>
    kind === 'presentation' ? s.presentations.length : kind === 'exercise' ? s.exercises.length : s.materials.length,
  );
  const mockLoading = useMockLoading();
  const [refreshing, setRefreshing] = useState(false);

  const remote = mode === 'supabase';
  const refresh = async () => {
    setRefreshing(true);
    try {
      if (remote) await loadRemote(kind);
      else await new Promise((r) => setTimeout(r, 600));
    } finally {
      setRefreshing(false);
    }
  };

  return {
    loading: remote ? (status === 'idle' || status === 'loading') && count === 0 && !refreshing : mockLoading,
    error: remote && status === 'error' ? error : null,
    refreshing,
    refresh,
  };
}

/**
 * Demo mode only: simulates network latency so skeleton states are visible.
 */
export function useMockLoading(ms = 550): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}
