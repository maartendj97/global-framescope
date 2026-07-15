"use client";

import { useReducedMotion } from "motion/react";
import type { Transition, Variants } from "motion/react";

// Shared motion vocabulary for the app's small, intentional set of micro-
// interactions (see docs/UI_DESIGN.md "Motion"). Every animated component
// reads its timing from here instead of inventing its own duration/easing,
// and every helper collapses to instant when the user prefers reduced
// motion — handled once, here, rather than re-checked in each component.

const STANDARD_DURATION = 0.18;
const STAGGER_DELAY = 0.04;

export { useReducedMotion };

export function getTransition(prefersReducedMotion: boolean | null): Transition {
  return prefersReducedMotion
    ? { duration: 0 }
    : { duration: STANDARD_DURATION, ease: "easeOut" };
}

// For layoutId-tracked elements (sliding pill/thumb) — a spring feels right
// for position/size tracking, tuned with enough damping to avoid overshoot
// given the app's calm, editorial character.
export function getLayoutTransition(prefersReducedMotion: boolean | null): Transition {
  return prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 380, damping: 30, mass: 0.8 };
}

export function getStaggerTransition(
  index: number,
  prefersReducedMotion: boolean | null
): Transition {
  return prefersReducedMotion
    ? { duration: 0 }
    : { duration: STANDARD_DURATION, ease: "easeOut", delay: index * STAGGER_DELAY };
}

export function getFadeSlideVariants(prefersReducedMotion: boolean | null): Variants {
  return prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } };
}

export const TAP_SCALE_SUBTLE = 0.98;
export const TAP_SCALE_STRONG = 0.85;
