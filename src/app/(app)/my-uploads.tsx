import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ContentList } from '@/components/content/ContentList';
import { Fab, Screen, ScreenHeader, SearchBar, Segmented } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useContent';
import { filterItems } from '@/lib/query';
import { useContentStore } from '@/store/content';
import { useTheme } from '@/theme';

type Tab = 'presentation' | 'exercise';

export default function MyUploadsScreen() {
  const t = useTheme();
  const user = useCurrentUser();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'exercise' ? 'exercise' : 'presentation');
  const [search, setSearch] = useState('');
  const presentations = useContentStore((s) => s.presentations);
  const exercises = useContentStore((s) => s.exercises);

  const items = useMemo(() => {
    const filter = { ownerId: user.id, search, sort: 'newest' as const };
    return tab === 'presentation' ? filterItems(presentations, filter) : filterItems(exercises, filter);
  }, [exercises, presentations, search, tab, user.id]);

  const uploadHref = tab === 'presentation' ? '/presentation/upload' : '/exercise/upload';

  return (
    <Screen
      header={<ScreenHeader title="My uploads" />}
      contentStyle={{ paddingBottom: 110 }}
      edges={['top', 'bottom']}
      footer={<Fab label="Upload" icon="cloud-upload-outline" onPress={() => router.push(uploadHref)} />}
    >
      <View style={{ gap: t.spacing.lg, paddingTop: t.spacing.sm }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'presentation', label: 'Presentations' },
            { value: 'exercise', label: 'Exercises' },
          ]}
        />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search your uploads" />
        <ContentList
          items={items}
          noun={tab}
          empty={
            search
              ? { icon: 'search-outline', title: 'No matches', message: 'Try a different search term.' }
              : {
                  icon: tab === 'presentation' ? 'easel-outline' : 'clipboard-outline',
                  title: tab === 'presentation' ? 'No presentations yet' : 'No exercises yet',
                  message: 'Files you upload will appear here so you can edit, replace or delete them.',
                  actionLabel: 'Upload now',
                  onAction: () => router.push(uploadHref),
                }
          }
        />
      </View>
    </Screen>
  );
}
