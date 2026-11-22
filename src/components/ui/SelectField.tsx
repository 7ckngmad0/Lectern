import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import { Icon } from './Icon';
import { Sheet, SheetRow } from './Sheet';
import { Text } from './Text';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  helper?: string;
  disabled?: boolean;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  required,
  error,
  helper,
  disabled,
}: SelectFieldProps<T>) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" tone="muted">
        {label}
        {required ? <Text variant="label" tone="danger"> *</Text> : null}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'not selected'}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          paddingHorizontal: 14,
          borderRadius: t.radius.md,
          borderWidth: error ? 1.5 : 1,
          borderColor: error ? t.colors.danger : t.colors.border,
          backgroundColor: disabled ? t.colors.surfaceAlt : pressed ? t.colors.surfacePressed : t.colors.surface,
          gap: 10,
        })}
      >
        <Text tone={selected ? 'default' : 'subtle'} numberOfLines={1} style={{ flex: 1 }}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={t.colors.textSubtle} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="subtle">
          {helper}
        </Text>
      ) : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        {options.map((o) => (
          <SheetRow
            key={o.value}
            label={o.label}
            description={o.description}
            selected={o.value === value}
            onPress={() => {
              onChange(o.value);
              setOpen(false);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}
