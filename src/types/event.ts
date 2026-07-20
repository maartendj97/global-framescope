import type { CountryCode } from "./country";

export type EventCategory =
  | "conflict"
  | "climate"
  | "diplomacy"
  | "elections"
  | "trade"
  | "humanitarian";

// Single source of truth for iterating every category (filter chips, GNews
// query fan-out, etc.) so adding a category can't silently miss one of them.
export const ALL_CATEGORIES: EventCategory[] = [
  "conflict",
  "climate",
  "diplomacy",
  "elections",
  "trade",
  "humanitarian",
];

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  summary: string;
  context: string;
  availableCountries: CountryCode[];
  // Present for real (GNews-fetched) events when the source article
  // included a thumbnail; absent for mock events, which always use the
  // category illustration instead.
  imageUrl?: string;
  // Present for real (GNews-fetched) events: every distinct publisher
  // whose article was clustered into this event (see clusterArticles in
  // src/lib/external/gnews.ts). Absent for mock events, which use the
  // static per-event Source records instead.
  sources?: { publisher: string; url: string }[];
}
