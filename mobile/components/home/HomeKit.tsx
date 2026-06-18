/**
 * Premium ("Blinkit") home building blocks, shared by the Creator and Business
 * home screens. This is the design the CollabSpace handoff landed on: an
 * electric-yellow "craving" header with a rounded seam, a green-money language,
 * and content cards that overlap the seam. See the design's `home-premium.jsx`.
 *
 * These are presentation-only primitives — screens own the data wiring.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import type { Category } from '@/constants';

/** Category → outline icon for the quick-browse tiles (maps the app's full category set). */
export const CATEGORY_ICON: Record<Category, IconName> = {
  Restaurant: 'utensils',
  Cafe: 'coffee',
  'Food & Beverage': 'glass',
  Fashion: 'shirt',
  Beauty: 'lipstick',
  'Salon & Spa': 'scissors',
  'Health & Wellness': 'leaf',
  Fitness: 'dumbbell',
  Tech: 'phone',
  Gaming: 'gamepad',
  Travel: 'plane',
  'Home & Lifestyle': 'sofa',
  Education: 'book',
  Other: 'sparkles',
};

/** Category → soft tile tint [light bg, dark bg, foreground]. */
const CATEGORY_TINT: Record<Category, [string, string, string]> = {
  Restaurant: ['#FFEEDF', 'rgba(217,96,31,0.18)', '#D9601F'],
  Cafe: ['#F4EADB', 'rgba(154,106,58,0.22)', '#9A6A3A'],
  'Food & Beverage': ['#F2E7F6', 'rgba(138,74,160,0.20)', '#8A4AA0'],
  Fashion: ['#ECEDFF', 'rgba(91,87,224,0.20)', '#5B57E0'],
  Beauty: ['#FCE7F1', 'rgba(196,62,120,0.20)', '#C43E78'],
  'Salon & Spa': ['#E7F4EA', 'rgba(62,138,82,0.20)', '#3E8A52'],
  'Health & Wellness': ['#E7F4EA', 'rgba(62,138,82,0.20)', '#3E8A52'],
  Fitness: ['#E1F4EB', 'rgba(14,138,99,0.20)', '#0E8A63'],
  Tech: ['#E1EEFB', 'rgba(46,124,194,0.20)', '#2E7CC2'],
  Gaming: ['#ECEDFF', 'rgba(91,87,224,0.20)', '#5B57E0'],
  Travel: ['#E1EEFB', 'rgba(46,124,194,0.20)', '#2E7CC2'],
  'Home & Lifestyle': ['#F4EADB', 'rgba(154,106,58,0.22)', '#9A6A3A'],
  Education: ['#E1EEFB', 'rgba(46,124,194,0.20)', '#2E7CC2'],
  Other: ['#E7F4EA', 'rgba(62,138,82,0.20)', '#3E8A52'],
};

export function categoryTint(category: Category, dark: boolean): { bg: string; fg: string } {
  const [lb, db, fg] = CATEGORY_TINT[category] ?? CATEGORY_TINT.Other;
  return { bg: dark ? db : lb, fg };
}

/** A pressable that scales/dims slightly on press (the design's `.cs-press`).
 *
 * Uses onPressIn/Out + a STATIC array style instead of Pressable's function
 * `style` form: NativeWind v4's `cssInterop` silently drops a function-form
 * `style` on core components (the bug behind the broken CTAs/cards), but resolves
 * a plain array fine. */
export function Press({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[style, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
    >
      {children}
    </Pressable>
  );
}

/** Yellow brand header with a rounded bottom seam + soft top sheen. */
export function YellowHeader({ children, pb = 22 }: { children: ReactNode; pb?: number }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.brandYellow, colors.brandYellowDeep]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        paddingTop: insets.top + 10,
        paddingHorizontal: 20,
        paddingBottom: pb,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.45, y: 0.7 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}
        pointerEvents="none"
      />
      {children}
    </LinearGradient>
  );
}

const INK = '#FFFFFF';
const INK_SOFT = 'rgba(255,255,255,0.66)';

export function LocationPill({ city, onPress }: { city: string; onPress?: () => void }) {
  return (
    <Press onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name="mappin" size={15} color={INK} />
      <Text style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2, color: INK }}>{city}</Text>
      <Icon name="chevD" size={14} color={INK} />
    </Press>
  );
}

/** Dark glyph button on the yellow header, with an optional red dot badge. */
export function YellowIconBtn({ name, badge, onPress }: { name: IconName; badge?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={22} color={INK} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: colors.danger,
            borderWidth: 2,
            borderColor: colors.brandYellow,
          }}
        />
      ) : null}
    </Press>
  );
}

/** A short green badge, e.g. "3 NEW TODAY" / "2 WAITING". */
export function UrgencyBadge({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: '#1877F2',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
      }}
    >
      <Icon name={icon} size={13} color="#fff" />
      <Text style={{ fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3, color: '#fff' }}>{label}</Text>
    </View>
  );
}

/** Big ink hook headline on the yellow header. */
export function HookHeadline({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 26, fontWeight: '800', color: INK, letterSpacing: -0.8, lineHeight: 30, marginTop: 12 }}>
      {children}
    </Text>
  );
}

/** White search pill (with a green Filters chip) that straddles the yellow seam. */
export function BrandSearch({ placeholder, onPress }: { placeholder: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 15,
        paddingHorizontal: 16,
        paddingVertical: 13,
        shadowColor: '#1A1B10',
        shadowOpacity: 0.16,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5,
      }}
    >
      <Icon name="search" size={20} color={colors.text2} />
      <Text style={{ flex: 1, fontSize: 14.5, color: colors.text3 }}>{placeholder}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: colors.brandGreenSoft,
          paddingHorizontal: 9,
          paddingVertical: 5,
          borderRadius: 8,
        }}
      >
        <Icon name="sliders" size={13} color={colors.brandGreenText} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brandGreenText }}>Filters</Text>
      </View>
    </Press>
  );
}

/** Section heading used down the premium home, with an optional right action. */
export function SectionHead({
  children,
  icon,
  action,
  onAction,
}: {
  children: ReactNode;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <Icon name={icon} size={18} color={colors.brandGreenText} /> : null}
        <Text style={{ fontSize: 18.5, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>{children}</Text>
      </View>
      {action && onAction ? (
        <Press onPress={onAction}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.brandGreenText }}>{action}</Text>
        </Press>
      ) : null}
    </View>
  );
}

export { INK, INK_SOFT };
