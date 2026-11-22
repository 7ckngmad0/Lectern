import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

import { useTheme } from '@/theme';

/** Determinate progress bar; `progress` is 0–1. */
export function ProgressBar({ progress, height = 6 }: { progress: number; height?: number }) {
  const { colors } = useTheme();
  const anim = useState(() => new Animated.Value(progress))[0];

  useEffect(() => {
    Animated.timing(anim, { toValue: Math.max(0, Math.min(1, progress)), duration: 180, useNativeDriver: false }).start();
  }, [anim, progress]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: colors.primary,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
