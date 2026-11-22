import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { ContentList } from '@/components/content/ContentList';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, ListRow, ProgressBar, Screen, ScreenHeader, SectionHeader, Skeleton, Text } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useContent';
import { formatBytes } from '@/lib/format';
import { fetchAdminStats, type AdminStats } from '@/services/admin';
import { refreshAll } from '@/services/sync';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { useTheme } from '@/theme';

/** Supabase free plan file storage. Shown for orientation; your plan may differ. */
const STORAGE_QUOTA = 1024 * 1024 * 1024;
const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function AdminDashboardScreen() {
  const t = useTheme();
  const me = useCurrentUser();
  const remote = useAuthStore((s) => s.mode) === 'supabase';
  const users = useContentStore((s) => s.users);
  const presentations = useContentStore((s) => s.presentations);
  const exercises = useContentStore((s) => s.exercises);
  const materials = useContentStore((s) => s.materials);

  const [serverStats, setServerStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [openedAt] = useState(() => Date.now());

  const loadStats = useCallback(
    () =>
      fetchAdminStats().then(
        (s) => ({ stats: s, failed: false }),
        () => ({ stats: null, failed: true }),
      ),
    [],
  );

  useEffect(() => {
    if (!remote) return;
    let alive = true;
    loadStats().then(({ stats, failed }) => {
      if (!alive) return;
      if (stats) setServerStats(stats);
      setStatsError(failed);
    });
    return () => {
      alive = false;
    };
  }, [loadStats, remote]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const [result] = await Promise.all([remote ? loadStats() : Promise.resolve(null), remote ? refreshAll() : Promise.resolve()]);
      if (result?.stats) setServerStats(result.stats);
      if (result) setStatsError(result.failed);
    } finally {
      setRefreshing(false);
    }
  };

  // Demo mode (or if the stats function isn't installed yet): count what's loaded.
  const localStats = useMemo<AdminStats>(() => {
    const all = [...presentations, ...exercises, ...materials];
    const since = openedAt - WEEK;
    return {
      students: users.filter((u) => u.role === 'student').length,
      instructors: users.filter((u) => u.role === 'instructor').length,
      admins: users.filter((u) => u.role === 'admin').length,
      suspended: users.filter((u) => u.status === 'suspended').length,
      presentations: presentations.length,
      exercises: exercises.length,
      materials: materials.length,
      draftMaterials: materials.filter((m) => m.status === 'draft').length,
      storageBytes: all.reduce((n, x) => n + x.file.sizeBytes, 0),
      uploads7d: [...presentations, ...exercises].filter((x) => new Date(x.createdAt).getTime() > since).length,
    };
  }, [exercises, materials, openedAt, presentations, users]);

  const stats = serverStats ?? localStats;
  const statsLoading = remote && !serverStats && !statsError;
  const totalUsers = stats.students + stats.instructors + stats.admins;

  // Student uploads, newest first: what moderators review.
  const recentStudentUploads = useMemo(() => {
    const staffIds = new Set(users.filter((u) => u.role !== 'student').map((u) => u.id));
    return [...presentations, ...exercises]
      .filter((x) => !staffIds.has(x.ownerId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [exercises, presentations, users]);

  return (
    <Screen header={<ScreenHeader title="Admin console" />} onRefresh={refresh} refreshing={refreshing}>
      {statsLoading ? (
        <View style={{ gap: t.spacing.sm, paddingTop: t.spacing.sm }}>
          {[0, 1].map((row) => (
            <View key={row} style={{ flexDirection: 'row', gap: t.spacing.sm }}>
              <Skeleton height={104} radius={t.radius.lg} style={{ flex: 1 }} />
              <Skeleton height={104} radius={t.radius.lg} style={{ flex: 1 }} />
            </View>
          ))}
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: t.spacing.sm, paddingTop: t.spacing.sm }}>
            <StatCard icon="people-outline" value={totalUsers} label="Users" color={t.colors.primary} tint={t.colors.primaryMuted} onPress={() => router.push('/admin/users')} />
            <StatCard
              icon="easel-outline"
              value={stats.presentations}
              label="Presentations"
              color={t.colors.file.ppt.fg}
              tint={t.colors.file.ppt.bg}
              onPress={() => router.push('/admin/content')}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.sm }}>
            <StatCard
              icon="clipboard-outline"
              value={stats.exercises}
              label="Exercises"
              color={t.colors.file.xls.fg}
              tint={t.colors.file.xls.bg}
              onPress={() => router.push('/admin/content')}
            />
            <StatCard
              icon="library-outline"
              value={stats.materials}
              label="Library materials"
              color={t.colors.file.doc.fg}
              tint={t.colors.file.doc.bg}
              onPress={() => router.push('/admin/materials')}
            />
          </View>
        </>
      )}

      <Card style={{ marginTop: t.spacing.md, gap: t.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="subheading">Storage used</Text>
          <Text variant="label" tone="muted">
            {formatBytes(stats.storageBytes)} of {formatBytes(STORAGE_QUOTA)}
          </Text>
        </View>
        <ProgressBar progress={Math.min(1, stats.storageBytes / STORAGE_QUOTA)} height={8} />
        <Text variant="caption" tone="subtle">
          {stats.students} students · {stats.instructors} instructors · {stats.admins} admins · {stats.suspended} suspended
        </Text>
        <Text variant="caption" tone="subtle">
          {stats.uploads7d} uploads this week · {stats.draftMaterials} draft materials
          {remote ? ' · Quota shown is the Supabase free plan' : ' · Demo data'}
        </Text>
      </Card>

      <SectionHeader title="Manage" />
      <Card padding={0}>
        <ListRow
          icon="people-outline"
          title="User management"
          subtitle={me.role === 'admin' ? 'Roles, access and account status' : 'View accounts (admins change roles)'}
          onPress={() => router.push('/admin/users')}
        />
        <ListRow icon="shield-checkmark-outline" title="Content moderation" subtitle="Review and remove uploaded files" onPress={() => router.push('/admin/content')} />
        <ListRow icon="library-outline" title="Learning materials" subtitle="Add, publish, feature and organize resources" onPress={() => router.push('/admin/materials')} />
        <ListRow icon="add-circle-outline" title="Add learning material" onPress={() => router.push('/admin/material-form')} />
        <ListRow icon="megaphone-outline" title="Send announcement" subtitle="Notify a subject's students or everyone" onPress={() => router.push('/admin/announce')} isLast />
      </Card>

      <SectionHeader title="Recent student uploads" actionLabel="Review all" onAction={() => router.push('/admin/content')} />
      <ContentList
        items={recentStudentUploads}
        showCount={false}
        empty={{ icon: 'checkmark-done-outline', title: 'Nothing to review', message: 'New student uploads will appear here.' }}
      />
    </Screen>
  );
}
