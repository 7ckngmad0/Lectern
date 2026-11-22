import { Pressable, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/theme';

interface StatCardProps {
  icon: IconName;
  value: number | string;
  label: string;
  color: string;
  tint: string;
  onPress?: () => void;
}

export function StatCard({ icon, value, label, color, tint, onPress }: StatCardProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label}`}
      style={({ pressed }) => ({
        flex: 1,
        padding: t.spacing.md,
        borderRadius: t.radius.lg,
        backgroundColor: pressed ? t.colors.surfacePressed : t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        gap: t.spacing.sm,
        boxShadow: t.shadows.card,
      })}
    >
      <View
        style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={icon} size={17} color={color} />
      </View>
      <View>
        <Text variant="title">{value}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
