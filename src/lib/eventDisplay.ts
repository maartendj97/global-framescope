import type { EventCategory } from "@/types";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  conflict: "Conflict",
  climate: "Climate",
  diplomacy: "Diplomacy",
};

// Fixed (non-theme-reactive) navy shades: a placeholder "photo" should stay
// dark and moody in both light and dark UI themes, the way a real photo
// would — not flip pale when --foreground swaps to light text color.
export const CATEGORY_GRADIENTS: Record<EventCategory, string> = {
  conflict: "linear-gradient(135deg, #0d1b2a 0%, #0d1b2a 60%, #d4af37 150%)",
  climate: "linear-gradient(135deg, #d4af37 0%, #0d1b2a 70%)",
  diplomacy: "linear-gradient(160deg, #0d1b2a 0%, #1b263b 100%)",
};

export function formatEventDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}
