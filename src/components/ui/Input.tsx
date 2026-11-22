import { useState, type Ref } from 'react';
import { Pressable, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style' | 'ref'> {
  ref?: Ref<TextInputInstance>;
  label?: string;
  error?: string | null;
  helper?: string;
  icon?: IconName;
  required?: boolean;
  /** Shows a show/hide toggle for password fields. */
  password?: boolean;
}

export function Input({
  ref,
  label,
  error,
  helper,
  icon,
  required,
  password,
  multiline,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}: InputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? t.colors.danger : focused ? t.colors.primary : t.colors.border;

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="label" tone="muted">
          {label}
          {required ? <Text variant="label" tone="danger"> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? 104 : 48,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          borderRadius: t.radius.md,
          borderWidth: focused || error ? 1.5 : 1,
          borderColor,
          backgroundColor: editable ? t.colors.surface : t.colors.surfaceAlt,
          gap: 10,
        }}
      >
        {icon ? <Icon name={icon} size={18} color={focused ? t.colors.primary : t.colors.textSubtle} /> : null}
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          multiline={multiline}
          secureTextEntry={password ? hidden : rest.secureTextEntry}
          placeholderTextColor={t.colors.textSubtle}
          selectionColor={t.colors.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          style={[
            t.typography.body,
            {
              flex: 1,
              color: editable ? t.colors.text : t.colors.textMuted,
              paddingVertical: multiline ? 0 : 12,
              textAlignVertical: multiline ? 'top' : 'center',
              minHeight: multiline ? 80 : undefined,
            },
          ]}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={t.colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="subtle">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
