import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Bottom sheet built on Modal (no native dependencies, works in Expo Go). */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.colors.overlay }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            paddingBottom: insets.bottom + t.spacing.md,
            maxHeight: '80%',
            boxShadow: t.shadows.floating,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.borderStrong }} />
          </View>
          {title ? (
            <Text variant="heading" style={{ paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.lg, paddingBottom: t.spacing.sm }}>
              {title}
            </Text>
          ) : null}
          <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: t.spacing.sm }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export interface SheetOption {
  label: string;
  icon?: IconName;
  description?: string;
  destructive?: boolean;
  selected?: boolean;
  onPress: () => void;
}

/** A row inside a Sheet. Closing is left to the caller via `onPress`. */
export function SheetRow({ label, icon, description, destructive, selected, onPress }: SheetOption) {
  const t = useTheme();
  const fg = destructive ? t.colors.danger : t.colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.xl,
        paddingVertical: 14,
        backgroundColor: pressed ? t.colors.surfacePressed : 'transparent',
      })}
    >
      {icon ? <Icon name={icon} size={20} color={destructive ? t.colors.danger : t.colors.textMuted} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color={fg}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="subtle">
            {description}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon name="checkmark" size={20} color={t.colors.primary} /> : null}
    </Pressable>
  );
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: SheetOption[];
}

/** Menu of actions; closes itself before running the chosen action. */
export function ActionSheet({ visible, onClose, title, options }: ActionSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {options.map((o) => (
        <SheetRow
          key={o.label}
          {...o}
          onPress={() => {
            onClose();
            o.onPress();
          }}
        />
      ))}
    </Sheet>
  );
}
