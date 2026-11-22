import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ContentCard } from '@/components/content/ContentCard';
import { Card, EmptyState, Icon, Screen, ScreenHeader, SkeletonList, Text } from '@/components/ui';
import { useRemoteSync, useVisibleMaterials } from '@/hooks/useContent';
import { getSubject, modulesFor, topicsFor } from '@/lib/catalog';
import { pluralize } from '@/lib/format';
import { sortItems } from '@/lib/query';
import { useTheme } from '@/theme';

/** Subject → Module → Topic → Materials hierarchy. */
export default function SubjectLibraryScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subject = getSubject(id);
  const materials = useVisibleMaterials();
  const { loading, refreshing, refresh } = useRemoteSync('material');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const inSubject = useMemo(() => sortItems(materials.filter((m) => m.subjectId === id), 'title'), [id, materials]);

  if (!subject) {
    return (
      <Screen header={<ScreenHeader title="Subject" />}>
        <EmptyState icon="help-circle-outline" title="Subject not found" message="This subject may have been removed." />
      </Screen>
    );
  }

  const modules = modulesFor(subject.id);
  const toggle = (moduleId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });

  return (
    <Screen header={<ScreenHeader title={subject.code} />} onRefresh={refresh} refreshing={refreshing}>
      <View style={{ gap: t.spacing.sm, paddingBottom: t.spacing.lg }}>
        <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: subject.color }} />
        <Text variant="title">{subject.name}</Text>
        <Text tone="muted">
          {pluralize(modules.length, 'module')} · {pluralize(inSubject.length, 'material')}
        </Text>
      </View>

      {loading ? <SkeletonList count={3} /> : null}
      <View style={{ gap: t.spacing.md, display: loading ? 'none' : 'flex' }}>
        {modules.map((mod) => {
          const open = !collapsed.has(mod.id);
          const topics = topicsFor(subject.id, mod.id);
          const count = inSubject.filter((m) => m.moduleId === mod.id).length;
          return (
            <Card key={mod.id} padding={0}>
              <Pressable
                onPress={() => toggle(mod.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, padding: t.spacing.lg }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="subheading">{mod.title}</Text>
                  <Text variant="caption" tone="subtle">
                    {pluralize(topics.length, 'topic')} · {pluralize(count, 'material')}
                  </Text>
                </View>
                <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.textSubtle} />
              </Pressable>
              {open ? (
                <View style={{ paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.lg, gap: t.spacing.lg }}>
                  {topics.map((topic) => {
                    const items = inSubject.filter((m) => m.topicId === topic.id);
                    return (
                      <View key={topic.id} style={{ gap: t.spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: subject.color }} />
                          <Text variant="label">{topic.title}</Text>
                        </View>
                        {items.length ? (
                          items.map((m) => <ContentCard key={m.id} item={m} />)
                        ) : (
                          <Text variant="caption" tone="subtle" style={{ paddingLeft: 14 }}>
                            No materials yet
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
