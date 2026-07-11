import type { CountryCode } from "./country";

export type EventCategory = "conflict" | "climate" | "diplomacy";

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
}
