// Per-weight imports so only the 4 weights we use are bundled (not all 18).
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { DialogHost, ToastHost, TransferHost } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useCatalogStore } from '@/store/catalog';
import { useTheme } from '@/theme';

// Keep the native splash visible until fonts are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const t = useTheme();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  // Restore the saved session (or enter demo mode) and fetch the public course
  // catalog (needed by the sign-up form) as early as possible.
  useEffect(() => {
    void useAuthStore.getState().initialize();
    void useCatalogStore.getState().load();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hide();
  }, [fontsLoaded, fontError]);

  const navTheme = useMemo(() => {
    const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.colors.primary,
        background: t.colors.background,
        card: t.colors.surface,
        text: t.colors.text,
        border: t.colors.border,
      },
    };
  }, [t]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: t.colors.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
          <Stack.Screen name="reset-password" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
        <TransferHost />
        <ToastHost />
        <DialogHost />
        <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      </View>
    </ThemeProvider>
  );
}
