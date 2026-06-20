/**
 * Building blocks for the immersive "story panel" onboarding (Direction C). These
 * render over a full-screen cinematic background, so everything is light-on-dark
 * and gesture-forward: big white headlines, premium glass choice tiles that light
 * up when tapped, a story-style segmented progress bar, and a floating action pill.
 *
 * Visuals are gradient + crafted line icons (no photo/emoji assets) so the flow
 * ships without an image pipeline; `NICHE_VISUAL` / `CONTENT_VISUAL` map each
 * option to its tile gradient + `Icon` name. Motion is Reanimated and respects
 * reduce-motion.
 */
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View, useWindowDimensions, type KeyboardTypeOptions, type ViewStyle } from 'react-native';
import Reanimated, {
  Easing,
  Extrapolation,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from '@/components/ui/SafePressable';
import { Icon, type IconName } from '@/components/ui';

export type Grad = readonly [string, string];

// ── option → tile visual (gradient + crafted line icon, no emoji) ────────────
type TileVisual = { icon: IconName; colors: Grad };

export const NICHE_VISUAL: Record<string, TileVisual> = {
  Food: { icon: 'utensils', colors: ['#FF7A45', '#D7263D'] },
  Lifestyle: { icon: 'sun', colors: ['#7C5CFF', '#4124C9'] },
  Fashion: { icon: 'shirt', colors: ['#FF5EA0', '#B4126B'] },
  Beauty: { icon: 'lipstick', colors: ['#FF6FB5', '#C026D3'] },
  Fitness: { icon: 'dumbbell', colors: ['#16C79A', '#0A7B68'] },
  'Health & Wellness': { icon: 'leaf', colors: ['#34D399', '#047857'] },
  Tech: { icon: 'cpu', colors: ['#2D88FF', '#0A3DC9'] },
  Gaming: { icon: 'gamepad', colors: ['#8B5CF6', '#5B21B6'] },
  Travel: { icon: 'plane', colors: ['#22B8CF', '#0B6E99'] },
  Parenting: { icon: 'baby', colors: ['#FFA94D', '#E8590C'] },
  Education: { icon: 'book', colors: ['#4DABF7', '#1864AB'] },
  Comedy: { icon: 'smile', colors: ['#FFD43B', '#F08C00'] },
  Music: { icon: 'music', colors: ['#F783AC', '#A61E4D'] },
  'Art & Design': { icon: 'palette', colors: ['#FF8787', '#C92A2A'] },
  'Business & Finance': { icon: 'briefcase', colors: ['#38D9A9', '#087F5B'] },
};

export const CONTENT_VISUAL: Record<string, TileVisual> = {
  Reel: { icon: 'film', colors: ['#FF5EA0', '#B4126B'] },
  Short: { icon: 'zap', colors: ['#FFD43B', '#F08C00'] },
  Story: { icon: 'story', colors: ['#7C5CFF', '#4124C9'] },
  Post: { icon: 'grid', colors: ['#4DABF7', '#1864AB'] },
  'Long Video': { icon: 'video', colors: ['#FF7A45', '#D7263D'] },
  Review: { icon: 'star', colors: ['#FFB84D', '#E8590C'] },
  Photo: { icon: 'camera', colors: ['#22B8CF', '#0B6E99'] },
  UGC: { icon: 'phone', colors: ['#16C79A', '#0A7B68'] },
};

const FALLBACK_VISUAL: TileVisual = { icon: 'sparkles', colors: ['#2D88FF', '#0A3DC9'] };
export const optionVisual = (label: string): TileVisual =>
  NICHE_VISUAL[label] ?? CONTENT_VISUAL[label] ?? FALLBACK_VISUAL;

// ── story progress bar (white segments over the photo) ───────────────────────
export function StoryProgress({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' }}>
          {i < current ? <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 2 }} /> : null}
        </View>
      ))}
    </View>
  );
}

// ── circular translucent back ────────────────────────────────────────────────
export function StoryBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="chevL" size={19} color="#fff" />
    </Pressable>
  );
}

// ── big headline + subtitle (light on dark) ──────────────────────────────────
export function StoryHeadline({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={{ fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.8, lineHeight: 35 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', marginTop: 8, lineHeight: 21 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

// ── premium glass choice tile: calm by default, lights up (gradient wash +
//    lift + check) when selected ───────────────────────────────────────────────
export function ChoiceTile({
  label,
  icon,
  colors,
  selected,
  onPress,
  width,
  height = 120,
}: {
  label: string;
  icon: IconName;
  colors: Grad;
  selected: boolean;
  onPress: () => void;
  width?: number | string;
  height?: number;
}) {
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const pop = useSharedValue(1);
  const sel = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    sel.value = withTiming(selected ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
    if (selected && !reduced) {
      pop.value = withSequence(
        withTiming(1.05, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 12, stiffness: 240, mass: 0.5 }),
      );
    }
  }, [selected, reduced, sel, pop]);

  const tileStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -4 * sel.value },
      { scale: (1 + 0.025 * sel.value) * (1 - press.value * 0.04) * pop.value },
    ],
    borderColor: `rgba(255,255,255,${0.13 + sel.value * 0.79})`,
  }));
  const washStyle = useAnimatedStyle(() => ({ opacity: sel.value }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: sel.value, transform: [{ scale: 0.4 + sel.value * 0.6 }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 150 });
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{ width: width as ViewStyle['width'] }}
    >
      <Reanimated.View
        style={[
          { height, borderRadius: 22, overflow: 'hidden', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.06)', padding: 14, justifyContent: 'space-between' },
          tileStyle,
        ]}
      >
        {/* gradient wash — fades in on select */}
        <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, washStyle]}>
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
        </Reanimated.View>

        {/* gradient icon medallion (the only color pop when unselected) */}
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }}
        >
          <Icon name={icon} size={23} color="#fff" strokeWidth={2} />
        </LinearGradient>

        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.2 }}>{label}</Text>

        {/* check badge */}
        <Reanimated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 11, right: 11, width: 25, height: 25, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, checkStyle]}
        >
          <Icon name="check" size={15} color="#111" strokeWidth={3} />
        </Reanimated.View>
      </Reanimated.View>
    </Pressable>
  );
}

// ── floating bottom action pill ──────────────────────────────────────────────
export function NextPill({
  label,
  onPress,
  disabled = false,
  loading = false,
  count,
  icon = 'arrowR',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  count?: number;
  icon?: IconName;
}) {
  return (
    <Reanimated.View entering={FadeInUp.duration(220)}>
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: 56,
          borderRadius: 18,
          backgroundColor: disabled ? 'rgba(255,255,255,0.35)' : '#fff',
          opacity: pressed ? 0.85 : 1,
          ...(disabled ? {} : { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }),
        })}
      >
        {typeof count === 'number' && count > 0 ? (
          <View style={{ minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 999, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '800' }}>{count}</Text>
          </View>
        ) : null}
        <Text style={{ fontSize: 16.5, fontWeight: '800', color: disabled ? 'rgba(0,0,0,0.4)' : '#111', letterSpacing: -0.2 }}>
          {loading ? 'Please wait…' : label}
        </Text>
        {!loading && <Icon name={icon} size={18} color={disabled ? 'rgba(0,0,0,0.4)' : '#111'} strokeWidth={2.4} />}
      </Pressable>
    </Reanimated.View>
  );
}

// ── dark-canvas text input ───────────────────────────────────────────────────
export function StoryInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'none',
  maxLength,
  multiline = false,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.72)', marginBottom: 7, letterSpacing: 0.2 }}>{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.42)"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        multiline={multiline}
        style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 13,
          minHeight: multiline ? 100 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          fontSize: 16,
          color: '#fff',
        }}
      />
    </View>
  );
}

// ── dark-canvas autocomplete (type-ahead suggestions) ────────────────────────
export function StoryAutocomplete({
  label,
  value,
  onChangeText,
  onSelect,
  options,
  placeholder,
  autoCapitalize = 'words',
  max = 6,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  onSelect: (t: string) => void;
  options: readonly string[];
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  max?: number;
}) {
  const [focused, setFocused] = useState(false);
  const q = value.trim().toLowerCase();
  const matches =
    focused && q.length >= 1
      ? options.filter((o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q).slice(0, max)
      : [];

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.72)', marginBottom: 7, letterSpacing: 0.2 }}>{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        // Delay so a tap on a suggestion registers before the list hides.
        onBlur={() => setTimeout(() => setFocused(false), 160)}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.42)"
        autoCapitalize={autoCapitalize}
        style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          borderColor: matches.length ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 13,
          fontSize: 16,
          color: '#fff',
        }}
      />
      {matches.length > 0 ? (
        <View style={{ marginTop: 6, backgroundColor: 'rgba(14,16,26,0.97)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
          {matches.map((o, i) => (
            <Pressable
              key={o}
              onPress={() => {
                onSelect(o);
                setFocused(false);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: pressed ? 'rgba(255,255,255,0.10)' : 'transparent',
                borderTopWidth: i ? 1 : 0,
                borderTopColor: 'rgba(255,255,255,0.08)',
              })}
            >
              <Icon name="mappin" size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
              <Text style={{ color: '#fff', fontSize: 15 }}>{o}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── ghost "skip" text link ───────────────────────────────────────────────────
export function SkipLink({ label = 'Skip for now', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ alignSelf: 'center', paddingVertical: 10, opacity: pressed ? 0.5 : 1 })}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.72)' }}>{label}</Text>
    </Pressable>
  );
}

// ── panel scaffold: headline (top) · content (scrolls) · footer (bottom) ─────
export function StoryPanel({
  title,
  subtitle,
  children,
  footer,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 16 }}>
        <StoryHeadline title={title} subtitle={subtitle} />
      </View>
      {/* overflow:hidden clips the scroll region so a selected tile's lift/scale
          (or scrolled content) can never bleed up over the header text. */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20 }}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 6 }}>{children}</View>
        )}
      </View>
      {footer ? <View style={{ paddingHorizontal: 24, paddingTop: 10 }}>{footer}</View> : null}
    </View>
  );
}

/** 2-column grid width helper for tiles given horizontal page padding + gap. */
export function useTileWidth(pad = 24, gap = 12, cols = 2): number {
  const { width } = useWindowDimensions();
  return Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);
}

// ── welcome hero: fanning profile-card deck ──────────────────────────────────
// Three glass cards start stacked, then fan out + settle with a spring (once).
// The front card previews the creator profile the user is about to build.
function DeckCard({
  tx,
  ty,
  rot,
  delay,
  z,
  children,
}: {
  tx: number;
  ty: number;
  rot: number;
  delay: number;
  z: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, reduced ? withTiming(1, { duration: 1 }) : withSpring(1, { damping: 14, stiffness: 110, mass: 0.9 }));
  }, [p, delay, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.35], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateX: tx * p.value },
      { translateY: ty * p.value },
      { rotate: `${rot * p.value}deg` },
      { scale: interpolate(p.value, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
    ],
  }));
  return <Reanimated.View style={[{ position: 'absolute', top: 18, left: 12, width: 200, zIndex: z }, style]}>{children}</Reanimated.View>;
}

// Near-solid premium card surfaces (not translucent) so the deck reads as real
// stacked cards, not ghosts. Front is a touch lighter than the two behind it.
const DECK_CARD = {
  borderRadius: 22,
  overflow: 'hidden' as const,
  backgroundColor: '#1C1E38',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.16)',
  shadowColor: '#000',
  shadowOpacity: 0.5,
  shadowRadius: 26,
  shadowOffset: { width: 0, height: 18 },
  elevation: 14,
};

function GhostCard({ banner }: { banner: Grad }) {
  const line = (w: string | number, mt = 0) => (
    <View style={{ height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', width: w as ViewStyle['width'], marginTop: mt }} />
  );
  return (
    <View style={[DECK_CARD, { backgroundColor: '#141528', elevation: 6 }]}>
      <LinearGradient colors={banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 46 }} />
      <View style={{ padding: 13 }}>
        <View style={{ width: 46, height: 46, borderRadius: 999, marginTop: -23, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' }} />
        {line('60%', 12)}
        {line('85%', 8)}
        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' }}>{line('45%')}</View>
      </View>
    </View>
  );
}

function FrontCard({ name }: { name: string }) {
  const initial = (name.trim()[0] ?? 'Y').toUpperCase();
  return (
    <View style={DECK_CARD}>
      <LinearGradient colors={['#7C5CFF', '#C026D3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 46 }} />
      <View style={{ paddingHorizontal: 13, paddingBottom: 14 }}>
        <View style={{ marginTop: -23 }}>
          <LinearGradient colors={['#FF7A45', '#D7263D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 999, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{initial}</Text>
          </LinearGradient>
          <View style={{ position: 'absolute', bottom: -2, left: 32, width: 18, height: 18, borderRadius: 999, backgroundColor: '#2D88FF', borderWidth: 2.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={9} color="#fff" strokeWidth={3.5} />
          </View>
        </View>
        <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginTop: 8 }}>{name || 'Your name'}</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>Creator profile</Text>
        <View style={{ flexDirection: 'row', gap: 5, marginTop: 9 }}>
          {['Fashion', 'Beauty', 'Food'].map((c) => (
            <View key={c} style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{c}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.3 }}>128K</Text>
          <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)' }}>reach</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginLeft: 10 }}>4.2%</Text>
          <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)' }}>eng.</Text>
        </View>
      </View>
    </View>
  );
}

export function WelcomeDeck({ name }: { name: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 224, height: 300 }}>
        <DeckCard tx={-52} ty={18} rot={-10} delay={0} z={1}>
          <GhostCard banner={['#2D88FF', '#0A3DC9']} />
        </DeckCard>
        <DeckCard tx={52} ty={12} rot={9} delay={80} z={2}>
          <GhostCard banner={['#FF5EA0', '#B4126B']} />
        </DeckCard>
        <DeckCard tx={0} ty={0} rot={0} delay={160} z={3}>
          <FrontCard name={name} />
        </DeckCard>
      </View>
    </View>
  );
}
