import { View } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, compact }: EmptyStateProps) {
  const t = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: compact ? t.spacing.xxl : t.spacing.huge,
        paddingHorizontal: t.spacing.xxl,
        gap: t.spacing.sm,
      }}
    >
      <View
        style={{
          width: compact ? 56 : 72,
          height: compact ? 56 : 72,
          borderRadius: 36,
          backgroundColor: t.colors.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: t.spacing.sm,
        }}
      >
        <Icon name={icon} size={compact ? 26 : 32} color={t.colors.primary} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text tone="muted" align="center" style={{ maxWidth: 300 }}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="tonal" style={{ marginTop: t.spacing.md }} />
      ) : null}
    </View>
  );
}
