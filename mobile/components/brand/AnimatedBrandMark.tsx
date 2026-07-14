/**
 * The LocalShout connector mark, drawing itself on.
 *
 * The whole animation is a pure function of one `progress` shared value (0 → 1),
 * which is what lets the *same* component serve two very different drivers:
 *
 *   - the cold-start intro, where progress is played by a timing curve; and
 *   - pull-to-refresh, where progress is scrubbed by the user's thumb.
 *
 * Everything runs on the UI thread: we only touch SVG stroke/geometry props and
 * transforms, never layout. `strokeDashoffset` is the classic draw-on trick — the
 * stroke is dashed with a single dash the length of the path, then the dash is
 * slid into view.
 */
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Geometry of the mark (viewBox 30×24), mirrored from `shared/BrandMark.tsx`.
 * The dash lengths must match the real path lengths or the stroke finishes drawing
 * early (too long) or never quite completes (too short).
 */
const RECT = { x: 3.5, y: 2, w: 23, h: 20, r: 5.5 };
/** Rounded-rect perimeter: the two straight runs per axis plus one full corner circle. */
const RECT_LEN =
  2 * (RECT.w - 2 * RECT.r) + 2 * (RECT.h - 2 * RECT.r) + 2 * Math.PI * RECT.r; // ≈ 76.6
/** Each inner line is a flat 9-unit run. */
const LINE_LEN = 9;
/** The two edge nodes — the "shout" that radiates out of the mark. */
const NODE_R = 2.6;

/**
 * The phases, as fractions of progress. They overlap on purpose: the lines start
 * before the rect finishes, so the mark builds in one continuous gesture rather
 * than three separate beats.
 */
const P = {
  rect: [0, 0.55],
  line1: [0.3, 0.68],
  line2: [0.38, 0.76],
  nodes: [0.62, 1],
} as const;

export function AnimatedBrandMark({
  progress,
  size = 56,
  color = '#FFFFFF',
  bg = 'transparent',
  strokeWidth = 2.1,
}: {
  /** 0 → 1. Drives every phase of the draw-on. */
  progress: SharedValue<number>;
  size?: number;
  color?: string;
  /** Fill behind the edge nodes so they read as solid dots on a coloured hero. */
  bg?: string;
  strokeWidth?: number;
}) {
  const rectProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(
      progress.value,
      P.rect,
      [RECT_LEN, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const line1Props = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, P.line1, [LINE_LEN, 0], Extrapolation.CLAMP),
  }));

  const line2Props = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, P.line2, [LINE_LEN, 0], Extrapolation.CLAMP),
  }));

  // The nodes don't draw — they pop. Animating `r` keeps it on the UI thread and
  // avoids a transform-origin fight with the SVG viewBox.
  const nodeProps = useAnimatedProps(() => ({
    r: interpolate(progress.value, P.nodes, [0, NODE_R], Extrapolation.CLAMP),
    opacity: interpolate(progress.value, P.nodes, [0, 1], Extrapolation.CLAMP),
  }));

  // A whisper of scale on the whole mark so it feels like it lands, not just appears.
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(progress.value, [0, 0.12], [0, 1], Extrapolation.CLAMP),
  }));

  const w = useMemo(() => size * (30 / 24), [size]);

  return (
    <Animated.View style={containerStyle}>
      <Svg width={w} height={size} viewBox="0 0 30 24" fill="none">
        <AnimatedRect
          x={RECT.x}
          y={RECT.y}
          width={RECT.w}
          height={RECT.h}
          rx={RECT.r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={RECT_LEN}
          animatedProps={rectProps}
        />
        <AnimatedPath
          d="M10.5 9.5h9"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={LINE_LEN}
          animatedProps={line1Props}
        />
        <AnimatedPath
          d="M10.5 14.5h9"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={LINE_LEN}
          animatedProps={line2Props}
        />
        <AnimatedCircle
          cx={3.5}
          cy={12}
          fill={bg}
          stroke={color}
          strokeWidth={strokeWidth}
          animatedProps={nodeProps}
        />
        <AnimatedCircle
          cx={26.5}
          cy={12}
          fill={bg}
          stroke={color}
          strokeWidth={strokeWidth}
          animatedProps={nodeProps}
        />
      </Svg>
    </Animated.View>
  );
}

/** A non-animated placeholder with the same footprint — used under reduced motion. */
export function StaticBrandMark({
  size = 56,
  color = '#FFFFFF',
  bg = 'transparent',
  strokeWidth = 2.1,
}: {
  size?: number;
  color?: string;
  bg?: string;
  strokeWidth?: number;
}) {
  return (
    <View>
      <Svg width={size * (30 / 24)} height={size} viewBox="0 0 30 24" fill="none">
        <Rect
          x={RECT.x}
          y={RECT.y}
          width={RECT.w}
          height={RECT.h}
          rx={RECT.r}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <Path d="M10.5 9.5h9M10.5 14.5h9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Circle cx={3.5} cy={12} r={NODE_R} fill={bg} stroke={color} strokeWidth={strokeWidth} />
        <Circle cx={26.5} cy={12} r={NODE_R} fill={bg} stroke={color} strokeWidth={strokeWidth} />
      </Svg>
    </View>
  );
}
