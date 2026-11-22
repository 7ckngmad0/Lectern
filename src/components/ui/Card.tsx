import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  elevated?: boolean;
}

export function Card({ children, onPress, onLongPress, padding, style, accessibilityLabel, elevated }: CardProps) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: padding ?? t.spacing.lg,
    boxShadow: elevated ? t.shadows.raised : t.shadows.card,
  };

  if (!onPress && !onLongPress) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { backgroundColor: t.colors.surfacePressed }, style]}
    >
      {children}
    </Pressable>
  );
}
