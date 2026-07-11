import type { EventCategory } from "@/types";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  conflict: "Conflict",
  climate: "Climate",
  diplomacy: "Diplomacy",
};

// Local editorial-style placeholder illustrations, one per category. Fixed
// dark navy backgrounds so they read as a "photo" in both light and dark
// UI themes rather than flipping pale with the surrounding theme.
export const CATEGORY_IMAGES: Record<EventCategory, string> = {
  conflict: "/images/events/conflict.svg",
  climate: "/images/events/climate.svg",
  diplomacy: "/images/events/diplomacy.svg",
};

export function formatEventDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}
