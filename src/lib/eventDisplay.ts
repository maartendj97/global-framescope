import type { Event, EventCategory } from "@/types";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  conflict: "Conflict",
  climate: "Climate",
  diplomacy: "Diplomacy",
  elections: "Elections",
  trade: "Trade",
  humanitarian: "Humanitarian",
};

// Local editorial-style placeholder illustrations, one per category. Fixed
// dark navy backgrounds so they read as a "photo" in both light and dark
// UI themes rather than flipping pale with the surrounding theme.
export const CATEGORY_IMAGES: Record<EventCategory, string> = {
  conflict: "/images/events/conflict.svg",
  climate: "/images/events/climate.svg",
  diplomacy: "/images/events/diplomacy.svg",
  elections: "/images/events/elections.svg",
  trade: "/images/events/trade.svg",
  humanitarian: "/images/events/humanitarian.svg",
};

// Real events carry the source article's own thumbnail when GNews
// provided one; mock events (and real events without one) fall back to
// the category illustration. External thumbnails come from arbitrary
// news domains, so they're rendered unoptimized rather than requiring
// an allowlist of every possible publisher hostname.
export function getEventImageSrc(event: Event): string {
  return event.imageUrl ?? CATEGORY_IMAGES[event.category];
}

export function isExternalEventImage(event: Event): boolean {
  return Boolean(event.imageUrl);
}

export function formatEventDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}

// "Today"/"Yesterday"/"N days ago" for recent dates, falling back to the
// full formatted date once it's old enough that relative phrasing stops
// being more useful than the date itself.
export function formatRelativeOrDate(isoDate: string): string {
  const daysAgo = Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return `${daysAgo} days ago`;
  return formatEventDate(isoDate);
}
