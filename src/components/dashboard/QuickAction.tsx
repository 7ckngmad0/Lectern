import { Pressable, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/theme';

interface QuickActionProps {
  icon: IconName;
  label: string;
  color: string;
  tint: string;
  onPress: () => void;
}

export function QuickAction({ icon, label, color, tint, onPress }: QuickActionProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexBasis: '47%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        padding: t.spacing.md,
        borderRadius: t.radius.lg,
        backgroundColor: pressed ? t.colors.surfacePressed : t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        boxShadow: t.shadows.card,
      })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text variant="label" numberOfLines={2} style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}
