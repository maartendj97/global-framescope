import type { CountryCode } from "./country";

export interface KeyDifference {
  eventId: string;
  title: string;
  description: string;
  countryCodes: CountryCode[];
}
