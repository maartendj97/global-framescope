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
}
