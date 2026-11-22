import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

export function Icon({ name, size = 20, color }: IconProps) {
  const { colors } = useTheme();
  // Navigators hand us RN's ColorValue; we only ever use string colors.
  return <Ionicons name={name} size={size} color={typeof color === 'string' ? color : colors.text} />;
}
