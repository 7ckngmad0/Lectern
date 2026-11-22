import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { StatCard } from '@/components/dashboard/StatCard';
import { Avatar, Badge, Card, ListRow, Screen, TabHeader, Text } from '@/components/ui';
import { useCurrentUser, useUnreadCount } from '@/hooks/useContent';
import { isStaff } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { confirmAction } from '@/store/ui';
import { useTheme } from '@/theme';

const ROLE_LABEL = { student: 'Student', instructor: 'Instructor', admin: 'Administrator' } as const;

export default function ProfileScreen() {
  const t = useTheme();
  const user = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);
  const presentations = useContentStore((s) => s.presentations);
  const exercises = useContentStore((s) => s.exercises);
  const bookmarks = useContentStore((s) => s.bookmarks);
  const unread = useUnreadCount();

  const counts = useMemo(
    () => ({
      presentations: presentations.filter((p) => p.ownerId === user.id).length,
      exercises: exercises.filter((e) => e.ownerId === user.id).length,
    }),
    [exercises, presentations, user.id],
  );

  const confirmSignOut = () =>
    confirmAction({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your files.',
      confirmLabel: 'Sign out',
      destructive: true,
      onConfirm: signOut,
    });

  return (
    <Screen>
      <TabHeader title="Profile" />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.lg }}>
          <Avatar name={user.fullName} size={64} uri={user.avatarUrl} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="heading" numberOfLines={1}>
              {user.fullName}
            </Text>
            <Text variant="label" tone="muted" numberOfLines={1}>
              {user.email}
            </Text>
            <Badge label={ROLE_LABEL[user.role]} tone={user.role === 'student' ? 'primary' : 'success'} icon={user.role === 'student' ? undefined : 'shield-checkmark'} />
          </View>
        </View>
        {user.course || user.section ? (
          <View style={{ flexDirection: 'row', gap: t.spacing.xl, marginTop: t.spacing.lg, paddingTop: t.spacing.md, borderTopWidth: 1, borderTopColor: t.colors.border }}>
            {user.course ? <Meta label="Course" value={user.course} /> : null}
            {user.section ? <Meta label="Section" value={user.section} /> : null}
          </View>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.md }}>
        <StatCard icon="easel-outline" value={counts.presentations} label="Presentations" color={t.colors.file.ppt.fg} tint={t.colors.file.ppt.bg} onPress={() => router.push('/my-uploads')} />
        <StatCard icon="clipboard-outline" value={counts.exercises} label="Exercises" color={t.colors.file.xls.fg} tint={t.colors.file.xls.bg} onPress={() => router.push({ pathname: '/my-uploads', params: { tab: 'exercise' } })} />
        <StatCard icon="bookmark-outline" value={bookmarks.length} label="Saved" color={t.colors.primary} tint={t.colors.primaryMuted} onPress={() => router.push('/bookmarks')} />
      </View>

      <Text variant="overline" tone="subtle" uppercase style={{ marginTop: t.spacing.xxl, marginBottom: t.spacing.sm }}>
        Account
      </Text>
      <Card padding={0}>
        <ListRow icon="person-outline" title="Edit profile" onPress={() => router.push('/edit-profile')} />
        <ListRow icon="folder-open-outline" title="My uploads" onPress={() => router.push('/my-uploads')} />
        <ListRow icon="bookmarks-outline" title="Bookmarks" onPress={() => router.push('/bookmarks')} />
        <ListRow
          icon="notifications-outline"
          title="Notifications"
          value={unread ? `${unread} new` : undefined}
          onPress={() => router.push('/notifications')}
        />
        <ListRow icon="settings-outline" title="Settings" onPress={() => router.push('/settings')} isLast />
      </Card>

      {isStaff(user) ? (
        <>
          <Text variant="overline" tone="subtle" uppercase style={{ marginTop: t.spacing.xxl, marginBottom: t.spacing.sm }}>
            Administration
          </Text>
          <Card padding={0}>
            <ListRow
              icon="shield-checkmark-outline"
              iconColor={t.colors.primary}
              iconBg={t.colors.primaryMuted}
              title="Admin console"
              subtitle="Users, materials and content moderation"
              onPress={() => router.push('/admin')}
              isLast
            />
          </Card>
        </>
      ) : null}

      <Card padding={0} style={{ marginTop: t.spacing.xxl }}>
        <ListRow icon="log-out-outline" title="Sign out" destructive chevron={false} onPress={confirmSignOut} isLast />
      </Card>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexShrink: 1 }}>
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text variant="label" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
