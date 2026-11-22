import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { usePrefsStore } from '@/store/prefs';
import {
  darkPalette,
  fonts,
  lightPalette,
  radius,
  shadows,
  spacing,
  typography,
  type ColorScheme,
  type Palette,
} from './tokens';

export * from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  fonts: typeof fonts;
  typography: typeof typography;
  shadows: (typeof shadows)[ColorScheme];
}

const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', colors: lightPalette, spacing, radius, fonts, typography, shadows: shadows.light },
  dark: { scheme: 'dark', colors: darkPalette, spacing, radius, fonts, typography, shadows: shadows.dark },
};

/** Resolves the active scheme from the user's preference and the OS setting. */
export function useColorSchemeName(): ColorScheme {
  const system = useColorScheme();
  const preference = usePrefsStore((s) => s.themePreference);
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
  return preference;
}

export function useTheme(): Theme {
  return themes[useColorSchemeName()];
}

/**
 * Creates a hook that returns theme-aware styles, cached per scheme.
 *
 *   const useStyles = makeStyles((t) => ({ box: { backgroundColor: t.colors.surface } }));
 *   const styles = useStyles();
 */
type NamedStyles = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<T extends NamedStyles>(factory: (theme: Theme) => T) {
  const cache: Partial<Record<ColorScheme, Readonly<T>>> = {};
  return function useStyles(): Readonly<T> {
    const theme = useTheme();
    return useMemo(() => {
      const cached = cache[theme.scheme];
      if (cached) return cached;
      const created = StyleSheet.create(factory(theme));
      cache[theme.scheme] = created;
      return created;
    }, [theme]);
  };
}
