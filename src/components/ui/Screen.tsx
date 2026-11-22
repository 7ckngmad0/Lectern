import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Horizontal padding for content (default true). */
  padded?: boolean;
  /** Rendered above the scroll area (e.g. a ScreenHeader). */
  header?: ReactNode;
  /** Rendered below the scroll area (e.g. a sticky submit bar). */
  footer?: ReactNode;
  edges?: Edge[];
  keyboard?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  header,
  footer,
  edges = ['top'],
  keyboard = false,
  onRefresh,
  refreshing = false,
  contentStyle,
}: ScreenProps) {
  const t = useTheme();
  const padding: ViewStyle = {
    paddingHorizontal: padded ? t.spacing.xl : 0,
    paddingBottom: t.spacing.xxxl,
  };

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} colors={[t.colors.primary]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { paddingHorizontal: t.spacing.xl }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.colors.background }}>
      {header}
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
          {footer}
        </KeyboardAvoidingView>
      ) : (
        <>
          {body}
          {footer}
        </>
      )}
    </SafeAreaView>
  );
}
