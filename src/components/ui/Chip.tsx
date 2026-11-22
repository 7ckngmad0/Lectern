import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  dotColor?: string;
}

export function Chip({ label, selected = false, onPress, icon, dotColor }: ChipProps) {
  const t = useTheme();
  const fg = selected ? t.colors.onPrimary : t.colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        paddingHorizontal: 14,
        borderRadius: t.radius.pill,
        backgroundColor: selected ? t.colors.primary : pressed ? t.colors.surfacePressed : t.colors.surface,
        borderWidth: 1,
        borderColor: selected ? t.colors.primary : t.colors.border,
      })}
    >
      {dotColor && !selected ? (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
      ) : null}
      {icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling row of chips that bleeds to the screen edges. */
export function ChipRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ flexGrow: 0, marginHorizontal: -t.spacing.xl }, style]}
      contentContainerStyle={{ paddingHorizontal: t.spacing.xl, gap: t.spacing.sm }}
    >
      {children}
    </ScrollView>
  );
}
