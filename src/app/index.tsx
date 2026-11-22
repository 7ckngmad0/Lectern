import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

import { APP_NAME, APP_TAGLINE, LogoMark } from '@/components/Brand';
import { Text } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme';

const MIN_SPLASH_MS = 1000;

/** In-app splash: brand moment while the saved session is restored, then routes. */
export default function SplashRoute() {
  const t = useTheme();
  const fade = useState(() => new Animated.Value(0))[0];
  const status = useAuthStore((s) => s.status);
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    const timer = setTimeout(() => setMinTimeDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [fade]);

  useEffect(() => {
    if (!minTimeDone || status === 'initializing') return;
    const { user, hasOnboarded } = useAuthStore.getState();
    if (user) router.replace('/home');
    else if (!hasOnboarded) router.replace('/onboarding');
    else router.replace('/login');
  }, [minTimeDone, status]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background }}>
      <Animated.View
        style={{
          alignItems: 'center',
          gap: t.spacing.lg,
          opacity: fade,
          transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}
      >
        <LogoMark size={76} />
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text variant="display">{APP_NAME}</Text>
          <Text tone="muted">{APP_TAGLINE}</Text>
        </View>
      </Animated.View>
    </View>
  );
}
