import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ContentCard } from '@/components/content/ContentCard';
import { ContentList } from '@/components/content/ContentList';
import { FeaturedCard } from '@/components/content/FeaturedCard';
import {
  Chip,
  ChipRow,
  EmptyState,
  IconButton,
  Screen,
  SearchBar,
  SectionHeader,
  Segmented,
  Text,
} from '@/components/ui';
import {
  usePopularMaterials,
  useRecentlyOpened,
  useRemoteSync,
  useVisibleMaterials,
} from '@/hooks/useContent';
import { useSubjects, MATERIAL_TYPES, modulesFor, topicsFor } from '@/lib/catalog';
import { pluralize } from '@/lib/format';
import { filterItems } from '@/lib/query';
import { useTheme } from '@/theme';
import type { MaterialType } from '@/types';

export default function LibraryScreen() {
  const t = useTheme();
  const allSubjects = useSubjects();
  const materials = useVisibleMaterials();
  const { loading, error, refreshing, refresh } = useRemoteSync('material');
  const recentlyOpened = useRecentlyOpened(3, 'material');
  const popular = usePopularMaterials(5);

  const [search, setSearch] = useState('');
  const [type, setType] = useState<MaterialType | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [sort, setSort] = useState<'newest' | 'title'>('newest');

  const typesInUse = useMemo(() => MATERIAL_TYPES.filter((mt) => materials.some((m) => m.type === mt.value)), [materials]);
  const browsing = !search && !type && !subjectId;

  const results = useMemo(
    () =>
      filterItems(materials, { search, subjectId, topicId, sort }).filter(
        (m) => (!type || m.type === type) && (!moduleId || m.moduleId === moduleId),
      ),
    [materials, moduleId, search, sort, subjectId, topicId, type],
  );
  const featured = useMemo(() => materials.filter((m) => m.isFeatured && m.status === 'published'), [materials]);
  const recent = useMemo(() => filterItems(materials, { sort: 'newest' }).slice(0, 5), [materials]);
  const countBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of materials) map.set(m.subjectId, (map.get(m.subjectId) ?? 0) + 1);
    return map;
  }, [materials]);

  const chooseSubject = (id: string | null) => {
    setSubjectId(id);
    setModuleId(null);
    setTopicId(null);
  };
  const clearAll = () => {
    setSearch('');
    setType(null);
    chooseSubject(null);
  };

  const failed = !!error && materials.length === 0;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: t.spacing.lg, paddingBottom: t.spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Text variant="display" accessibilityRole="header">
            Library
          </Text>
          <Text tone="muted" style={{ marginTop: 2 }}>
            Official learning materials for your subjects
          </Text>
        </View>
        <IconButton icon="bookmarks-outline" variant="surface" size={44} accessibilityLabel="Bookmarks" onPress={() => router.push('/bookmarks')} />
      </View>

      <View style={{ gap: t.spacing.md }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search handouts, reviewers, notes…" />
        <ChipRow>
          <Chip label="All types" selected={type === null} onPress={() => setType(null)} />
          {typesInUse.map((mt) => (
            <Chip key={mt.value} label={mt.plural} selected={type === mt.value} onPress={() => setType(type === mt.value ? null : mt.value)} />
          ))}
        </ChipRow>
      </View>

      {failed ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn’t load the library"
          message={error}
          actionLabel="Try again"
          onAction={() => void refresh()}
        />
      ) : browsing ? (
        <>
          {featured.length ? (
            <>
              <SectionHeader title="Featured" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -t.spacing.xl }}
                contentContainerStyle={{ paddingHorizontal: t.spacing.xl, gap: t.spacing.md, paddingBottom: 4 }}
              >
                {featured.map((m) => (
                  <FeaturedCard key={m.id} item={m} />
                ))}
              </ScrollView>
            </>
          ) : null}

          {recentlyOpened.length ? (
            <>
              <SectionHeader title="Continue where you left off" />
              <View style={{ gap: t.spacing.md }}>
                {recentlyOpened.map((m) => (
                  <ContentCard key={m.id} item={m} />
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title="Browse by subject" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
            {allSubjects.map((s) => {
              const count = countBySubject.get(s.id) ?? 0;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => router.push({ pathname: '/library/subject/[id]', params: { id: s.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}, ${pluralize(count, 'material')}`}
                  style={({ pressed }) => ({
                    flexBasis: '47%',
                    flexGrow: 1,
                    padding: t.spacing.md,
                    gap: t.spacing.sm,
                    borderRadius: t.radius.lg,
                    backgroundColor: pressed ? t.colors.surfacePressed : t.colors.surface,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                    boxShadow: t.shadows.card,
                  })}
                >
                  <View style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: s.color }} />
                  <Text variant="overline" tone="subtle">
                    {s.code}
                  </Text>
                  <Text variant="label" numberOfLines={2} style={{ minHeight: 36 }}>
                    {s.name}
                  </Text>
                  <Text variant="caption" tone="subtle">
                    {pluralize(count, 'material')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {popular.length ? (
            <>
              <SectionHeader title="Popular this month" />
              <Text variant="caption" tone="subtle" style={{ marginTop: -t.spacing.sm, marginBottom: t.spacing.md }}>
                Most opened by students and instructors in the last 30 days
              </Text>
              <View style={{ gap: t.spacing.md }}>
                {popular.map(({ item, people }) => (
                  <View key={item.id} style={{ gap: 4 }}>
                    <ContentCard item={item} />
                    <Text variant="caption" tone="subtle" style={{ paddingLeft: t.spacing.md }}>
                      Opened by {pluralize(people, 'person', 'people')}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title="Recently added" />
          <ContentList
            items={recent}
            loading={loading}
            trailing="bookmark"
            showCount={false}
            empty={{ icon: 'library-outline', title: 'The library is empty', message: 'Your instructors have not added materials yet.' }}
          />
        </>
      ) : (
        <View style={{ gap: t.spacing.md, marginTop: t.spacing.lg }}>
          <ChipRow>
            <Chip label="All subjects" selected={subjectId === null} onPress={() => chooseSubject(null)} />
            {allSubjects.map((s) => (
              <Chip
                key={s.id}
                label={s.code}
                dotColor={s.color}
                selected={subjectId === s.id}
                onPress={() => chooseSubject(subjectId === s.id ? null : s.id)}
              />
            ))}
          </ChipRow>
          {subjectId ? (
            <ChipRow>
              <Chip
                label="All modules"
                selected={moduleId === null}
                onPress={() => {
                  setModuleId(null);
                  setTopicId(null);
                }}
              />
              {modulesFor(subjectId).map((m) => (
                <Chip
                  key={m.id}
                  label={m.title.replace(/^Module (\d+): /, 'M$1 · ')}
                  selected={moduleId === m.id}
                  onPress={() => {
                    setModuleId(moduleId === m.id ? null : m.id);
                    setTopicId(null);
                  }}
                />
              ))}
            </ChipRow>
          ) : null}
          {subjectId && moduleId ? (
            <ChipRow>
              <Chip label="All topics" selected={topicId === null} onPress={() => setTopicId(null)} />
              {topicsFor(subjectId, moduleId).map((tp) => (
                <Chip key={tp.id} label={tp.title} selected={topicId === tp.id} onPress={() => setTopicId(topicId === tp.id ? null : tp.id)} />
              ))}
            </ChipRow>
          ) : null}
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'title', label: 'A–Z' },
            ]}
          />
          <ContentList
            items={results}
            loading={loading}
            trailing="bookmark"
            noun="material"
            empty={{
              icon: 'search-outline',
              title: 'No materials found',
              message: 'Try another keyword, type, subject or topic.',
              actionLabel: 'Clear filters',
              onAction: clearAll,
            }}
          />
        </View>
      )}
    </Screen>
  );
}
