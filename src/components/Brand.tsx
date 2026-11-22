import { View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export const APP_NAME = 'Lectern';
export const APP_TAGLINE = 'Your lecture notes, all in one place.';

// Brand colours are fixed (not themed): the logo looks the same in light and dark mode.
const NAVY = '#17213F';
const FOLDER_BACK = '#F59E0B';
const FOLDER_FRONT = '#FFC145';
const PAPER = '#FFFFFF';
const PAPER_LINE = '#C5CEF0';
const BOOKMARK = '#3B5BDB';

type Radii = number | [topLeft: number, topRight: number, bottomRight: number, bottomLeft: number];

/**
 * The Lectern logo: a folder holding a lecture sheet with a bookmark, on a navy tile.
 * Coordinates are in a 336-unit design space and scaled to `size`, so they match
 * scripts/generate-icons.mjs (which draws the app icon from the same numbers).
 */
export function LogoMark({ size = 56 }: { size?: number }) {
  const t = useTheme();
  const k = size / 336;

  const box = (x: number, y: number, w: number, h: number, backgroundColor: string, r: Radii = 0): ViewStyle => {
    const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
    return {
      position: 'absolute',
      left: x * k,
      top: y * k,
      width: w * k,
      height: h * k,
      backgroundColor,
      borderTopLeftRadius: tl * k,
      borderTopRightRadius: tr * k,
      borderBottomRightRadius: br * k,
      borderBottomLeftRadius: bl * k,
    };
  };

  return (
    <View
      accessibilityLabel={`${APP_NAME} logo`}
      style={{
        width: size,
        height: size,
        borderRadius: 100 * k,
        backgroundColor: NAVY,
        overflow: 'hidden',
        boxShadow: t.shadows.raised,
      }}
    >
      {/* Folder back, then the sheet, then the front panel on top. */}
      <View style={box(62, 89, 100, 150, FOLDER_BACK, [10, 0, 0, 0])} />
      <View style={box(190, 111, 85, 130, FOLDER_BACK, [0, 10, 0, 0])} />
      <View style={box(95, 78, 146, 130, PAPER, [6, 10, 0, 0])} />
      <View style={box(115, 106, 61, 11, PAPER_LINE, 5.5)} />
      <View style={box(115, 130, 78, 11, PAPER_LINE, 5.5)} />
      {/* Bookmark: a blue strip with a paper-coloured V cut out of its bottom edge. */}
      <View style={box(201, 78, 30, 50, BOOKMARK)} />
      <View
        style={{
          position: 'absolute',
          left: 201 * k,
          top: 116 * k,
          width: 0,
          height: 0,
          borderLeftWidth: 15 * k,
          borderRightWidth: 15 * k,
          borderBottomWidth: 12 * k,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: PAPER,
        }}
      />
      <View style={box(62, 156, 213, 101, FOLDER_FRONT, [3, 3, 14, 14])} />
    </View>
  );
}

export function Wordmark({ size = 56 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <LogoMark size={size} />
      <Text variant="title">{APP_NAME}</Text>
    </View>
  );
}
