import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';

import { EmptyState, Text } from '@/components/ui';
import { bootstrapSignedIn } from '@/services/sync';
import { useAuthStore } from '@/store/auth';
import { useCatalogStore } from '@/store/catalog';
import { useTheme } from '@/theme';

/** Everything in this group requires a signed-in user and a loaded catalog. */
export default function AppLayout() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const mode = useAuthStore((s) => s.mode);
  const catalogStatus = useCatalogStore((s) => s.status);
  const catalogError = useCatalogStore((s) => s.error);
  const userId = user?.id;

  useEffect(() => {
    if (mode === 'supabase' && userId) void bootstrapSignedIn(userId);
  }, [mode, userId]);

  // Coming back to the app: pick up role changes or a suspension made by an admin.
  useEffect(() => {
    if (mode !== 'supabase' || !userId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') useAuthStore.getState().refreshProfile().catch(() => {});
    });
    return () => sub.remove();
  }, [mode, userId]);

  // Deep links can land here before the saved session is restored.
  if (status === 'initializing') return null;
  if (!user) return <Redirect href="/login" />;

  if (catalogStatus !== 'ready') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background, padding: t.spacing.xl }}>
        {catalogStatus === 'error' ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load your subjects"
            message={catalogError ?? 'Check your connection and try again.'}
            actionLabel="Try again"
            onAction={() => void bootstrapSignedIn(user.id)}
          />
        ) : (
          <>
            <ActivityIndicator color={t.colors.primary} />
            <Text tone="muted" style={{ marginTop: t.spacing.md }}>
              Loading your subjects…
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="search" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="presentation/upload" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="exercise/upload" options={{ animation: 'slide_from_bottom' }} />    </Stack>
  );
}
