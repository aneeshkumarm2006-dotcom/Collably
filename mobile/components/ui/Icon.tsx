/**
 * Outline icon set, ported 1:1 from the design reference
 * (`_ai_context/Food Collaboration App/app/icons.jsx`) to `react-native-svg`.
 *
 * One stroke-based icon family keeps the whole app on-brand and decoupled from any
 * third-party icon font. Usage: `<Icon name="bell" size={22} color={colors.text2} />`.
 * Stroke width defaults to 1.8 to match the reference's hairline weight; pass
 * `filled` semantic names (`instagram`, `youtube`, `star_f`, `heart_f`, `dot`, …)
 * for the solid glyphs.
 */
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useTheme } from '@/components/ThemeProvider';

/** Stroke-outline glyphs — `d` attribute per icon, drawn on a 24×24 grid. */
const ICON_PATHS = {
  // tab bar
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6',
  compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5.5-5.5 2 2-5.5z',
  handshake:
    'M8 12.5 11 15a2 2 0 002.8 0l.2-.2M6 7l3-1.5 3 1.5 3-1.5L21 7M3 8l3-1v7l-2.5 1.5M21 8l-3-1v7l2.5 1.5M6 14l3 3M9 11l2 2',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  person: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  // actions / meta
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  sliders: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5M14 4v4M6 10v4M11 16v4',
  filter: 'M3 5h18l-7 8v6l-4-2v-4z',
  mappin: 'M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  calendar:
    'M7 3v3M17 3v3M3.5 9h17M5 5h14a1.5 1.5 0 011.5 1.5V19A1.5 1.5 0 0119 20.5H5A1.5 1.5 0 013.5 19V6.5A1.5 1.5 0 015 5z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3.5 2',
  check: 'M5 12.5l4.5 4.5L19 7',
  checkcircle: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 12l2.5 2.5L16 9',
  x: 'M6 6l12 12M18 6L6 18',
  chevR: 'M9 5l7 7-7 7',
  chevL: 'M15 5l-7 7 7 7',
  chevD: 'M5 9l7 7 7-7',
  chevU: 'M5 15l7-7 7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  gift: 'M20 12v8.5a.5.5 0 01-.5.5h-15a.5.5 0 01-.5-.5V12M2.5 7.5h19V12h-19zM12 7.5V21M12 7.5C12 7.5 11 3.5 8 3.5a2 2 0 000 4zM12 7.5C12 7.5 13 3.5 16 3.5a2 2 0 010 4z',
  sparkles:
    'M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9 6.7 19.7l1.1-5.9L3.5 9.7l5.9-.8z',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  camera:
    'M4 8h3l1.5-2.5h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  link: 'M9.5 14.5l5-5M8 11l-2 2a3.5 3.5 0 005 5l2-2M16 13l2-2a3.5 3.5 0 00-5-5l-2 2',
  badge:
    'M12 3l2.3 1.6 2.8-.2 1.1 2.6 2.3 1.6-.8 2.7.8 2.7-2.3 1.6-1.1 2.6-2.8-.2L12 21l-2.3-1.6-2.8.2-1.1-2.6L3.5 15.4l.8-2.7-.8-2.7 2.3-1.6 1.1-2.6 2.8.2zM9 12l2 2 4-4',
  lock: 'M6 10V8a6 6 0 0112 0v2M5 10h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1zM12 14v3',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
  share: 'M12 15V4M8.5 7L12 3.5 15.5 7M6 12v7a1 1 0 001 1h10a1 1 0 001-1v-7',
  heart: 'M12 20s-7-4.5-9.2-9A4.8 4.8 0 0112 5a4.8 4.8 0 019.2 6c-2.2 4.5-9.2 9-9.2 9z',
  bookmark: 'M7 4h10a1 1 0 011 1v15l-6-3.5L6 20V5a1 1 0 011-1z',
  briefcase:
    'M4 8h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1zM9 8V6a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18',
  users:
    'M16 20v-2a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18v2M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1.5a3.5 3.5 0 00-2.6-3.4M16 4.2a3.5 3.5 0 010 6.6',
  file: 'M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9 13h6M9 16h6',
  zap: 'M13 3L5 13h6l-1 8 8-10h-6z',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
  arrowL: 'M19 12H5M11 18l-6-6 6-6',
  arrowUR: 'M7 17L17 7M9 7h8v8',
  refresh: 'M3.5 12a8.5 8.5 0 0114.5-6L21 9M21 4v5h-5M20.5 12A8.5 8.5 0 016 18L3 15M3 20v-5h5',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z',
  message: 'M21 11.5a7.5 7.5 0 01-10.5 6.9L4 20l1.6-4.5A7.5 7.5 0 1121 11.5z',
  edit: 'M4 20h4l10-10-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13',
  moon: 'M21 13A9 9 0 1111 3a7 7 0 0010 10z',
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19',
  store:
    'M4 9l1-5h14l1 5M4 9h16M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M9 20v-6h6v6M4 9a2.5 2.5 0 004 2 2.5 2.5 0 004 0 2.5 2.5 0 004 0 2.5 2.5 0 004-2',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 7.5h.01',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a1.5 1.5 0 001.3 2.2h16.6a1.5 1.5 0 001.3-2.2L13.7 3.9a1.5 1.5 0 00-2.6 0z',
  inbox: 'M4 13h4l1.5 3h5L16 13h4M4 13l2.5-8h11L20 13M4 13v6a1 1 0 001 1h14a1 1 0 001-1v-6',
  dollar: 'M12 3v18M16 7a4 3 0 00-4-2.5C9.8 4.5 8 5.5 8 7.5s2 2.5 4 3 4 1 4 3-1.8 3-4 3a4 3 0 01-4-2.5',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  logout: 'M15 4h3a1 1 0 011 1v14a1 1 0 01-1 1h-3M10 8l-4 4 4 4M6 12h11',
  flag: 'M5 21V4M5 4s2-1 5-1 5 2 8 2v9c-3 0-5-2-8-2s-5 1-5 1',
  rotate: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 4v4h4',
  play: 'M8 5l11 7-11 7z',
  // campaign categories (replaces the old CATEGORY_EMOJI map)
  utensils: 'M7 3v4a2 2 0 004 0V3M9 9v12M16 3c1.8 1.5 1.8 5.5 0 8v10',
  coffee: 'M4 8h12v5a4 4 0 01-4 4H8a4 4 0 01-4-4zM16 9h2.5a2 2 0 010 4H16M8 2.5v2M11.5 2.5v2',
  glass: 'M5 4h14l-7 8zM12 12v7M8 21h8',
  shirt: 'M8 3l-5 3 2 4 2-1v9h10v-9l2 1 2-4-5-3a3 3 0 01-6 0z',
  lipstick: 'M9.5 9h5v11a1 1 0 01-1 1h-3a1 1 0 01-1-1zM9.5 9l1.5-5 3.5-1v6',
  scissors: 'M6.5 4a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM6.5 15a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8.7 7l11.3 10M8.7 17 20 7',
  leaf: 'M4 20c0-8 6-14 16-14 0 9-7 15-16 15zM4 20c2-6 6-9 10-10',
  dumbbell: 'M5 9v6M3 10v4M19 9v6M21 10v4M5 12h14',
  phone: 'M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM10 18h4',
  gamepad: 'M8 10v4M6 12h4M15.5 11h.01M17.5 13h.01M7 8h10a4 4 0 010 8c-1.5 0-2.2-1-3.2-1h-3.6c-1 0-1.7 1-3.2 1a4 4 0 010-8z',
  plane: 'M21 3 3 10.5l7 2.5 2.5 7L21 3zM10 13l4-4',
  sofa: 'M3 14a2 2 0 012-2V8a2 2 0 012-2h10a2 2 0 012 2v4a2 2 0 012 2v4H3zM6 18v2M18 18v2M7 12h10',
  book: 'M5 4a2 2 0 012-2h12v15H7a2 2 0 00-2 2V4zM5 19a2 2 0 012-2h12',
  // niche / format glyphs (onboarding choice tiles)
  cpu: 'M6 6h12v12H6zM9.5 9.5h5v5h-5zM9 2v2.5M15 2v2.5M9 19.5V22M15 19.5V22M2 9h2.5M2 15h2.5M19.5 9H22M19.5 15H22',
  baby: 'M20 13a8 8 0 11-16 0 8 8 0 0116 0zM9.5 12h.01M14.5 12h.01M9.5 15.5a3.2 3.2 0 005 0',
  smile: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 14s1.4 2 3.5 2 3.5-2 3.5-2M9.5 9.5h.01M14.5 9.5h.01',
  music: 'M9 17V5l11-2v12M6.5 20a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM17.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  palette:
    'M12 3a9 9 0 100 18c1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 005-5c0-3.9-4-7-9-7zM7.5 12.5h.01M9.5 8.5h.01M14.5 8.5h.01',
  film: 'M4 9h16v10a1 1 0 01-1 1H5a1 1 0 01-1-1zM4 9l1-4 3.5.9M9 6.2l3.5.9M14 7.1l3.5.9M19 5l1 4',
  video: 'M3 7h12a1 1 0 011 1v3l4-2.5v9L16 14v3a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z',
  story: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8.5v7M8.5 12h7',
} as const;

/** Filled glyphs handled by special cases below (solid fill, no stroke). */
type FilledIconName = 'instagram' | 'youtube' | 'star_f' | 'heart_f' | 'bookmark_f' | 'play_f' | 'dot';

export type IconName = keyof typeof ICON_PATHS | FilledIconName;

export type IconProps = {
  name: IconName;
  /** Square size in px (width = height). Default 22. */
  size?: number;
  /** Stroke/fill color. Defaults to the theme's primary text color (so it stays
   *  legible in both light and dark); pass an explicit color to override. */
  color?: string;
  /** Stroke width for outline glyphs. Default 1.8 (matches the design reference). */
  strokeWidth?: number;
};

/**
 * Render a single icon. Outline glyphs stroke their path; the handful of filled
 * names render solid shapes. Unknown names fall back to `info` so a typo is
 * visible rather than crashing.
 */
export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.text;
  return <IconGlyph name={name} size={size} color={resolvedColor} strokeWidth={strokeWidth} />;
}

/** Internal renderer — `color` is always resolved by the exported `Icon`. */
function IconGlyph({ name, size, color, strokeWidth }: Required<Omit<IconProps, 'color'>> & { color: string }) {
  const base = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const };

  if (name === 'instagram') {
    return (
      <Svg {...base}>
        <Rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke={color} strokeWidth={strokeWidth} />
        <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={strokeWidth} />
        <Circle cx="17.2" cy="6.8" r="1.1" fill={color} />
      </Svg>
    );
  }
  if (name === 'youtube') {
    return (
      <Svg {...base}>
        <Rect x="2.5" y="6" width="19" height="12" rx="3.5" stroke={color} strokeWidth={strokeWidth} />
        <Path d="M10.5 9.5l4 2.5-4 2.5z" fill={color} />
      </Svg>
    );
  }
  if (name === 'star_f') {
    return (
      <Svg {...base}>
        <Path d={ICON_PATHS.star} fill={color} />
      </Svg>
    );
  }
  if (name === 'heart_f') {
    return (
      <Svg {...base}>
        <Path d={ICON_PATHS.heart} fill={color} />
      </Svg>
    );
  }
  if (name === 'bookmark_f') {
    return (
      <Svg {...base}>
        <Path d={ICON_PATHS.bookmark} fill={color} />
      </Svg>
    );
  }
  if (name === 'play_f') {
    return (
      <Svg {...base}>
        <Path d={ICON_PATHS.play} fill={color} />
      </Svg>
    );
  }
  if (name === 'dot') {
    return (
      <Svg {...base}>
        <Circle cx="12" cy="12" r="5" fill={color} />
      </Svg>
    );
  }

  const d = ICON_PATHS[name as keyof typeof ICON_PATHS] ?? ICON_PATHS.info;
  return (
    <Svg {...base}>
      <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
