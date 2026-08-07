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
import { Text, View, useWindowDimensions, type KeyboardTypeOptions, type ViewStyle } from 'react-native';
import { TextInput } from '@/components/ui/SafeTextInput';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
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
import { useStoryPalette, STORY_BLUE, STORY_GREEN } from './storyTheme';

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

// ── story progress bar (segments over the photo; current one glows) ──────────
export function StoryProgress({ current, total }: { current: number; total: number }) {
  const p = useStoryPalette();
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        const isCurrent = i === current - 1;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: done ? 'transparent' : p.isDark ? p.glass(0.16) : '#D9E3F5',
              // The active segment gets a soft blue glow so "where am I" reads
              // instantly without counting filled bars.
              ...(isCurrent
                ? { shadowColor: '#2D88FF', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 }
                : {}),
            }}
          >
            {done ? (
              <LinearGradient colors={['#2D88FF', '#5AA0FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ── circular translucent back ────────────────────────────────────────────────
export function StoryBackButton({ onPress }: { onPress: () => void }) {
  const p = useStoryPalette();
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
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.hairline,
        opacity: pressed ? 0.6 : 1,
        ...p.elevation(1),
      })}
    >
      <Icon name="chevL" size={19} color={p.ink()} />
    </Pressable>
  );
}

// ── big headline + subtitle, on whichever ground the theme gives us ──────────
export function StoryHeadline({ title, subtitle }: { title: string; subtitle?: string }) {
  const p = useStoryPalette();
  return (
    <View>
      <Text style={{ fontSize: 30, fontWeight: '900', color: p.ink(), letterSpacing: -0.8, lineHeight: 35 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontSize: 15, color: p.ink(0.78), marginTop: 8, lineHeight: 21 }}>{subtitle}</Text>
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
  const p = useStoryPalette();
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const pop = useSharedValue(1);
  const sel = useSharedValue(selected ? 1 : 0);
  // Captured for the worklet below — see `rgb` in storyTheme.
  const rgb = p.rgb;

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
    borderColor: `rgba(${rgb},${0.13 + sel.value * 0.79})`,
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
          { height, borderRadius: 22, overflow: 'hidden', borderWidth: 1, backgroundColor: p.surface, padding: 14, justifyContent: 'space-between', ...p.elevation(selected ? 2 : 1) },
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
          {/* On the coloured medallion, so white in both themes. */}
          <Icon name={icon} size={23} color={p.onTile} strokeWidth={2} />
        </LinearGradient>

        {/* Unselected the label sits on the ground (theme ink); selected, the
            gradient wash is behind it, so it goes white in both themes. */}
        <Text style={{ fontSize: 15, fontWeight: '700', color: selected ? p.onTile : p.ink(), letterSpacing: -0.2 }}>{label}</Text>

        {/* check badge — only ever visible over the gradient wash */}
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

// ── select chip (niche / content) — matches the approved redesign ────────────
// A compact wrap-flow pill that fills brand-blue with a check when selected.
// Replaces the big colour-medallion tiles so the whole flow stays cohesive
// (blue as the only accent). A subtle monochrome icon keeps each option
// recognisable without a rainbow of per-item colours.
export function SelectChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  const p = useStoryPalette();
  // Selected fills with a translucent brand blue, so its ink is the accent in both
  // themes; unselected sits on the ground and follows the theme.
  const selectedInk = p.isDark ? '#FFFFFF' : '#0B4FB0';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 11,
          paddingHorizontal: 14,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: selected ? p.accentBorder : p.hairline,
          backgroundColor: selected ? p.accentSoft : p.surface,
          ...(selected ? {} : p.elevation(1)),
        }}
      >
        <Icon name={icon} size={16} color={selected ? selectedInk : p.ink(0.5)} strokeWidth={2} />
        <Text style={{ fontSize: 14, fontWeight: selected ? '700' : '600', color: selected ? selectedInk : p.chipText, letterSpacing: -0.1 }}>
          {label}
        </Text>
        {selected ? <Icon name="check" size={14} color={p.accentText} strokeWidth={3} /> : null}
      </View>
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
  const p = useStoryPalette();
  // Brand-blue gradient CTA with a soft glow (approved redesign) — one confident
  // primary action per panel. The enabled pill paints ON the blue gradient, so its
  // content stays white in both themes; only the DISABLED pill sits on the bare
  // ground and therefore has to follow the theme.
  const content = (
    <>
      {typeof count === 'number' && count > 0 ? (
        <View style={{ minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: p.onTile, fontSize: 12.5, fontWeight: '800' }}>{count}</Text>
        </View>
      ) : null}
      <Text style={{ fontSize: 16.5, fontWeight: '800', color: p.onTile, letterSpacing: -0.2 }}>
        {loading ? 'Please wait…' : label}
      </Text>
      {!loading && <Icon name={icon} size={18} color={p.onTile} strokeWidth={2.4} />}
    </>
  );

  return (
    <Reanimated.View entering={FadeInUp.duration(220)}>
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        style={({ pressed }) => ({
          borderRadius: 18,
          opacity: pressed ? 0.9 : 1,
          ...(disabled
            ? {}
            : { shadowColor: '#2D88FF', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }),
        })}
      >
        {disabled ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 56,
              borderRadius: 18,
              backgroundColor: p.surfaceSunk,
              borderWidth: 1,
              borderColor: p.hairline,
            }}
          >
            <Text style={{ fontSize: 16.5, fontWeight: '800', color: p.ink(0.35), letterSpacing: -0.2 }}>{label}</Text>
            <Icon name={icon} size={18} color={p.ink(0.35)} strokeWidth={2.4} />
          </View>
        ) : (
          <LinearGradient
            colors={['#2D88FF', '#1877F2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 18 }}
          >
            {content}
          </LinearGradient>
        )}
      </Pressable>
    </Reanimated.View>
  );
}

// ── dark-canvas text input ───────────────────────────────────────────────────
// A solid, premium field (not a flat translucent box): the surface deepens, the
// border picks up the brand blue on focus, and a `valid` field shows an inline
// green check so the user gets validation feedback right where they typed.
export function StoryInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'none',
  maxLength,
  multiline = false,
  valid = false,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  multiline?: boolean;
  /** When true, shows an inline green check (e.g. a validated profile URL). */
  valid?: boolean;
}) {
  const p = useStoryPalette();
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? STORY_BLUE : valid ? 'rgba(69,189,98,0.55)' : p.hairline;

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: p.ink(0.6), marginBottom: 7, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Text>
      ) : null}
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={p.ink(0.36)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          multiline={multiline}
          style={{
            backgroundColor: p.surfaceSunk,
            borderWidth: 1.5,
            borderColor,
            borderRadius: 14,
            paddingLeft: 14,
            paddingRight: valid && !multiline ? 40 : 14,
            paddingVertical: multiline ? 12 : 13,
            minHeight: multiline ? 100 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
            fontSize: 16,
            color: p.ink(),
            // Soft focus ring via shadow (Android falls back to the border color).
            ...(focused
              ? { shadowColor: STORY_BLUE, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }
              : {}),
          }}
        />
        {valid && !multiline ? (
          <View style={{ position: 'absolute', right: 12, width: 20, height: 20, borderRadius: 999, backgroundColor: STORY_GREEN, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={12} color="#fff" strokeWidth={3.4} />
          </View>
        ) : null}
      </View>
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
  const p = useStoryPalette();
  const [focused, setFocused] = useState(false);
  const q = value.trim().toLowerCase();
  const matches =
    focused && q.length >= 1
      ? options.filter((o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q).slice(0, max)
      : [];

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: p.ink(0.72), marginBottom: 7, letterSpacing: 0.2 }}>{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        // Delay so a tap on a suggestion registers before the list hides.
        onBlur={() => setTimeout(() => setFocused(false), 160)}
        placeholder={placeholder}
        placeholderTextColor={p.ink(0.42)}
        autoCapitalize={autoCapitalize}
        style={{
          backgroundColor: p.surfaceSunk,
          borderWidth: 1,
          borderColor: matches.length ? p.hairlineStrong : p.hairline,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 13,
          fontSize: 16,
          color: p.ink(),
        }}
      />
      {matches.length > 0 ? (
        // Opaque, not translucent: suggestion rows have to stay readable over
        // whatever the panel behind them happens to be.
        <View style={{ marginTop: 6, backgroundColor: p.popover, borderRadius: 14, borderWidth: 1, borderColor: p.hairline, overflow: 'hidden', ...p.elevation(2) }}>
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
                backgroundColor: pressed ? p.glass(0.06) : 'transparent',
                borderTopWidth: i ? 1 : 0,
                borderTopColor: p.hairline,
              })}
            >
              <Icon name="mappin" size={14} color={p.ink(0.6)} strokeWidth={2} />
              <Text style={{ color: p.ink(), fontSize: 15 }}>{o}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── ghost "skip" text link ───────────────────────────────────────────────────
export function SkipLink({ label = 'Skip for now', onPress }: { label?: string; onPress: () => void }) {
  const p = useStoryPalette();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ alignSelf: 'center', paddingVertical: 10, opacity: pressed ? 0.5 : 1 })}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: p.ink(0.72) }}>{label}</Text>
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
          <KeyboardAwareScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20 }}
          >
            {children}
          </KeyboardAwareScrollView>
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

// ── welcome hero: one premium "profile preview" card ─────────────────────────
// A single clean card previewing the creator profile the user is about to build.
// Cohesive with the blue-black flow: a Meta-blue banner, a blue-lit avatar, and
// an honest "verified creator" row (no fabricated reach/engagement numbers). The
// card springs up + fades in once on mount, over a soft blue shadow-glow.
function ProfilePreviewCard({ name }: { name: string }) {
  const p = useStoryPalette();
  // Everything inside this card sits on `cardSurface`, not on the page ground —
  // but both flip with the theme, so the same ink helper reads correctly on either.
  const CARD_SURFACE = p.cardSurface;
  const initial = (name.trim()[0] ?? 'Y').toUpperCase();
  return (
    <View
      style={{
        borderRadius: 26,
        overflow: 'hidden',
        backgroundColor: CARD_SURFACE,
        borderWidth: 1,
        borderColor: p.hairline,
        // Blue shadow reads as a soft glow (iOS); grey elevation on Android.
        // Dark: a saturated blue glow, which reads as light emitted onto near-black.
        // Light: that same glow on a pale canvas just looks like a blue stain, so the
        // card gets a deep neutral-cool elevation instead — the hero card of the
        // screen, so the strongest shadow in the system.
        ...(p.isDark
          ? { shadowColor: '#1877F2', shadowOpacity: 0.55, shadowRadius: 34, shadowOffset: { width: 0, height: 22 }, elevation: 18 }
          : p.elevation(3)),
      }}
    >
      {/* Meta-blue banner with a diagonal sheen */}
      <LinearGradient colors={['#2D88FF', '#1877F2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 76 }}>
        <LinearGradient
          colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          start={{ x: 0.85, y: 0 }}
          end={{ x: 0.4, y: 0.95 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
      </LinearGradient>

      <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
        {/* avatar (overlaps banner) + "open to collabs" tag on the same line */}
        <View style={{ marginTop: -36, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <View style={{ width: 70, height: 70, borderRadius: 999, borderWidth: 3.5, borderColor: CARD_SURFACE }}>
              <LinearGradient colors={['#5AA0FF', '#1877F2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 27, fontWeight: '800', color: p.onTile }}>{initial}</Text>
              </LinearGradient>
            </View>
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 23, height: 23, borderRadius: 999, backgroundColor: '#2D88FF', borderWidth: 2.5, borderColor: CARD_SURFACE, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={11} color={p.onTile} strokeWidth={3.5} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(45,136,255,0.16)', borderWidth: 1, borderColor: 'rgba(90,160,255,0.38)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, marginBottom: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#5AA0FF' }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: p.accentText }}>Open to collabs</Text>
          </View>
        </View>

        <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: '800', color: p.ink(), letterSpacing: -0.4, marginTop: 12 }}>
          {name || 'Your name'}
        </Text>
        <Text style={{ fontSize: 12.5, color: p.ink(0.55), marginTop: 2 }}>Creator profile</Text>

        {/* niche chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          {['Fashion', 'Beauty', 'Food'].map((c) => (
            <View key={c} style={{ backgroundColor: p.surfaceSunk, borderWidth: 1, borderColor: p.hairline, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: p.ink(0.85) }}>{c}</Text>
            </View>
          ))}
        </View>

        {/* Honest trust row: the verified badge comes from the Instagram DM
            ownership check, not a self-reported follower/engagement number. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: p.hairline }}>
          <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: '#2D88FF', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={11} color={p.onTile} strokeWidth={3.5} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: p.ink() }}>Verified creator</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 11.5, color: p.ink(0.4) }}>via Instagram</Text>
        </View>
      </View>
    </View>
  );
}

export function WelcomeDeck({ name }: { name: string }) {
  // `pal`, not `p` — `p` is already the shared value driving the card's entrance.
  const pal = useStoryPalette();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 56, 330);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = reduced ? withTiming(1, { duration: 1 }) : withDelay(90, withSpring(1, { damping: 15, stiffness: 120, mass: 0.9 }));
  }, [p, reduced]);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.5], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(p.value, [0, 1], [28, 0], Extrapolation.CLAMP) },
      { scale: interpolate(p.value, [0, 1], [0.96, 1], Extrapolation.CLAMP) },
    ],
  }));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {/* context caption: tells the user what this card represents */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <View style={{ height: 1, width: 20, backgroundColor: pal.hairlineStrong }} />
        <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, color: pal.ink(0.5) }}>THIS IS WHAT BRANDS SEE</Text>
        <View style={{ height: 1, width: 20, backgroundColor: pal.hairlineStrong }} />
      </View>

      <Reanimated.View style={[{ width: cardW }, cardStyle]}>
        <ProfilePreviewCard name={name} />
      </Reanimated.View>
    </View>
  );
}
