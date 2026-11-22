import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';

interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: 'ghost' | 'surface' | 'tonal';
  size?: number;
  color?: string;
  showDot?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 40,
  color,
  showDot,
  disabled,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();
  const base =
    variant === 'surface' ? colors.surface : variant === 'tonal' ? colors.primaryMuted : 'transparent';
  const fg = color ?? (variant === 'tonal' ? colors.primary : colors.text);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.surfacePressed : base,
          borderWidth: variant === 'surface' ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={fg} />
      {showDot ? (
        <View
          style={{
            position: 'absolute',
            top: size * 0.2,
            right: size * 0.22,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: colors.danger,
            borderWidth: 2,
            borderColor: variant === 'surface' ? colors.surface : colors.background,
          }}
        />
      ) : null}
    </Pressable>
  );
}
