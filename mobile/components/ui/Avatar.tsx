/**
 * Circular avatar with an initials fallback. Shows a cached remote image when
 * `src` is set (via `expo-image`); otherwise renders the person's initials on a
 * brand-tinted background. Used for users, creators, and business logos.
 */
import { useState } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { RemoteImage } from './RemoteImage';
import { initials as toInitials } from '@/lib/utils';

export type AvatarProps = {
  /** Remote image URL (Cloudinary). Falls back to initials when absent/failed. */
  src?: string | null;
  /** Full name — used to derive initials for the fallback. */
  name?: string;
  /** Diameter in px. Default 44. */
  size?: number;
  style?: ViewStyle;
};

export function Avatar({ src, name = '', size = 44, style }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: '#3A5BD9',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {showImage ? (
        <RemoteImage
          source={{ uri: src! }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
          recyclingKey={src}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          style={{
            color: '#fff',
            fontWeight: '600',
            fontSize: size * 0.36,
            letterSpacing: 0.3,
          }}
        >
          {toInitials(name) || '?'}
        </Text>
      )}
    </View>
  );
}
