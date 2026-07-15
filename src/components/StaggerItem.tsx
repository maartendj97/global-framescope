"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { getFadeSlideVariants, getStaggerTransition, useReducedMotion } from "@/lib/motionConfig";

type StaggerItemProps = {
  index: number;
  children: ReactNode;
};

// Wraps one row/card in a list so it fades and slides in on mount,
// staggered by its position — shared across Home, Events, and Countries
// so every list in the app uses the same motion vocabulary and the same
// reduced-motion fallback (see src/lib/motionConfig.ts).
export function StaggerItem({ index, children }: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      variants={getFadeSlideVariants(prefersReducedMotion)}
      initial="hidden"
      animate="visible"
      transition={getStaggerTransition(index, prefersReducedMotion)}
    >
      {children}
    </motion.div>
  );
}
