import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  ActionSheet,
  Avatar,
  Badge,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  Icon,
  Screen,
  ScreenHeader,
  SearchBar,
  SkeletonList,
  Text,
  type SheetOption,
} from '@/components/ui';
import { useCurrentUser } from '@/hooks/useContent';
import { codesFromSubjectIds } from '@/lib/catalog';
import { formatDate, pluralize } from '@/lib/format';
import * as adminApi from '@/services/admin';
import { friendlyAuthError } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { confirmAction, toast } from '@/store/ui';
import { useTheme } from '@/theme';
import type { Profile, Role } from '@/types';

const ROLE_LABEL: Record<Role, string> = { student: 'Student', instructor: 'Instructor', admin: 'Admin' };
const ROLE_TONE = { student: 'primary', instructor: 'success', admin: 'info' } as const;
const ROLE_HELP: Record<Role, string> = {
  student: 'Uploads for enrolled subjects and browses the library.',
  instructor: 'Manages any upload and the library, marks official activities and sends announcements.',
  admin: 'Everything instructors can do, plus changing roles and suspending accounts.',
};

type StatusFilter = 'all' | 'active' | 'suspended';

export default function UserManagementScreen() {
  const t = useTheme();
  const me = useCurrentUser();
  const remote = useAuthStore((s) => s.mode) === 'supabase';
  const users = useContentStore((s) => s.users);
  const setUsers = useContentStore((s) => s.setUsers);
  const upsertUser = useContentStore((s) => s.upsertUser);
  const setUserRoleLocal = useContentStore((s) => s.setUserRole);
  const setUserStatusLocal = useContentStore((s) => s.setUserStatus);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(remote);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Resolves to an error message, or null on success. */
  const load = useCallback(
    () =>
      adminApi
        .listProfiles()
        .then((list) => {
          setUsers(list);
          return null;
        })
        .catch((e: unknown) => friendlyAuthError(e)),
    [setUsers],
  );

  useEffect(() => {
    if (!remote) return;
    let alive = true;
    load().then((message) => {
      if (!alive) return;
      setError(message);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [load, remote]);

  const refresh = async () => {
    setRefreshing(true);
    setError(await load());
    setRefreshing(false);
  };

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter(
        (u) =>
          (!role || u.role === role) &&
          (status === 'all' || u.status === status) &&
          (!q || `${u.fullName} ${u.email} ${u.course ?? ''} ${u.section ?? ''}`.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [role, search, status, users]);

  const counts = useMemo(
    () => ({
      student: users.filter((u) => u.role === 'student').length,
      instructor: users.filter((u) => u.role === 'instructor').length,
      admin: users.filter((u) => u.role === 'admin').length,
      suspended: users.filter((u) => u.status === 'suspended').length,
    }),
    [users],
  );

  /** Applies a change in the database (Supabase mode) or in memory (demo mode). */
  const apply = async (u: Profile, patch: { role?: Role; status?: Profile['status'] }, message: string) => {
    try {
      if (remote) {
        const saved = patch.role ? await adminApi.setRole(u.id, patch.role) : await adminApi.setStatus(u.id, patch.status!);
        upsertUser(saved);
      } else {
        if (patch.role) setUserRoleLocal(u.id, patch.role);
        if (patch.status) setUserStatusLocal(u.id, patch.status);
      }
      toast(message);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update the account", 'error');
    }
  };

  const optionsFor = (u: Profile): SheetOption[] => {
    if (u.id === me.id) return [{ label: "You can't change your own role or status", icon: 'information-circle-outline', onPress: () => {} }];
    // Mirrors the database rule: only admins may change roles or account status.
    if (me.role !== 'admin') return [{ label: 'Only administrators can manage accounts', icon: 'lock-closed-outline', onPress: () => {} }];
    const opts: SheetOption[] = (['student', 'instructor', 'admin'] as Role[])
      .filter((r) => r !== u.role)
      .map((r) => ({
        label: `Make ${ROLE_LABEL[r].toLowerCase()}`,
        icon: r === 'student' ? 'school-outline' : 'shield-checkmark-outline',
        onPress: () =>
          confirmAction({
            title: `Make ${u.fullName} ${r === 'admin' ? 'an' : 'a'} ${ROLE_LABEL[r].toLowerCase()}?`,
            message: ROLE_HELP[r],
            confirmLabel: 'Change role',
            onConfirm: () => void apply(u, { role: r }, `${u.fullName} is now ${r === 'admin' ? 'an' : 'a'} ${ROLE_LABEL[r].toLowerCase()}`),
          }),
      }));
    opts.push(
      u.status === 'active'
        ? {
            label: 'Suspend account',
            icon: 'ban-outline',
            destructive: true,
            onPress: () =>
              confirmAction({
                title: 'Suspend account?',
                message: `${u.fullName} will be signed out and won't be able to see or upload anything until the account is reactivated. Their files are kept.`,
                confirmLabel: 'Suspend',
                destructive: true,
                onConfirm: () => void apply(u, { status: 'suspended' }, 'Account suspended'),
              }),
          }
        : {
            label: 'Reactivate account',
            icon: 'checkmark-circle-outline',
            onPress: () => void apply(u, { status: 'active' }, 'Account reactivated'),
          },
    );
    return opts;
  };

  return (
    <Screen header={<ScreenHeader title="User management" />} onRefresh={remote ? refresh : undefined} refreshing={refreshing}>
      <View style={{ gap: t.spacing.md, paddingTop: t.spacing.sm }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, email, course or section" />
        <ChipRow>
          <Chip label="Everyone" selected={role === null} onPress={() => setRole(null)} />
          {(['student', 'instructor', 'admin'] as Role[]).map((r) => (
            <Chip key={r} label={`${ROLE_LABEL[r]}s · ${counts[r]}`} selected={role === r} onPress={() => setRole(role === r ? null : r)} />
          ))}
        </ChipRow>
        <ChipRow>
          <Chip label="Any status" selected={status === 'all'} onPress={() => setStatus('all')} />
          <Chip label="Active" selected={status === 'active'} onPress={() => setStatus('active')} />
          <Chip label={`Suspended · ${counts.suspended}`} selected={status === 'suspended'} onPress={() => setStatus('suspended')} />
        </ChipRow>
        {me.role !== 'admin' ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="information-circle-outline" size={16} color={t.colors.textSubtle} />
            <Text variant="caption" tone="subtle" style={{ flex: 1 }}>
              You can view accounts. Only administrators can change roles or suspend accounts.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <SkeletonList count={4} />
        ) : error && users.length === 0 ? (
          <EmptyState icon="cloud-offline-outline" title="Couldn’t load accounts" message={error} actionLabel="Try again" onAction={() => void refresh()} />
        ) : (
          <>
            <Text variant="label" tone="subtle">
              {pluralize(list.length, 'user')}
            </Text>
            {list.length === 0 ? (
              <EmptyState icon="people-outline" title="No users found" message="Try a different name, role or status filter." />
            ) : (
              list.map((u) => <UserCard key={u.id} user={u} isMe={u.id === me.id} onPress={() => setSelected(u)} />)
            )}
          </>
        )}
      </View>

      <ActionSheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.fullName} options={selected ? optionsFor(selected) : []} />
    </Screen>
  );
}

function UserCard({ user: u, isMe, onPress }: { user: Profile; isMe: boolean; onPress: () => void }) {
  const t = useTheme();
  const subjects = codesFromSubjectIds(u.subjectIds);
  const details = [u.course, u.section, u.createdAt ? `Joined ${formatDate(u.createdAt)}` : null].filter(Boolean).join(' · ');
  return (
    <Card
      onPress={onPress}
      padding={t.spacing.md}
      accessibilityLabel={`${u.fullName}, ${ROLE_LABEL[u.role]}${u.status === 'suspended' ? ', suspended' : ''}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
        <Avatar name={u.fullName} size={44} uri={u.avatarUrl} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading" numberOfLines={1}>
            {u.fullName}
            {isMe ? <Text variant="label" tone="subtle"> (you)</Text> : null}
          </Text>
          {u.email ? (
            <Text variant="caption" tone="subtle" numberOfLines={1}>
              {u.email}
            </Text>
          ) : null}
          {details ? (
            <Text variant="caption" tone="subtle" numberOfLines={1}>
              {details}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            <Badge label={ROLE_LABEL[u.role]} tone={ROLE_TONE[u.role]} />
            {u.status === 'suspended' ? <Badge label="Suspended" tone="danger" icon="ban" /> : null}
            {subjects.length ? (
              <Badge label={subjects.length > 2 ? `${subjects.slice(0, 2).join(', ')} +${subjects.length - 2}` : subjects.join(', ')} />
            ) : null}
          </View>
        </View>
        <Icon name="ellipsis-vertical" size={18} color={t.colors.textSubtle} />
      </View>
    </Card>
  );
}
