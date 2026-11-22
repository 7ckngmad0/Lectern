import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { detailHref } from '@/lib/routes';
import { findItem } from '@/store/content';
import { useTheme } from '@/theme';
import type { Activity, ActivityAction } from '@/types';

const META: Record<ActivityAction, { icon: IconName; verb: string }> = {
  uploaded: { icon: 'cloud-upload-outline', verb: 'Uploaded' },
  viewed: { icon: 'eye-outline', verb: 'Opened' },
  downloaded: { icon: 'download-outline', verb: 'Downloaded' },
  updated: { icon: 'create-outline', verb: 'Updated' },
  deleted: { icon: 'trash-outline', verb: 'Deleted' },
  bookmarked: { icon: 'bookmark-outline', verb: 'Saved' },
};

export function ActivityRow({ activity, isLast }: { activity: Activity; isLast?: boolean }) {
  const t = useTheme();
  const meta = META[activity.action];
  const exists = activity.action !== 'deleted' && !!findItem(activity.kind, activity.itemId);

  return (
    <Pressable
      disabled={!exists}
      onPress={() => router.push(detailHref(activity.kind, activity.itemId))}
      accessibilityRole={exists ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: t.spacing.md,
        paddingVertical: t.spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: t.colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={meta.icon} size={15} color={t.colors.textMuted} />
        </View>
        {!isLast ? <View style={{ flex: 1, width: 1.5, backgroundColor: t.colors.border, marginTop: 4 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : t.spacing.sm }}>
        <Text variant="label" numberOfLines={2}>
          <Text variant="label" tone="muted">
            {meta.verb}{' '}
          </Text>
          {activity.itemTitle}
        </Text>
        <Text variant="caption" tone="subtle">
          {formatRelative(activity.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}
