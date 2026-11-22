import { useState } from 'react';
import { Image, View } from 'react-native';

import { initials } from '@/lib/format';
import { Text } from './Text';

const AVATAR_COLORS = ['#3B5BDB', '#0CA678', '#AE3EC9', '#1098AD', '#E67700', '#D6336C', '#5F3DC4', '#2B8A3E'];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface AvatarProps {
  name: string;
  size?: number;
  /** Profile photo URL; falls back to initials if missing or it fails to load. */
  uri?: string;
}

/** Profile photo, or coloured initials. */
export function Avatar({ name, size = 40, uri }: AvatarProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = !!uri && failedUri !== uri;
  return (
    <View
      accessibilityLabel={`${name} avatar`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colorFor(name),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showPhoto ? (
        <Image source={{ uri }} style={{ width: size, height: size }} onError={() => setFailedUri(uri)} accessibilityIgnoresInvertColors />
      ) : (
        <Text color="#FFFFFF" style={{ fontFamily: 'Inter_600SemiBold', fontSize: size * 0.38, lineHeight: size * 0.48 }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
