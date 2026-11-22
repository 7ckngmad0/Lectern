import { Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** When set, renders as a tappable shortcut instead of an input. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({ value = '', onChangeText, placeholder = 'Search', autoFocus, onPress, style }: SearchBarProps) {
  const t = useTheme();
  const container: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 14,
    gap: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        style={({ pressed }) => [container, pressed && { backgroundColor: t.colors.surfacePressed }, style]}
      >
        <Icon name="search" size={18} color={t.colors.textSubtle} />
        <Text tone="subtle" numberOfLines={1} style={{ flex: 1 }}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[container, style]}>
      <Icon name="search" size={18} color={t.colors.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textSubtle}
        selectionColor={t.colors.primary}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityRole="search"
        style={[t.typography.body, { flex: 1, color: t.colors.text, paddingVertical: 0 }]}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText?.('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
          <Icon name="close-circle" size={18} color={t.colors.textSubtle} />
        </Pressable>
      ) : null}
    </View>
  );
}
