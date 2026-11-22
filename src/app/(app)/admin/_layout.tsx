import { Stack } from 'expo-router';

import { EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { isStaff } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme';

/**
 * Instructor/admin-only area. This guard is for UX; Phase 2 RLS policies
 * enforce the same rule on the database.
 */
export default function AdminLayout() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);

  if (!isStaff(user)) {
    return (
      <Screen header={<ScreenHeader title="Admin" />}>
        <EmptyState
          icon="lock-closed-outline"
          title="Instructors and admins only"
          message="You don't have permission to open this area. Ask an administrator if you need access."
        />
      </Screen>
    );
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.background } }} />;
}
