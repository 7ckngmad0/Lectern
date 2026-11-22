import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

interface ScreenHeaderProps {
  title?: string;
  right?: ReactNode;
  /** Defaults to router.back() with a fallback to Home when there's no history. */
  onBack?: () => void;
  showBack?: boolean;
}

/** Compact header for stack screens. */
export function ScreenHeader({ title, right, onBack, showBack = true }: ScreenHeaderProps) {
  const t = useTheme();
  const back = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };
  return (
    <View
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: t.spacing.sm,
        gap: t.spacing.xs,
      }}
    >
      {showBack ? (
        <IconButton icon="chevron-back" accessibilityLabel="Go back" onPress={back} size={42} />
      ) : (
        <View style={{ width: t.spacing.md }} />
      )}
      <Text variant="heading" numberOfLines={1} style={{ flex: 1 }} accessibilityRole="header">
        {title ?? ''}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, paddingRight: t.spacing.xs }}>
        {right}
      </View>
    </View>
  );
}

interface TabHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

/** Large title header used at the top of each tab. */
export function TabHeader({ title, subtitle, right }: TabHeaderProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingTop: t.spacing.lg,
        paddingBottom: t.spacing.lg,
        gap: t.spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text tone="muted" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: t.spacing.xxl,
        marginBottom: t.spacing.md,
      }}
    >
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text variant="label" tone="primary">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
