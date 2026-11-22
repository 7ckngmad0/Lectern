import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ContentList } from '@/components/content/ContentList';
import { Screen, ScreenHeader, Segmented } from '@/components/ui';
import { canView } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { useTheme } from '@/theme';
import type { ContentItem, ContentKind } from '@/types';

type Filter = 'all' | ContentKind;

export default function BookmarksScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const bookmarks = useContentStore((s) => s.bookmarks);
  const presentations = useContentStore((s) => s.presentations);
  const exercises = useContentStore((s) => s.exercises);
  const materials = useContentStore((s) => s.materials);
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => {
    const lists: Record<ContentKind, ContentItem[]> = { presentation: presentations, exercise: exercises, material: materials };
    return bookmarks
      .filter((b) => filter === 'all' || b.kind === filter)
      .map((b) => lists[b.kind].find((x) => x.id === b.itemId))
      .filter((x): x is ContentItem => !!x && canView(user, x));
  }, [bookmarks, exercises, filter, materials, presentations, user]);

  return (
    <Screen header={<ScreenHeader title="Bookmarks" />}>
      <View style={{ gap: t.spacing.lg, paddingTop: t.spacing.sm }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'presentation', label: 'Slides' },
            { value: 'exercise', label: 'Exercises' },
            { value: 'material', label: 'Library' },
          ]}
        />
        <ContentList
          items={items}
          trailing="bookmark"
          noun="saved item"
          empty={{
            icon: 'bookmark-outline',
            title: filter === 'all' ? 'No bookmarks yet' : 'Nothing saved here',
            message: 'Tap the bookmark icon on any file to keep it here for quick access.',
            actionLabel: 'Browse library',
            onAction: () => router.push('/library'),
          }}
        />
      </View>
    </Screen>
  );
}
