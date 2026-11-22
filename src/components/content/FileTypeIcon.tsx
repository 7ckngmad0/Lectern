import { View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { fileFamily, type FileFamily } from '@/lib/files';
import { useTheme } from '@/theme';

const ICONS: Record<FileFamily, IconName> = {
  ppt: 'easel',
  pdf: 'document-text',
  doc: 'document',
  xls: 'grid',
  image: 'image',
  other: 'document-attach',
};

interface FileTypeIconProps {
  extension: string;
  size?: number;
  showLabel?: boolean;
}

/** Colored tile representing a file's type (PPT, PDF, DOC…). */
export function FileTypeIcon({ extension, size = 48, showLabel = true }: FileTypeIconProps) {
  const { colors } = useTheme();
  const family = fileFamily(extension);
  const { fg, bg } = colors.file[family];
  return (
    <View
      accessibilityLabel={`${extension.toUpperCase()} file`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <Icon name={ICONS[family]} size={size * (showLabel ? 0.4 : 0.48)} color={fg} />
      {showLabel ? (
        <Text
          color={fg}
          style={{ fontFamily: 'Inter_700Bold', fontSize: Math.max(8, size * 0.17), lineHeight: Math.max(10, size * 0.21) }}
        >
          {extension.toUpperCase().slice(0, 4)}
        </Text>
      ) : null}
    </View>
  );
}
