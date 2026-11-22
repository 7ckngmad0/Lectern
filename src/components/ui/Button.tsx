import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type Theme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const PAD_X: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };

function palette(t: Theme, variant: ButtonVariant, pressed: boolean) {
  const c = t.colors;
  switch (variant) {
    case 'primary':
      return { bg: pressed ? c.primaryPressed : c.primary, fg: c.onPrimary, border: 'transparent' };
    case 'secondary':
      return { bg: pressed ? c.surfacePressed : c.surface, fg: c.text, border: c.border };
    case 'tonal':
      return { bg: pressed ? c.surfacePressed : c.primaryMuted, fg: c.primary, border: 'transparent' };
    case 'ghost':
      return { bg: pressed ? c.surfacePressed : 'transparent', fg: c.primary, border: 'transparent' };
    case 'danger':
      return { bg: pressed ? c.surfacePressed : c.dangerMuted, fg: c.danger, border: 'transparent' };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => {
        const p = palette(theme, variant, pressed);
        return [
          {
            height: HEIGHT[size],
            paddingHorizontal: PAD_X[size],
            borderRadius: theme.radius.md,
            backgroundColor: p.bg,
            borderWidth: variant === 'secondary' ? 1 : 0,
            borderColor: p.border,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: fullWidth ? 'stretch' : 'auto',
            opacity: disabled ? 0.5 : 1,
          } satisfies ViewStyle,
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const { fg } = palette(theme, variant, pressed);
        const iconEl = icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={fg} /> : null;
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {loading ? <ActivityIndicator size="small" color={fg} /> : iconPosition === 'left' && iconEl}
            <Text variant={size === 'sm' ? 'label' : 'subheading'} color={fg} numberOfLines={1}>
              {label}
            </Text>
            {!loading && iconPosition === 'right' && iconEl}
          </View>
        );
      }}
    </Pressable>
  );
}
