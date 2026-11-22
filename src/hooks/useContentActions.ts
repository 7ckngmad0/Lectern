import { router } from 'expo-router';
import { useCallback } from 'react';

import type { SheetOption } from '@/components/ui';
import { KIND_LABEL } from '@/lib/catalog';
import { canManage } from '@/lib/permissions';
import { detailHref, editHref } from '@/lib/routes';
import { deleteItem } from '@/services/content';
import { downloadAndOpen, TransferCancelledError } from '@/services/storage';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { confirmAction, toast, useUiStore } from '@/store/ui';
import type { ContentItem } from '@/types';

/** True when the item lives in Supabase (has a storage object). Mock items don't. */
export const isRemoteItem = (item: ContentItem) => !!item.file.storagePath;

/**
 * Shared actions for presentations, exercises and materials.
 * Remote items (Supabase) download/delete for real; mock items (demo mode) keep the placeholder behaviour.
 */
export function useContentActions() {
  const user = useAuthStore((s) => s.user);
  const removeItem = useContentStore((s) => s.removeItem);
  const toggleBookmark = useContentStore((s) => s.toggleBookmark);
  const logActivity = useContentStore((s) => s.logActivity);
  const bookmarks = useContentStore((s) => s.bookmarks);

  const download = useCallback(
    async (item: ContentItem) => {
      if (!isRemoteItem(item)) {
        if (user) logActivity(user.id, 'downloaded', item);
        toast(`Demo file: "${item.file.fileName}" has no real file to download`, 'info');
        return;
      }
      const { setTransfer, transfer } = useUiStore.getState();
      if (transfer) {
        toast('Another download is in progress', 'info');
        return;
      }
      const controller = new AbortController();
      const title = `Downloading ${item.file.fileName}`;
      setTransfer({ title, progress: 0, onCancel: () => controller.abort() });
      try {
        await downloadAndOpen({
          kind: item.kind,
          path: item.file.storagePath!,
          fileName: item.file.fileName,
          mimeType: item.file.mimeType,
          signal: controller.signal,
          onProgress: (progress) => useUiStore.getState().setTransfer({ title, progress, onCancel: () => controller.abort() }),
        });
        if (user) logActivity(user.id, 'downloaded', item);
      } catch (e) {
        if (e instanceof TransferCancelledError) toast('Download cancelled', 'info');
        else toast(e instanceof Error ? e.message : "Couldn't download the file", 'error');
      } finally {
        useUiStore.getState().setTransfer(null);
      }
    },
    [logActivity, user],
  );

  const bookmark = useCallback(
    (item: ContentItem) => {
      const added = toggleBookmark(item.kind, item.id);
      toast(added ? 'Saved to bookmarks' : 'Removed from bookmarks', added ? 'success' : 'info');
    },
    [toggleBookmark],
  );

  const remove = useCallback(
    (item: ContentItem, after?: () => void) => {
      confirmAction({
        title: `Delete ${KIND_LABEL[item.kind].toLowerCase()}?`,
        message: `"${item.title}" and its file will be permanently removed. This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
        onConfirm: async () => {
          try {
            if (isRemoteItem(item)) await deleteItem(item);
            removeItem(item.kind, item.id);
            if (user) logActivity(user.id, 'deleted', item);
            toast(`${KIND_LABEL[item.kind]} deleted`);
            after?.();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't delete it. Please try again.", 'error');
          }
        },
      });
    },
    [logActivity, removeItem, user],
  );

  const optionsFor = useCallback(
    (item: ContentItem, opts: { includeView?: boolean } = {}): SheetOption[] => {
      const isSaved = bookmarks.some((b) => b.kind === item.kind && b.itemId === item.id);
      const list: SheetOption[] = [];
      if (opts.includeView !== false) {
        list.push({ label: 'View details', icon: 'open-outline', onPress: () => router.push(detailHref(item.kind, item.id)) });
      }
      list.push({ label: 'Download / open', icon: 'download-outline', onPress: () => void download(item) });
      list.push({
        label: isSaved ? 'Remove bookmark' : 'Bookmark',
        icon: isSaved ? 'bookmark' : 'bookmark-outline',
        onPress: () => bookmark(item),
      });
      if (canManage(user, item)) {
        list.push({ label: 'Edit details', icon: 'create-outline', onPress: () => router.push(editHref(item.kind, item.id)) });
        list.push({ label: 'Replace file', icon: 'swap-horizontal', onPress: () => router.push(editHref(item.kind, item.id)) });
        list.push({ label: 'Delete', icon: 'trash-outline', destructive: true, onPress: () => remove(item) });
      }
      return list;
    },
    [bookmark, bookmarks, download, remove, user],
  );

  return { download, bookmark, remove, optionsFor };
}
