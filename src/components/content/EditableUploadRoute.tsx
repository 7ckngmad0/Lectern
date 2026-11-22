import { useLocalSearchParams } from 'expo-router';

import { EmptyState, Screen, ScreenHeader, SkeletonList } from '@/components/ui';
import { useItem } from '@/hooks/useContent';
import { canManage } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import type { ContentKind } from '@/types';
import { UploadForm } from './UploadForm';

/**
 * Upload route that also handles editing when `?id=` is present.
 * Blocks editing items the user isn't allowed to manage.
 */
export function EditableUploadRoute({ kind }: { kind: ContentKind }) {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = useAuthStore((s) => s.user);
  const existing = useItem(kind, id);
  const status = useContentStore((s) => s.remote[kind].status);

  if (id && !existing && (status === 'idle' || status === 'loading')) {
    return (
      <Screen header={<ScreenHeader title="Edit" />}>
        <SkeletonList count={3} />
      </Screen>
    );
  }

  if (id && (!existing || !canManage(user, existing))) {
    return (
      <Screen header={<ScreenHeader title="Edit" />}>
        <EmptyState
          icon="lock-closed-outline"
          title="Can't edit this file"
          message="It may have been deleted, or you don't have permission to change it."
        />
      </Screen>
    );
  }
  // `key` resets form state if the route is reused for a different item.
  return <UploadForm key={existing?.id ?? 'new'} kind={kind} existing={existing} />;
}
