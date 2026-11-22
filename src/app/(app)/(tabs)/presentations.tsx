import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ContentList } from '@/components/content/ContentList';
import { FilterBar } from '@/components/content/FilterBar';
import { EmptyState, Fab, Screen, Segmented, TabHeader } from '@/components/ui';
import { useCurrentUser, useRemoteSync, useVisiblePresentations } from '@/hooks/useContent';
import { useSubjects, topicsFor } from '@/lib/catalog';
import { filterItems } from '@/lib/query';
import { useTheme } from '@/theme';
import type { SortKey } from '@/types';

type Scope = 'all' | 'mine';

export default function PresentationsScreen() {
  const t = useTheme();
  const allSubjects = useSubjects();
  const user = useCurrentUser();
  const visible = useVisiblePresentations();
  const { loading, error, refreshing, refresh } = useRemoteSync('presentation');

  const [scope, setScope] = useState<Scope>('all');
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');

  const subjects = useMemo(() => {
    const used = new Set(visible.map((p) => p.subjectId));
    return allSubjects.filter((s) => used.has(s.id) || user.subjectIds.includes(s.id));
  }, [allSubjects, user.subjectIds, visible]);

  const items = useMemo(
    () => filterItems(visible, { search, subjectId, topicId, sort, ownerId: scope === 'mine' ? user.id : null }),
    [scope, search, sort, subjectId, topicId, user.id, visible],
  );

  const topicOptions = subjectId ? topicsFor(subjectId).map((tp) => ({ value: tp.id, label: tp.title })) : [];
  const filtering = !!search || !!subjectId || !!topicId;

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      contentStyle={{ paddingBottom: 110 }}
      footer={<Fab label="Upload" icon="cloud-upload-outline" onPress={() => router.push('/presentation/upload')} />}
    >
      <TabHeader title="Presentations" subtitle="Slides and reports, organized by topic" />
      <View style={{ gap: t.spacing.lg }}>
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'Class' },
            { value: 'mine', label: 'My presentations' },
          ]}
        />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search title, topic or tag"
          subjects={subjects}
          subjectId={subjectId}
          onSubject={(id) => {
            setSubjectId(id);
            setTopicId(null);
          }}
          sort={sort}
          onSort={setSort}
          sections={subjectId ? [{ title: 'Topic', value: topicId, options: topicOptions, onChange: setTopicId }] : []}
        />
        {error && visible.length === 0 ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn’t load presentations"
            message={error}
            actionLabel="Try again"
            onAction={() => void refresh()}
          />
        ) : (
          <ContentList
            items={items}
            loading={loading}
            noun="presentation"
            empty={
              filtering
                ? {
                    icon: 'search-outline',
                    title: 'No matches',
                    message: 'Try a different search term or clear the filters.',
                    actionLabel: 'Clear filters',
                    onAction: () => {
                      setSearch('');
                      setSubjectId(null);
                      setTopicId(null);
                    },
                  }
                : scope === 'mine'
                  ? {
                      icon: 'easel-outline',
                      title: 'No presentations yet',
                      message: 'Upload your slides for an approved topic. PPT, PPTX and PDF are supported.',
                      actionLabel: 'Upload presentation',
                      onAction: () => router.push('/presentation/upload'),
                    }
                  : {
                      icon: 'easel-outline',
                      title: 'No shared presentations',
                      message: 'When classmates share their slides, they will appear here.',
                    }
            }
          />
        )}
      </View>
    </Screen>
  );
}
