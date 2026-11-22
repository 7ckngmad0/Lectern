import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ContentList } from '@/components/content/ContentList';
import { FilterBar } from '@/components/content/FilterBar';
import { EmptyState, Fab, Screen, Segmented, TabHeader } from '@/components/ui';
import { useCurrentUser, useRemoteSync, useVisibleExercises } from '@/hooks/useContent';
import { useSubjects, EXERCISE_CATEGORIES, modulesFor, topicsFor } from '@/lib/catalog';
import { filterItems } from '@/lib/query';
import { useTheme } from '@/theme';
import type { SortKey } from '@/types';

type Scope = 'all' | 'official' | 'mine';

export default function ExercisesScreen() {
  const t = useTheme();
  const allSubjects = useSubjects();
  const user = useCurrentUser();
  const visible = useVisibleExercises();
  const { loading, error, refreshing, refresh } = useRemoteSync('exercise');

  const [scope, setScope] = useState<Scope>('all');
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');

  const subjects = useMemo(() => {
    const used = new Set(visible.map((e) => e.subjectId));
    return allSubjects.filter((s) => used.has(s.id) || user.subjectIds.includes(s.id));
  }, [allSubjects, user.subjectIds, visible]);

  const items = useMemo(() => {
    const base = filterItems(visible, { search, subjectId, topicId, sort, ownerId: scope === 'mine' ? user.id : null });
    return base.filter(
      (e) =>
        (scope !== 'official' || e.isOfficial) &&
        (!moduleId || e.moduleId === moduleId) &&
        (!category || e.category === category),
    );
  }, [category, moduleId, scope, search, sort, subjectId, topicId, user.id, visible]);

  const sections = [
    { title: 'Category', value: category, options: EXERCISE_CATEGORIES, onChange: setCategory },
    ...(subjectId
      ? [
          {
            title: 'Module',
            value: moduleId,
            options: modulesFor(subjectId).map((m) => ({ value: m.id, label: m.title.replace(/^Module (\d+): /, 'M$1 · ') })),
            onChange: (v: string | null) => {
              setModuleId(v);
              setTopicId(null);
            },
          },
          {
            title: 'Topic',
            value: topicId,
            options: topicsFor(subjectId, moduleId).map((tp) => ({ value: tp.id, label: tp.title })),
            onChange: setTopicId,
          },
        ]
      : []),
  ];

  const filtering = !!search || !!subjectId || !!topicId || !!moduleId || !!category;
  const clear = () => {
    setSearch('');
    setSubjectId(null);
    setModuleId(null);
    setTopicId(null);
    setCategory(null);
  };

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      contentStyle={{ paddingBottom: 110 }}
      footer={<Fab label="Upload" icon="add" onPress={() => router.push('/exercise/upload')} />}
    >
      <TabHeader title="Exercises" subtitle="Activities, labs and worksheets by lesson" />
      <View style={{ gap: t.spacing.lg }}>
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'All' },
            { value: 'official', label: 'Official' },
            { value: 'mine', label: 'Mine' },
          ]}
        />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search exercises"
          subjects={subjects}
          subjectId={subjectId}
          onSubject={(id) => {
            setSubjectId(id);
            setModuleId(null);
            setTopicId(null);
          }}
          sort={sort}
          onSort={setSort}
          sections={sections}
        />
        {error && visible.length === 0 ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn’t load exercises"
            message={error}
            actionLabel="Try again"
            onAction={() => void refresh()}
          />
        ) : (
          <ContentList
            items={items}
            loading={loading}
            noun="exercise"
            empty={
              filtering
                ? { icon: 'search-outline', title: 'No matches', message: 'Try a different search term or clear the filters.', actionLabel: 'Clear filters', onAction: clear }
                : scope === 'mine'
                  ? {
                      icon: 'clipboard-outline',
                      title: 'No exercises yet',
                      message: 'Upload your answers or activity files so they stay organized by lesson.',
                      actionLabel: 'Upload exercise',
                      onAction: () => router.push('/exercise/upload'),
                    }
                  : scope === 'official'
                    ? { icon: 'ribbon-outline', title: 'No official activities', message: 'Exercises assigned by your instructors will show up here.' }
                    : { icon: 'clipboard-outline', title: 'No exercises yet', message: 'Exercises shared in your subjects will appear here.' }
            }
          />
        )}
      </View>
    </Screen>
  );
}
