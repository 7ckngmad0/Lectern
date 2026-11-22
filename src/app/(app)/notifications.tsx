import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, EmptyState, Icon, Screen, ScreenHeader, Text, type IconName } from '@/components/ui';
import { useUnreadCount, useVisibleNotifications } from '@/hooks/useContent';
import { formatRelative } from '@/lib/format';
import { detailHref } from '@/lib/routes';
import { loadPersonal } from '@/services/sync';
import { useAuthStore } from '@/store/auth';
import { findItem, useContentStore } from '@/store/content';
import { toast } from '@/store/ui';
import { useTheme, type Theme } from '@/theme';
import type { AppNotification, NotificationKind } from '@/types';

function kindStyle(t: Theme, kind: NotificationKind): { icon: IconName; fg: string; bg: string } {
  switch (kind) {
    case 'upload_success':
      return { icon: 'cloud-done-outline', fg: t.colors.success, bg: t.colors.successMuted };
    case 'new_material':
      return { icon: 'sparkles-outline', fg: t.colors.primary, bg: t.colors.primaryMuted };
    case 'material_updated':
      return { icon: 'refresh-outline', fg: t.colors.info, bg: t.colors.infoMuted };
    case 'announcement':
      return { icon: 'megaphone-outline', fg: t.colors.warning, bg: t.colors.warningMuted };
  }
}

export default function NotificationsScreen() {
  const t = useTheme();
  const notifications = useVisibleNotifications();
  const markRead = useContentStore((s) => s.markNotificationRead);
  const markAllRead = useContentStore((s) => s.markAllNotificationsRead);
  const unread = useUnreadCount();
  const remote = useAuthStore((s) => s.mode) === 'supabase';
  const [refreshing, setRefreshing] = useState(false);

  // New-material notifications are created on the server; fetch fresh ones on open.
  useEffect(() => {
    if (remote) void loadPersonal();
  }, [remote]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      if (remote) await loadPersonal();
    } finally {
      setRefreshing(false);
    }
  };

  const open = (n: AppNotification) => {
    markRead(n.id);
    if (!n.target) return;
    if (findItem(n.target.kind, n.target.id)) router.push(detailHref(n.target.kind, n.target.id));
    else toast('That file is no longer available', 'info');
  };

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      header={
        <ScreenHeader
          title="Notifications"
          right={unread ? <Button label="Mark all read" variant="ghost" size="sm" onPress={markAllRead} /> : null}
        />
      }
    >
      {notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" title="You're all caught up" message="Upload confirmations and new materials from your instructors will appear here." />
      ) : (
        <View style={{ gap: t.spacing.sm, paddingTop: t.spacing.sm }}>
          {notifications.map((n) => {
            const s = kindStyle(t, n.kind);
            return (
              <Card
                key={n.id}
                onPress={() => open(n)}
                padding={t.spacing.md}
                accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
                style={!n.read ? { borderColor: t.colors.primary } : undefined}
              >
                <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={20} color={s.fg} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="subheading" style={{ flex: 1 }} numberOfLines={1}>
                        {n.title}
                      </Text>
                      {!n.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.primary }} /> : null}
                    </View>
                    <Text variant="label" tone="muted">
                      {n.body}
                    </Text>
                    <Text variant="caption" tone="subtle" style={{ marginTop: 2 }}>
                      {formatRelative(n.createdAt)}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
