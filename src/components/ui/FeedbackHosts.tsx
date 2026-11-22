import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUiStore } from '@/store/ui';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';

/** Floating progress card for downloads. Mount once at the root. */
export function TransferHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const transfer = useUiStore((s) => s.transfer);
  if (!transfer) return null;

  const pct = transfer.progress === null ? null : Math.round(transfer.progress * 100);
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 72 }}
      accessibilityLiveRegion="polite"
    >
      <View
        accessibilityRole="progressbar"
        style={{
          padding: t.spacing.md,
          gap: t.spacing.sm,
          borderRadius: t.radius.md,
          backgroundColor: t.colors.surface,
          borderWidth: 1,
          borderColor: t.colors.border,
          boxShadow: t.shadows.floating,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <Icon name="download-outline" size={18} color={t.colors.primary} />
          <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
            {transfer.title}
          </Text>
          <Text variant="label" tone="muted">
            {pct === null ? '…' : `${pct}%`}
          </Text>
          {transfer.onCancel ? (
            <Pressable onPress={transfer.onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel download">
              <Icon name="close" size={18} color={t.colors.textSubtle} />
            </Pressable>
          ) : null}
        </View>
        <ProgressBar progress={transfer.progress ?? 0.15} />
      </View>
    </View>
  );
}

/** Renders the current toast. Mount once at the root. */
export function ToastHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = useUiStore((s) => s.toast);
  const hide = useUiStore((s) => s.hideToast);
  const anim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!current) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => hide());
    }, 2600);
    return () => clearTimeout(timer);
  }, [anim, current, hide]);

  if (!current) return null;

  const tone = {
    success: { icon: 'checkmark-circle' as const, color: t.colors.success },
    error: { icon: 'alert-circle' as const, color: t.colors.danger },
    info: { icon: 'information-circle' as const, color: t.colors.info },
  }[current.tone];

  return (
    <Animated.View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
      }}
    >
      <Pressable
        onPress={hide}
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: t.radius.md,
          backgroundColor: t.colors.surface,
          borderWidth: 1,
          borderColor: t.colors.border,
          boxShadow: t.shadows.floating,
        }}
      >
        <Icon name={tone.icon} size={22} color={tone.color} />
        <Text variant="bodyMedium" style={{ flex: 1 }}>
          {current.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Renders the confirm dialog requested via `confirmAction()`. Mount once at the root. */
export function DialogHost() {
  const t = useTheme();
  const dialog = useUiStore((s) => s.dialog);
  const close = useUiStore((s) => s.closeDialog);

  return (
    <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: t.colors.overlay }}>
        {dialog ? (
          <View
            accessibilityRole="alert"
            style={{
              width: '100%',
              maxWidth: 380,
              padding: t.spacing.xxl,
              borderRadius: t.radius.xl,
              backgroundColor: t.colors.surface,
              gap: t.spacing.sm,
              boxShadow: t.shadows.floating,
            }}
          >
            {dialog.destructive ? (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: t.colors.dangerMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                }}
              >
                <Icon name="warning-outline" size={22} color={t.colors.danger} />
              </View>
            ) : null}
            <Text variant="heading">{dialog.title}</Text>
            <Text tone="muted">{dialog.message}</Text>
            <View style={{ flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.lg }}>
              <Button label={dialog.cancelLabel ?? 'Cancel'} variant="secondary" onPress={close} style={{ flex: 1 }} />
              <Button
                label={dialog.confirmLabel ?? 'Confirm'}
                variant={dialog.destructive ? 'danger' : 'primary'}
                style={{ flex: 1 }}
                onPress={() => {
                  const run = dialog.onConfirm;
                  close();
                  run();
                }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
