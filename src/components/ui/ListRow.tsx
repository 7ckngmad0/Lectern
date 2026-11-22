import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** Custom leading element (e.g. a file-type icon); used instead of icon. */
  leading?: ReactNode;
  iconColor?: string;
  iconBg?: string;
  value?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
  isLast?: boolean;
}

/** Settings-style row. Group several inside a Card with padding={0}. */
export function ListRow({
  title,
  subtitle,
  icon,
  leading,
  iconColor,
  iconBg,
  value,
  trailing,
  onPress,
  destructive,
  chevron = !!onPress,
  isLast,
}: ListRowProps) {
  const t = useTheme();
  const fg = destructive ? t.colors.danger : t.colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: 14,
        backgroundColor: pressed ? t.colors.surfacePressed : 'transparent',
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: t.colors.border,
      })}
    >
      {leading ?? (icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: iconBg ?? (destructive ? t.colors.dangerMuted : t.colors.surfaceAlt),
          }}
        >
          <Icon name={icon} size={18} color={iconColor ?? (destructive ? t.colors.danger : t.colors.textMuted)} />
        </View>
      ) : null)}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color={fg} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="subtle" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="label" tone="subtle">
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <Icon name="chevron-forward" size={18} color={t.colors.textSubtle} /> : null}
    </Pressable>
  );
}
