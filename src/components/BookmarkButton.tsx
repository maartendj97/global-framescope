"use client";

import { motion } from "motion/react";
import { toggleBookmark, useBookmarkedIds } from "@/lib/bookmarks";
import { getTransition, TAP_SCALE_STRONG, useReducedMotion } from "@/lib/motionConfig";
import { BookmarkIcon } from "./icons";

type BookmarkButtonProps = {
  eventId: string;
  variant?: "overlay" | "plain";
  className?: string;
};

const VARIANT_CLASSES = {
  overlay: "bg-black/40 text-white backdrop-blur-sm hover:bg-black/55",
  plain: "text-muted-foreground hover:text-foreground",
};

export function BookmarkButton({
  eventId,
  variant = "overlay",
  className,
}: BookmarkButtonProps) {
  const bookmarkedIds = useBookmarkedIds();
  const bookmarked = bookmarkedIds.includes(eventId);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleBookmark(eventId);
      }}
      whileTap={{ scale: TAP_SCALE_STRONG }}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Save event"}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
    >
      <motion.span
        key={bookmarked ? "filled" : "empty"}
        className="inline-flex"
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={getTransition(prefersReducedMotion)}
      >
        <BookmarkIcon filled={bookmarked} className="h-4 w-4" />
      </motion.span>
    </motion.button>
  );
}
