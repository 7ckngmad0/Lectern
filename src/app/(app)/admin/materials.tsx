import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ContentCard } from '@/components/content/ContentCard';
import { ActionSheet, EmptyState, Fab, Screen, ScreenHeader, SearchBar, Segmented, SkeletonList, Text, type SheetOption } from '@/components/ui';
import { useRemoteSync } from '@/hooks/useContent';
import { useContentActions } from '@/hooks/useContentActions';
import { pluralize } from '@/lib/format';
import { filterItems } from '@/lib/query';
import { detailHref, editHref } from '@/lib/routes';
import { setMaterialFlags } from '@/services/content';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { toast } from '@/store/ui';
import { useTheme } from '@/theme';
import type { LearningMaterial } from '@/types';

type Status = 'all' | 'published' | 'draft';

export default function MaterialManagementScreen() {
  const t = useTheme();
  const materials = useContentStore((s) => s.materials);
  const upsertItem = useContentStore((s) => s.upsertItem);
  const { remove } = useContentActions();

  const [status, setStatus] = useState<Status>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LearningMaterial | null>(null);

  const list = useMemo(
    () => filterItems(materials, { search, sort: 'newest' }).filter((m) => status === 'all' || m.status === status),
    [materials, search, status],
  );

  const mode = useAuthStore((s) => s.mode);
  const { loading, error, refreshing, refresh } = useRemoteSync('material');

  const update = async (m: LearningMaterial, patch: Pick<Partial<LearningMaterial>, 'status' | 'isFeatured'>, message: string) => {
    try {
      // Publishing in Supabase mode also notifies enrolled students (database trigger).
      const saved =
        mode === 'supabase' ? await setMaterialFlags(m, patch) : { ...m, ...patch, updatedAt: new Date().toISOString() };
      upsertItem(saved);
      toast(message);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update the material", 'error');
    }
  };

  const optionsFor = (m: LearningMaterial): SheetOption[] => [
    { label: 'View', icon: 'open-outline', onPress: () => router.push(detailHref('material', m.id)) },
    { label: 'Edit details', icon: 'create-outline', onPress: () => router.push(editHref('material', m.id)) },
    m.status === 'published'
      ? { label: 'Unpublish (move to drafts)', icon: 'eye-off-outline', onPress: () => void update(m, { status: 'draft', isFeatured: false }, 'Moved to drafts') }
      : { label: 'Publish', icon: 'eye-outline', onPress: () => void update(m, { status: 'published' }, 'Published to the library') },
    ...(m.status === 'published'
      ? [
          m.isFeatured
            ? { label: 'Remove from featured', icon: 'star-outline' as const, onPress: () => void update(m, { isFeatured: false }, 'Removed from featured') }
            : { label: 'Feature in library', icon: 'star' as const, onPress: () => void update(m, { isFeatured: true }, 'Added to featured') },
        ]
      : []),
    { label: 'Delete', icon: 'trash-outline', destructive: true, onPress: () => remove(m) },
  ];

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      header={<ScreenHeader title="Learning materials" />}
      contentStyle={{ paddingBottom: 110 }}
      edges={['top', 'bottom']}
      footer={<Fab label="Add material" onPress={() => router.push('/admin/material-form')} />}
    >
      <View style={{ gap: t.spacing.md, paddingTop: t.spacing.sm }}>
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Drafts' },
          ]}
        />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search materials" />
        <Text variant="label" tone="subtle">
          {pluralize(list.length, 'material')}
        </Text>
        {loading ? (
          <SkeletonList count={3} />
        ) : error && materials.length === 0 ? (
          <EmptyState icon="cloud-offline-outline" title="Couldn’t load materials" message={error} actionLabel="Try again" onAction={() => void refresh()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="library-outline"
            title={status === 'draft' ? 'No drafts' : 'No materials'}
            message="Add handouts, reviewers and lecture slides for your students."
            actionLabel="Add material"
            onAction={() => router.push('/admin/material-form')}
          />
        ) : (
          list.map((m) => <ContentCard key={m.id} item={m} trailing="menu" onMenu={() => setSelected(m)} />)
        )}
      </View>
      <ActionSheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.title} options={selected ? optionsFor(selected) : []} />
    </Screen>
  );
}
