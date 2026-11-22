import { Pressable } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface FabProps {
  label: string;
  icon?: IconName;
  onPress: () => void;
}

/** Extended floating action button, anchored above the tab bar. */
export function Fab({ label, icon = 'add', onPress }: FabProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        position: 'absolute',
        right: t.spacing.xl,
        bottom: t.spacing.xl,
        height: 52,
        paddingHorizontal: t.spacing.xl,
        borderRadius: 26,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: pressed ? t.colors.primaryPressed : t.colors.primary,
        boxShadow: t.shadows.floating,
      })}
    >
      <Icon name={icon} size={22} color={t.colors.onPrimary} />
      <Text variant="subheading" color={t.colors.onPrimary}>
        {label}
      </Text>
    </Pressable>
  );
}
