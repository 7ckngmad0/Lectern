import { View } from 'react-native';

import { Button, Chip, Text } from '@/components/ui';
import { useSubjects } from '@/lib/catalog';
import { useCatalogStore } from '@/store/catalog';
import { useTheme } from '@/theme';

interface SubjectPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  helper?: string;
  error?: string | null;
}

/** Multi-select of subjects (enrollments). Students can only upload for these. */
export function SubjectPicker({ value, onChange, label = 'Your subjects', helper, error }: SubjectPickerProps) {
  const t = useTheme();
  const allSubjects = useSubjects();
  const status = useCatalogStore((s) => s.status);
  const load = useCatalogStore((s) => s.load);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  if (status !== 'ready') {
    return (
      <View style={{ gap: 8 }}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        {status === 'error' ? (
          <View style={{ gap: 8, alignItems: 'flex-start' }}>
            <Text variant="caption" tone="danger">
              Couldn’t load the subject list. Check your connection.
            </Text>
            <Button label="Try again" variant="tonal" size="sm" icon="refresh" onPress={() => void load()} />
          </View>
        ) : (
          <Text variant="caption" tone="subtle">
            Loading subjects…
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" tone="muted">
        {label}
        <Text variant="label" tone="danger"> *</Text>
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }} accessibilityRole="list">
        {allSubjects.map((s) => (
          <Chip
            key={s.id}
            label={`${s.code} · ${s.name}`}
            dotColor={s.color}
            icon={value.includes(s.id) ? 'checkmark' : undefined}
            selected={value.includes(s.id)}
            onPress={() => toggle(s.id)}
          />
        ))}
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
