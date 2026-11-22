import { useState } from 'react';
import { View } from 'react-native';

import { ActionSheet, EmptyState, SkeletonList, Text } from '@/components/ui';
import { useContentActions } from '@/hooks/useContentActions';
import { pluralize } from '@/lib/format';
import { useTheme } from '@/theme';
import type { ContentItem } from '@/types';
import { ContentCard } from './ContentCard';

interface ContentListProps {
  items: ContentItem[];
  loading?: boolean;
  trailing?: 'menu' | 'bookmark' | 'none';
  showCount?: boolean;
  noun?: string;
  empty: {
    icon: Parameters<typeof EmptyState>[0]['icon'];
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
}

/** List of ContentCards with loading, empty and action-menu handling. */
export function ContentList({ items, loading, trailing = 'menu', showCount = true, noun = 'file', empty }: ContentListProps) {
  const t = useTheme();
  const { optionsFor } = useContentActions();
  const [menuItem, setMenuItem] = useState<ContentItem | null>(null);

  if (loading) return <SkeletonList count={4} />;
  if (!items.length) return <EmptyState {...empty} />;

  return (
    <View style={{ gap: t.spacing.md }}>
      {showCount ? (
        <Text variant="label" tone="subtle">
          {pluralize(items.length, noun)}
        </Text>
      ) : null}
      {items.map((item) => (
        <ContentCard key={`${item.kind}:${item.id}`} item={item} trailing={trailing} onMenu={setMenuItem} />
      ))}
      <ActionSheet
        visible={!!menuItem}
        onClose={() => setMenuItem(null)}
        title={menuItem?.title}
        options={menuItem ? optionsFor(menuItem) : []}
      />
    </View>
  );
}
