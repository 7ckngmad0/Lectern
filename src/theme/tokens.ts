/**
 * Design tokens for Lectern.
 * Colors are defined per scheme; everything else is scheme-independent.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfacePressed: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;

  primary: string;
  primaryPressed: string;
  primaryMuted: string;
  onPrimary: string;

  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  info: string;
  infoMuted: string;

  overlay: string;
  skeleton: string;
  tabBar: string;

  /** File-type accent colors (icon tiles). */
  file: {
    ppt: { fg: string; bg: string };
    pdf: { fg: string; bg: string };
    doc: { fg: string; bg: string };
    xls: { fg: string; bg: string };
    image: { fg: string; bg: string };
    other: { fg: string; bg: string };
  };
}

export const lightPalette: Palette = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F7',
  surfacePressed: '#EBEEF3',
  border: '#E4E7EC',
  borderStrong: '#CDD2DA',

  text: '#101828',
  textMuted: '#4B5565',
  textSubtle: '#8A93A3',
  textInverse: '#FFFFFF',

  primary: '#3B5BDB',
  primaryPressed: '#3049B8',
  primaryMuted: '#EDF1FF',
  onPrimary: '#FFFFFF',

  success: '#108A47',
  successMuted: '#E7F6EE',
  warning: '#B45309',
  warningMuted: '#FEF3E2',
  danger: '#D92D20',
  dangerMuted: '#FDECEA',
  info: '#0B72C4',
  infoMuted: '#E6F2FB',

  overlay: 'rgba(16, 24, 40, 0.45)',
  skeleton: '#E9ECF1',
  tabBar: '#FFFFFF',

  file: {
    ppt: { fg: '#C2410C', bg: '#FFF1E7' },
    pdf: { fg: '#C92A2A', bg: '#FFECEC' },
    doc: { fg: '#1864AB', bg: '#E7F1FC' },
    xls: { fg: '#2B8A3E', bg: '#E8F6EB' },
    image: { fg: '#6741D9', bg: '#F1ECFE' },
    other: { fg: '#4B5565', bg: '#EEF0F3' },
  },
};

export const darkPalette: Palette = {
  background: '#0D1015',
  surface: '#161A21',
  surfaceAlt: '#1D222B',
  surfacePressed: '#242A35',
  border: '#272D38',
  borderStrong: '#3A4250',

  text: '#E8ECF2',
  textMuted: '#A3ACBA',
  textSubtle: '#6E7888',
  textInverse: '#101828',

  primary: '#7189F5',
  primaryPressed: '#5F78E8',
  primaryMuted: '#1C2440',
  onPrimary: '#0D1015',

  success: '#4CC38A',
  successMuted: '#13291F',
  warning: '#F0A54A',
  warningMuted: '#2E2112',
  danger: '#F2766B',
  dangerMuted: '#341A18',
  info: '#5AB0F0',
  infoMuted: '#132535',

  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#222833',
  tabBar: '#12161C',

  file: {
    ppt: { fg: '#F59F64', bg: '#33200F' },
    pdf: { fg: '#F48A8A', bg: '#351819' },
    doc: { fg: '#74B4F2', bg: '#14263A' },
    xls: { fg: '#6BCB83', bg: '#152A1C' },
    image: { fg: '#A98BF5', bg: '#241B3B' },
    other: { fg: '#A3ACBA', bg: '#232933' },
  },
};

/** 4-pt spacing scale. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  subheading: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.6 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const shadows = {
  light: {
    card: '0px 1px 2px rgba(16, 24, 40, 0.04), 0px 1px 3px rgba(16, 24, 40, 0.06)',
    raised: '0px 4px 12px rgba(16, 24, 40, 0.08), 0px 2px 4px rgba(16, 24, 40, 0.04)',
    floating: '0px 10px 24px rgba(16, 24, 40, 0.16)',
  },
  dark: {
    card: 'none',
    raised: '0px 4px 12px rgba(0, 0, 0, 0.35)',
    floating: '0px 10px 24px rgba(0, 0, 0, 0.5)',
  },
} as const;
