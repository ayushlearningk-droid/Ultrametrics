/**
 * Ultrametrics shared motion system (Phase 1).
 *
 * One source of truth for the product's motion language: subtle, premium,
 * Linear/Arc/Vercel-inspired. Tween-only — no springs, no bounce, no
 * overshoot. All durations sit between 150ms and 300ms and use a single
 * ease-out curve.
 *
 * Reduced motion: variants here are static objects, so components that use
 * them gate enter animations with framer-motion's `useReducedMotion()` (pass
 * `initial={reduce ? false : "hidden"}`), collapsing transforms for users who
 * request reduced motion.
 */

import type { Variants } from "framer-motion";

/** Single ease-out curve (no overshoot) shared by every variant. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Duration scale, in seconds. Bounded to the 150ms–300ms window. */
export const DUR = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
} as const;

/** Opacity-only entrance. Backdrops, scrims, reduced-motion fallback. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/** Fade + small upward translate. Lists, nav items, content panels. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: 8, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/** Fade + subtle scale/drop. Floating surfaces landing (command palette). */
export const settle: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DUR.base, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: DUR.fast, ease: EASE_OUT },
  },
};

/** Fade + gentle rise. Per-card entrance inside a staggered container. */
export const elevate: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
};

/** Container that staggers its direct children's entrance. */
export const staggerChildren: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.03 },
  },
};
