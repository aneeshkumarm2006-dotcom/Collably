/**
 * Shared motion language — one spring "personality" across the whole app so press
 * feedback, list entrances, and the celebration all feel tuned in unison (and
 * match the cinematic onboarding's existing feel). Import these instead of
 * hand-tuning springs per component.
 */
import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/** Tactile press feedback (cards, buttons, tiles) — quick, lightly damped. */
export const PRESS_SPRING: WithSpringConfig = { damping: 18, stiffness: 320, mass: 0.6 };

/** Entrances / hero landings (celebration card, reveals) — a softer settle. */
export const ENTER_SPRING: WithSpringConfig = { damping: 15, stiffness: 180 };

/** The brand mark settling into place — a touch more overshoot than ENTER. */
export const BRAND_SPRING: WithSpringConfig = { damping: 13, stiffness: 190, mass: 0.9 };

/** Default scale a surface shrinks to while pressed. */
export const PRESS_SCALE = 0.97;

/** Per-item stagger for list entrances (ms), and the cap so long lists don't crawl. */
export const STAGGER_MS = 45;
export const STAGGER_CAP = 6;

// --- Durations ----------------------------------------------------------------

/**
 * One duration scale for the whole app. Anything that isn't a spring picks from
 * here, so the app shares a single rhythm rather than 30 hand-typed magic numbers.
 *
 * Exits are deliberately shorter than entrances (~65%): a surface leaving should
 * get out of the way immediately, while one arriving can afford to be graceful.
 */
export const DURATION = {
  /** Colour / opacity flips that should feel instant. */
  instant: 120,
  /** Standard micro-interaction (chip select, toast in). */
  fast: 180,
  /** The default for most entrances. */
  base: 260,
  /** Larger surfaces, header content. */
  slow: 380,
  /** The brand mark drawing itself on. */
  brand: 560,
} as const;

/** Exits run at ~65% of their entrance so dismissal never feels sluggish. */
export const EXIT_RATIO = 0.65;

// --- Easings ------------------------------------------------------------------

/**
 * Entering elements decelerate (ease-out): they arrive fast and settle. Exiting
 * elements accelerate away (ease-in). Linear is never right for UI — it reads as
 * mechanical — so it isn't offered here.
 */
export const EASE = {
  /** Entrances — the workhorse. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** Exits. */
  in: Easing.bezier(0.4, 0, 1, 1),
  /** Moves that both start and end at rest (a bar filling, a scrub settling). */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
} as const;

// --- Text reveal --------------------------------------------------------------

/**
 * Greeting reveal stagger, per **word**.
 *
 * Deliberately not per-character: splitting a string by character shatters
 * Devanagari/Tamil grapheme clusters and cuts emoji (👋 is a surrogate pair) in
 * half. Words are safe in every script the app ships in.
 */
export const WORD_STAGGER_MS = 60;
