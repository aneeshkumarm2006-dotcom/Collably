/**
 * Campaign cover image with a category-tinted gradient fallback. Shows the remote
 * cover (cached via `expo-image`) when present/loadable; otherwise renders a
 * category-specific gradient so the explore feed never shows blank rectangles.
 */
import { useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RemoteImage } from '@/components/ui/RemoteImage';
import type { Category } from '@/constants';

/** Category → [from, to] gradient. Tones echo the design reference's COVER_GRADIENTS. */
const CATEGORY_GRADIENT: Record<Category, [string, string]> = {
  Restaurant: ['#2A3358', '#46507F'],
  Cafe: ['#5A4732', '#8A6A45'],
  'Food & Beverage': ['#5A2F44', '#8A4A6A'],
  Fashion: ['#3A3A66', '#5C5C9A'],
  Beauty: ['#7A3B5E', '#B05D80'],
  'Salon & Spa': ['#3E5F4E', '#5E8A72'],
  'Health & Wellness': ['#1F5E58', '#2E8077'],
  Fitness: ['#1F5E58', '#2E8077'],
  Tech: ['#26344F', '#3F5680'],
  Gaming: ['#3A2A5E', '#5C4A9A'],
  Travel: ['#2A4A6E', '#3F6E9A'],
  'Home & Lifestyle': ['#4A4036', '#6E5F4D'],
  Education: ['#2A3358', '#46507F'],
  Other: ['#33384A', '#4E556E'],
};

export type CoverImageProps = {
  src?: string | null;
  category: Category;
  /** Border radius applied to the whole cover. */
  radius?: number;
  style?: ViewStyle;
  /** Optional overlay content (category chip, status corner, etc.). */
  children?: React.ReactNode;
};

export function CoverImage({ src, category, radius = 0, style, children }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const [from, to] = CATEGORY_GRADIENT[category] ?? CATEGORY_GRADIENT.Other;
  const showImage = !!src && !failed;

  return (
    <View style={{ overflow: 'hidden', borderRadius: radius, backgroundColor: from, ...style }}>
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {showImage && (
        <RemoteImage
          source={{ uri: src! }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          recyclingKey={src}
          onError={() => setFailed(true)}
        />
      )}
      {children}
    </View>
  );
}
