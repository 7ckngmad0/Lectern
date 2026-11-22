import { router } from 'expo-router';
import { View } from 'react-native';

import { Badge, Card, IconButton, Text } from '@/components/ui';
import { useIsBookmarked, useUserName } from '@/hooks/useContent';
import { categoryLabel, itemContext, materialTypeLabel } from '@/lib/catalog';
import { formatBytes, formatRelative } from '@/lib/format';
import { detailHref } from '@/lib/routes';
import { useContentStore } from '@/store/content';
import { toast } from '@/store/ui';
import { useTheme } from '@/theme';
import type { ContentItem } from '@/types';
import { FileTypeIcon } from './FileTypeIcon';

interface ContentCardProps {
  item: ContentItem;
  /** Trailing control: an actions menu, a bookmark toggle, or nothing. */
  trailing?: 'menu' | 'bookmark' | 'none';
  onMenu?: (item: ContentItem) => void;
  onPress?: () => void;
}

export function ContentCard({ item, trailing = 'bookmark', onMenu, onPress }: ContentCardProps) {
  const t = useTheme();
  const owner = useUserName(item.ownerId);
  const bookmarked = useIsBookmarked(item.kind, item.id);
  const toggleBookmark = useContentStore((s) => s.toggleBookmark);

  const open = onPress ?? (() => router.push(detailHref(item.kind, item.id)));

  return (
    <Card onPress={open} padding={t.spacing.md} accessibilityLabel={`${item.title}, ${itemContext(item)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
        <FileTypeIcon extension={item.file.extension} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading" numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="label" tone="muted" numberOfLines={1}>
            {itemContext(item)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <Text variant="caption" tone="subtle" numberOfLines={1} style={{ flexShrink: 1 }}>
              {owner} · {formatRelative(item.createdAt)} · {formatBytes(item.file.sizeBytes)}
            </Text>
          </View>
          <ItemBadges item={item} />
        </View>
        {trailing === 'menu' ? (
          <IconButton icon="ellipsis-vertical" accessibilityLabel={`Actions for ${item.title}`} onPress={() => onMenu?.(item)} size={36} color={t.colors.textSubtle} />
        ) : trailing === 'bookmark' ? (
          <IconButton
            icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
            color={bookmarked ? t.colors.primary : t.colors.textSubtle}
            accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            size={36}
            onPress={() => {
              const added = toggleBookmark(item.kind, item.id);
              toast(added ? 'Saved to bookmarks' : 'Removed from bookmarks', added ? 'success' : 'info');
            }}
          />
        ) : null}
      </View>
    </Card>
  );
}

/** Status badges shown only when they carry information. */
function ItemBadges({ item }: { item: ContentItem }) {
  const badges: { label: string; tone: 'neutral' | 'primary' | 'success' | 'warning'; icon?: 'lock-closed' | 'ribbon' }[] = [];
  if (item.kind === 'presentation' && item.visibility === 'private') badges.push({ label: 'Private', tone: 'neutral', icon: 'lock-closed' });
  if (item.kind === 'exercise') {
    if (item.isOfficial) badges.push({ label: 'Official', tone: 'success', icon: 'ribbon' });
    badges.push({ label: categoryLabel(item.category), tone: 'neutral' });
  }
  if (item.kind === 'material') {
    badges.push({ label: materialTypeLabel(item.type), tone: 'primary' });
    if (item.status === 'draft') badges.push({ label: 'Draft', tone: 'warning' });
  }
  if (!badges.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
      {badges.map((b) => (
        <Badge key={b.label} label={b.label} tone={b.tone} icon={b.icon} />
      ))}
    </View>
  );
}
