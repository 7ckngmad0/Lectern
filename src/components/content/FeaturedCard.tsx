import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { getSubject, materialTypeLabel } from '@/lib/catalog';
import { detailHref } from '@/lib/routes';
import { useTheme } from '@/theme';
import type { LearningMaterial } from '@/types';
import { FileTypeIcon } from './FileTypeIcon';

/** Wide card for the featured materials carousel. */
export function FeaturedCard({ item, width = 260 }: { item: LearningMaterial; width?: number }) {
  const t = useTheme();
  const subject = getSubject(item.subjectId);
  const accent = subject?.color ?? t.colors.primary;

  return (
    <Pressable
      onPress={() => router.push(detailHref('material', item.id))}
      accessibilityRole="button"
      accessibilityLabel={`Featured: ${item.title}`}
      style={({ pressed }) => ({
        width,
        borderRadius: t.radius.lg,
        backgroundColor: pressed ? t.colors.surfacePressed : t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        overflow: 'hidden',
        boxShadow: t.shadows.card,
      })}
    >
      <View style={{ height: 6, backgroundColor: accent }} />
      <View style={{ padding: t.spacing.lg, gap: t.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <FileTypeIcon extension={item.file.extension} size={40} />
          <Badge label={materialTypeLabel(item.type)} tone="primary" />
        </View>
        <View style={{ gap: 4 }}>
          <Text variant="subheading" numberOfLines={2} style={{ minHeight: 42 }}>
            {item.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
              {subject?.code} · {subject?.name}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
