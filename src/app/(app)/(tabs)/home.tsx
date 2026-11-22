import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ContentCard } from '@/components/content/ContentCard';
import { FeaturedCard } from '@/components/content/FeaturedCard';
import { ActivityRow } from '@/components/dashboard/ActivityRow';
import { QuickAction } from '@/components/dashboard/QuickAction';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  Avatar,
  Card,
  EmptyState,
  Icon,
  IconButton,
  Screen,
  SearchBar,
  SectionHeader,
  Skeleton,
  SkeletonList,
  Text,
} from '@/components/ui';
import { useCurrentUser, useRecentlyOpened, useRemoteSync, useUnreadCount, useVisibleMaterials } from '@/hooks/useContent';
import { firstName, greeting } from '@/lib/format';
import { isStaff } from '@/lib/permissions';
import { refreshAll } from '@/services/sync';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const t = useTheme();
  const user = useCurrentUser();
  const presentations = useContentStore((s) => s.presentations);
  const exercises = useContentStore((s) => s.exercises);
  const bookmarks = useContentStore((s) => s.bookmarks);
  const activity = useContentStore((s) => s.activity);
  const materials = useVisibleMaterials();
  const unread = useUnreadCount();
  const mode = useAuthStore((s) => s.mode);
  const { loading } = useRemoteSync('presentation');
  const recentlyAccessed = useRecentlyOpened(3);
  const [refreshing, setRefreshing] = useState(false);

  const myPresentations = useMemo(() => presentations.filter((p) => p.ownerId === user.id), [presentations, user.id]);
  const myExercises = useMemo(() => exercises.filter((e) => e.ownerId === user.id), [exercises, user.id]);

  const myRecentUploads = useMemo(
    () => [...myPresentations, ...myExercises].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
    [myExercises, myPresentations],
  );

  const featured = useMemo(() => materials.filter((m) => m.isFeatured && m.status === 'published'), [materials]);
  const myActivity = useMemo(() => activity.filter((a) => a.userId === user.id).slice(0, 4), [activity, user.id]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      if (mode === 'supabase') await refreshAll();
      else await new Promise((r) => setTimeout(r, 700));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, paddingTop: t.spacing.lg }}>
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Open profile">
          <Avatar name={user.fullName} size={46} uri={user.avatarUrl} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="label" tone="muted">
            {greeting()},
          </Text>
          <Text variant="title" numberOfLines={1}>
            {firstName(user.fullName)}
          </Text>
        </View>
        <IconButton
          icon="notifications-outline"
          variant="surface"
          size={44}
          showDot={unread > 0}
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          onPress={() => router.push('/notifications')}
        />
      </View>

      {user.section || user.course ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: t.spacing.md }}>
          <Icon name="school-outline" size={14} color={t.colors.textSubtle} />
          <Text variant="caption" tone="subtle">
            {[user.course, user.section].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}

      <SearchBar
        placeholder="Search presentations, exercises, materials"
        onPress={() => router.push('/search')}
        style={{ marginTop: t.spacing.lg }}
      />

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.lg }}>
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={104} radius={t.radius.lg} style={{ flex: 1 }} />)
        ) : (
          <>
            <StatCard
              icon="easel-outline"
              value={myPresentations.length}
              label="Presentations"
              color={t.colors.file.ppt.fg}
              tint={t.colors.file.ppt.bg}
              onPress={() => router.push('/my-uploads')}
            />
            <StatCard
              icon="clipboard-outline"
              value={myExercises.length}
              label="Exercises"
              color={t.colors.file.xls.fg}
              tint={t.colors.file.xls.bg}
              onPress={() => router.push({ pathname: '/my-uploads', params: { tab: 'exercise' } })}
            />
            <StatCard
              icon="bookmark-outline"
              value={bookmarks.length}
              label="Saved"
              color={t.colors.primary}
              tint={t.colors.primaryMuted}
              onPress={() => router.push('/bookmarks')}
            />
          </>
        )}
      </View>

      {/* Quick actions */}
      <SectionHeader title="Quick actions" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
        <QuickAction
          icon="cloud-upload-outline"
          label="Upload presentation"
          color={t.colors.file.ppt.fg}
          tint={t.colors.file.ppt.bg}
          onPress={() => router.push('/presentation/upload')}
        />
        <QuickAction
          icon="add-circle-outline"
          label="Upload exercise"
          color={t.colors.file.xls.fg}
          tint={t.colors.file.xls.bg}
          onPress={() => router.push('/exercise/upload')}
        />
        <QuickAction
          icon="library-outline"
          label="Browse library"
          color={t.colors.file.doc.fg}
          tint={t.colors.file.doc.bg}
          onPress={() => router.push('/library')}
        />
        <QuickAction
          icon="folder-open-outline"
          label="My uploads"
          color={t.colors.file.image.fg}
          tint={t.colors.file.image.bg}
          onPress={() => router.push('/my-uploads')}
        />
      </View>

      {isStaff(user) ? (
        <Card onPress={() => router.push('/admin')} style={{ marginTop: t.spacing.md }} accessibilityLabel="Open admin console">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: t.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="shield-checkmark-outline" size={20} color={t.colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subheading">Admin console</Text>
              <Text variant="caption" tone="subtle">
                Manage users, materials and uploaded content
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color={t.colors.textSubtle} />
          </View>
        </Card>
      ) : null}

      {/* Featured */}
      {featured.length ? (
        <>
          <SectionHeader title="Featured materials" actionLabel="Library" onAction={() => router.push('/library')} />
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

      {/* My recent uploads */}
      <SectionHeader title="Your recent uploads" actionLabel="See all" onAction={() => router.push('/my-uploads')} />
      {loading ? (
        <SkeletonList count={2} />
      ) : myRecentUploads.length ? (
        <View style={{ gap: t.spacing.md }}>
          {myRecentUploads.map((item) => (
            <ContentCard key={`${item.kind}:${item.id}`} item={item} trailing="none" />
          ))}
        </View>
      ) : (
        <Card>
          <EmptyState
            compact
            icon="cloud-upload-outline"
            title="Nothing uploaded yet"
            message="Upload your first presentation so it's ready when it's your turn to report."
            actionLabel="Upload presentation"
            onAction={() => router.push('/presentation/upload')}
          />
        </Card>
      )}

      {/* Recently accessed */}
      {recentlyAccessed.length ? (
        <>
          <SectionHeader title="Recently opened" />
          <View style={{ gap: t.spacing.md }}>
            {recentlyAccessed.map((item) => (
              <ContentCard key={`${item.kind}:${item.id}`} item={item} />
            ))}
          </View>
        </>
      ) : null}

      {/* Activity */}
      {myActivity.length ? (
        <>
          <SectionHeader title="Recent activity" />
          <Card>
            {myActivity.map((a, i) => (
              <ActivityRow key={a.id} activity={a} isLast={i === myActivity.length - 1} />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
