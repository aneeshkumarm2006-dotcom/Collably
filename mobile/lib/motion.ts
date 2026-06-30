/**
 * Shared motion language — one spring "personality" across the whole app so press
 * feedback, list entrances, and the celebration all feel tuned in unison (and
 * match the cinematic onboarding's existing feel). Import these instead of
 * hand-tuning springs per component.
 */
import type { WithSpringConfig } from 'react-native-reanimated';

/** Tactile press feedback (cards, buttons, tiles) — quick, lightly damped. */
export const PRESS_SPRING: WithSpringConfig = { damping: 18, stiffness: 320, mass: 0.6 };

/** Entrances / hero landings (celebration card, reveals) — a softer settle. */
export const ENTER_SPRING: WithSpringConfig = { damping: 15, stiffness: 180 };

/** Default scale a surface shrinks to while pressed. */
export const PRESS_SCALE = 0.97;

/** Per-item stagger for list entrances (ms), and the cap so long lists don't crawl. */
export const STAGGER_MS = 45;
export const STAGGER_CAP = 6;
