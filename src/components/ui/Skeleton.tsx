import { useEffect, useState } from 'react';
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useState(() => new Animated.Value(0.55))[0];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity }, style]}
    />
  );
}

/** Placeholder matching the shape of a ContentCard row. */
export function SkeletonList({ count = 4 }: { count?: number }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing.md }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            gap: t.spacing.md,
            padding: t.spacing.lg,
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: t.colors.surface,
          }}
        >
          <Skeleton width={48} height={48} radius={12} />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <Skeleton width="75%" height={14} />
            <Skeleton width="50%" height={12} />
            <Skeleton width="35%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}
