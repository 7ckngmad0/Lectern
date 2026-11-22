import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ContentList } from '@/components/content/ContentList';
import { FilterBar } from '@/components/content/FilterBar';
import { Icon, Screen, ScreenHeader, Segmented, Text } from '@/components/ui';
import { useRemoteSync } from '@/hooks/useContent';
import { useSubjects } from '@/lib/catalog';
import { filterItems } from '@/lib/query';
import { useContentStore } from '@/store/content';
import { useTheme } from '@/theme';
import type { Exercise, Presentation, SortKey } from '@/types';

type KindFilter = 'all' | 'presentation' | 'exercise';
type Who = 'students' | 'everyone';

/**
 * Content moderation: every student upload (shared AND private; staff can see
 * both under RLS). Each card's menu offers view, download, edit and delete,
 * which the database allows for staff on any presentation or exercise.
 */
export default function ContentModerationScreen() {
  const t = useTheme();
  const allSubjects = useSubjects();
  const presentations = useContentStore((s) => s.presentations);
  const exercises = useContentStore((s) => s.exercises);
  const users = useContentStore((s) => s.users);
  const p = useRemoteSync('presentation');
  const e = useRemoteSync('exercise');

  const [kind, setKind] = useState<KindFilter>('all');
  const [who, setWho] = useState<Who>('students');
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');

  const items = useMemo(() => {
    const staffIds = new Set(users.filter((u) => u.role !== 'student').map((u) => u.id));
    const pool: (Presentation | Exercise)[] = [
      ...(kind !== 'exercise' ? presentations : []),
      ...(kind !== 'presentation' ? exercises : []),
    ];
    return filterItems(pool, { search, subjectId, sort }).filter(
      (x) => (who === 'everyone' || !staffIds.has(x.ownerId)) && (!visibility || x.visibility === visibility),
    );
  }, [exercises, kind, presentations, search, sort, subjectId, users, visibility, who]);

  const refresh = async () => {
    await Promise.all([p.refresh(), e.refresh()]);
  };

  return (
    <Screen header={<ScreenHeader title="Content moderation" />} onRefresh={refresh} refreshing={p.refreshing || e.refreshing}>
      <View style={{ gap: t.spacing.md, paddingTop: t.spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="shield-checkmark-outline" size={16} color={t.colors.textSubtle} />
          <Text variant="caption" tone="subtle" style={{ flex: 1 }}>
            Review uploads and remove anything inappropriate or off-topic. Private files are included: staff can see them.
            Deleting removes the file for everyone.
          </Text>
        </View>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'All' },
            { value: 'presentation', label: 'Presentations' },
            { value: 'exercise', label: 'Exercises' },
          ]}
        />
        <Segmented
          value={who}
          onChange={setWho}
          options={[
            { value: 'students', label: 'Student uploads' },
            { value: 'everyone', label: 'Everyone' },
          ]}
        />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search title, topic or tag"
          subjects={allSubjects}
          subjectId={subjectId}
          onSubject={setSubjectId}
          sort={sort}
          onSort={setSort}
          sections={[
            {
              title: 'Visibility',
              value: visibility,
              options: [
                { value: 'shared', label: 'Shared with class' },
                { value: 'private', label: 'Private' },
              ],
              onChange: setVisibility,
            },
          ]}
        />
        <ContentList
          items={items}
          loading={p.loading || e.loading}
          trailing="menu"
          noun="upload"
          empty={{ icon: 'checkmark-done-outline', title: 'Nothing to review', message: 'Uploads matching these filters will appear here.' }}
        />
      </View>
    </Screen>
  );
}
