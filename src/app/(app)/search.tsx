import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ContentCard } from '@/components/content/ContentCard';
import { Chip, ChipRow, EmptyState, IconButton, Screen, SearchBar, Text } from '@/components/ui';
import { useVisibleExercises, useVisibleMaterials, useVisiblePresentations } from '@/hooks/useContent';
import { useSubjects } from '@/lib/catalog';
import { pluralize } from '@/lib/format';
import { filterItems } from '@/lib/query';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import type { ContentItem, ContentKind } from '@/types';

type Scope = 'all' | ContentKind;

const SECTION_TITLE: Record<ContentKind, string> = {
  presentation: 'Presentations',
  exercise: 'Exercises',
  material: 'Library',
};


export default function SearchScreen() {
  const t = useTheme();
  const allSubjects = useSubjects();
  const presentations = useVisiblePresentations();
  const exercises = useVisibleExercises();
  const materials = useVisibleMaterials();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const active = query.trim().length > 0 || subjectId !== null;

  // Most-used tags across what the user can see, plus their subject codes.
  const suggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of [...presentations, ...exercises, ...materials]) {
      for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const tags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);
    const used = new Set([...presentations, ...exercises, ...materials].map((x) => x.subjectId));
    const codes = allSubjects.filter((s) => used.has(s.id)).slice(0, 3).map((s) => s.code);
    return [...tags, ...codes];
  }, [allSubjects, exercises, materials, presentations]);

  const groups = useMemo(() => {
    if (!active) return [];
    const filter = { search: query, subjectId, sort: 'newest' as const };
    const all: [ContentKind, ContentItem[]][] = [
      ['presentation', filterItems(presentations, filter)],
      ['exercise', filterItems(exercises, filter)],
      ['material', filterItems(materials, filter)],
    ];
    return all.filter(([kind, items]) => (scope === 'all' || scope === kind) && items.length > 0);
  }, [active, exercises, materials, presentations, query, scope, subjectId]);

  const total = groups.reduce((n, [, items]) => n + items.length, 0);

  return (
    <Screen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.sm }}>
          <IconButton icon="chevron-back" accessibilityLabel="Go back" onPress={() => router.back()} size={42} />
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search by title, topic, subject or tag" autoFocus style={{ flex: 1, marginRight: t.spacing.md }} />
        </View>
      }
    >
      <View style={{ gap: t.spacing.md, paddingTop: t.spacing.sm }}>
        <ChipRow>
          {(['all', 'presentation', 'exercise', 'material'] as Scope[]).map((s) => (
            <Chip key={s} label={s === 'all' ? 'Everything' : SECTION_TITLE[s]} selected={scope === s} onPress={() => setScope(s)} />
          ))}
        </ChipRow>
        <ChipRow>
          {allSubjects.map((s) => (
            <Chip key={s.id} label={s.code} dotColor={s.color} selected={subjectId === s.id} onPress={() => setSubjectId(subjectId === s.id ? null : s.id)} />
          ))}
        </ChipRow>
      </View>

      {!active ? (
        <View style={{ marginTop: t.spacing.xxl, gap: t.spacing.md }}>
          <Text variant="overline" tone="subtle" uppercase>
            {suggestions.length ? 'Try searching for' : 'Search presentations, exercises and the library'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} icon="search" onPress={() => setQuery(s)} />
            ))}
          </View>
        </View>
      ) : total === 0 ? (
        <EmptyState icon="search-outline" title="No results" message={`Nothing matches "${query.trim() || 'your filters'}". Check the spelling or try a broader term.`} />
      ) : (
        <View style={{ marginTop: t.spacing.lg, gap: t.spacing.xl }}>
          <Text variant="label" tone="subtle">
            {pluralize(total, 'result')}
          </Text>
          {groups.map(([kind, items]) => (
            <View key={kind} style={{ gap: t.spacing.md }}>
              <Text variant="heading">
                {SECTION_TITLE[kind]}{' '}
                <Text variant="heading" tone="subtle">
                  {items.length}
                </Text>
              </Text>
              {items.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
