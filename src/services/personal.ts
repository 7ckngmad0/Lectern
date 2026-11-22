/**
 * Per-user data in Supabase (Phase 5): bookmarks, recent activity, notifications.
 * RLS limits every query to the signed-in user's own rows, so no user id filter
 * is trusted from the app; inserts default user_id to auth.uid().
 */
import { requireSupabase } from '@/lib/supabase';
import type { Activity, ActivityAction, AppNotification, Bookmark, ContentKind, NotificationKind } from '@/types';

// ─── Bookmarks ─────────────────────────────────────────────────────────────

export async function listBookmarks(): Promise<Bookmark[]> {
  const { data, error } = await requireSupabase()
    .from('bookmarks')
    .select('item_kind, item_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as { item_kind: ContentKind; item_id: string; created_at: string }[]).map((r) => ({
    kind: r.item_kind,
    itemId: r.item_id,
    createdAt: r.created_at,
  }));
}

export async function addBookmark(kind: ContentKind, itemId: string): Promise<void> {
  // upsert: tapping twice on two devices shouldn't error.
  const { error } = await requireSupabase()
    .from('bookmarks')
    .upsert({ item_kind: kind, item_id: itemId }, { onConflict: 'user_id,item_kind,item_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeBookmark(kind: ContentKind, itemId: string): Promise<void> {
  const { error } = await requireSupabase().from('bookmarks').delete().eq('item_kind', kind).eq('item_id', itemId);
  if (error) throw error;
}

// ─── Recent activity ───────────────────────────────────────────────────────

interface ActivityRow {
  id: string;
  user_id: string;
  action: ActivityAction;
  item_kind: ContentKind;
  item_id: string;
  item_title: string;
  created_at: string;
}

const toActivity = (r: ActivityRow): Activity => ({
  id: r.id,
  userId: r.user_id,
  action: r.action,
  kind: r.item_kind,
  itemId: r.item_id,
  itemTitle: r.item_title,
  createdAt: r.created_at,
});

export async function listActivity(limit = 50): Promise<Activity[]> {
  const { data, error } = await requireSupabase()
    .from('recent_activity')
    .select('id, user_id, action, item_kind, item_id, item_title, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ActivityRow[]).map(toActivity);
}

/** Fire-and-forget friendly: the database de-duplicates views and caps history. */
export async function recordActivity(action: ActivityAction, kind: ContentKind, itemId: string, itemTitle: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('recent_activity')
    .insert({ action, item_kind: kind, item_id: itemId, item_title: itemTitle.slice(0, 200) });
  if (error) throw error;
}

// ─── Notifications ─────────────────────────────────────────────────────────

interface NotificationRow {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  target_kind: ContentKind | null;
  target_id: string | null;
  created_at: string;
}

const NOTIFICATION_COLUMNS = 'id, kind, title, body, read, target_kind, target_id, created_at';

const toNotification = (r: NotificationRow): AppNotification => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  read: r.read,
  createdAt: r.created_at,
  ...(r.target_kind && r.target_id ? { target: { kind: r.target_kind, id: r.target_id } } : {}),
});

export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as NotificationRow[]).map(toNotification);
}

/** A notification for yourself (e.g. "upload complete"). Others are created by database triggers. */
export async function createOwnNotification(
  userId: string,
  n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
): Promise<AppNotification> {
  const { data, error } = await requireSupabase()
    .from('notifications')
    .insert({
      user_id: userId,
      kind: n.kind,
      title: n.title.slice(0, 120),
      body: n.body.slice(0, 500),
      target_kind: n.target?.kind ?? null,
      target_id: n.target?.id ?? null,
    })
    .select(NOTIFICATION_COLUMNS)
    .single();
  if (error) throw error;
  return toNotification(data as NotificationRow);
}

export async function markNotificationsRead(ids: string[] | 'all'): Promise<void> {
  let q = requireSupabase().from('notifications').update({ read: true }).eq('read', false);
  if (ids !== 'all') q = q.in('id', ids);
  const { error } = await q;
  if (error) throw error;
}
