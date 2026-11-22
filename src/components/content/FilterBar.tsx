import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, ChipRow, IconButton, SearchBar, Sheet, SheetRow, Text } from '@/components/ui';
import { SORT_OPTIONS } from '@/lib/query';
import { useTheme } from '@/theme';
import type { SortKey, Subject } from '@/types';

export interface FilterSection {
  title: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}

interface FilterBarProps {
  search: string;
  onSearch: (text: string) => void;
  searchPlaceholder?: string;
  subjects: Subject[];
  subjectId: string | null;
  onSubject: (id: string | null) => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  /** Extra single-select sections shown in the filter sheet (topic, category…). */
  sections?: FilterSection[];
}

/** Search field + filter sheet trigger + subject chips. */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = 'Search',
  subjects,
  subjectId,
  onSubject,
  sort,
  onSort,
  sections = [],
}: FilterBarProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const activeExtra = sections.filter((s) => s.value !== null).length;
  const hasCustom = sort !== 'newest' || activeExtra > 0;

  const reset = () => {
    onSort('newest');
    sections.forEach((s) => s.onChange(null));
  };

  return (
    <View style={{ gap: t.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: t.spacing.sm, alignItems: 'center' }}>
        <SearchBar value={search} onChangeText={onSearch} placeholder={searchPlaceholder} style={{ flex: 1 }} />
        <IconButton
          icon="options-outline"
          variant="surface"
          size={46}
          accessibilityLabel="Sort and filter"
          showDot={hasCustom}
          onPress={() => setOpen(true)}
          style={{ borderRadius: t.radius.md }}
        />
      </View>
      <ChipRow>
        <Chip label="All subjects" selected={subjectId === null} onPress={() => onSubject(null)} />
        {subjects.map((s) => (
          <Chip
            key={s.id}
            label={s.code}
            dotColor={s.color}
            selected={subjectId === s.id}
            onPress={() => onSubject(subjectId === s.id ? null : s.id)}
          />
        ))}
      </ChipRow>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Sort & filter">
        <SectionLabel>Sort by</SectionLabel>
        {SORT_OPTIONS.map((o) => (
          <SheetRow key={o.value} label={o.label} selected={sort === o.value} onPress={() => onSort(o.value)} />
        ))}
        {sections.map((section) => (
          <View key={section.title}>
            <SectionLabel>{section.title}</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, paddingHorizontal: t.spacing.xl }}>
              <Chip label="Any" selected={section.value === null} onPress={() => section.onChange(null)} />
              {section.options.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  selected={section.value === o.value}
                  onPress={() => section.onChange(section.value === o.value ? null : o.value)}
                />
              ))}
            </View>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: t.spacing.sm, padding: t.spacing.xl, paddingBottom: t.spacing.sm }}>
          <Button label="Reset" variant="secondary" onPress={reset} style={{ flex: 1 }} />
          <Button label="Done" onPress={() => setOpen(false)} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text
      variant="overline"
      tone="subtle"
      uppercase
      style={{ paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.lg, paddingBottom: t.spacing.sm }}
    >
      {children}
    </Text>
  );
}
