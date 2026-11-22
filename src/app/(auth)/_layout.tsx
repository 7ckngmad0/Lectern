import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme';

/** Public routes. Signed-in users are sent to the app. */
export default function AuthLayout() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  if (user) return <Redirect href="/home" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.background } }} />;
}
