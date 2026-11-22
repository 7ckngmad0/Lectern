import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme, type Theme, type TypographyVariant } from '@/theme';

export type TextTone =
  | 'default'
  | 'muted'
  | 'subtle'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'onPrimary';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  color?: string;
  align?: TextStyle['textAlign'];
  uppercase?: boolean;
}

const toneColor = (t: Theme, tone: TextTone): string => {
  const c = t.colors;
  switch (tone) {
    case 'muted':
      return c.textMuted;
    case 'subtle':
      return c.textSubtle;
    case 'primary':
      return c.primary;
    case 'success':
      return c.success;
    case 'warning':
      return c.warning;
    case 'danger':
      return c.danger;
    case 'onPrimary':
      return c.onPrimary;
    default:
      return c.text;
  }
};

export function Text({ variant = 'body', tone = 'default', color, align, uppercase, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        theme.typography[variant],
        { color: color ?? toneColor(theme, tone) },
        align ? { textAlign: align } : null,
        uppercase ? { textTransform: 'uppercase' } : null,
        style,
      ]}
    />
  );
}
