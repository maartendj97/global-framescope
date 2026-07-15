// The single source of truth for which countries the app covers — the
// mock country records and both news sources derive from this list, so
// adding a country here is the one place the set changes.
export const ALL_COUNTRY_CODES = ["NL", "US", "RU", "CN", "IN", "IR", "UA", "DE"] as const;

export type CountryCode = (typeof ALL_COUNTRY_CODES)[number];

export interface Country {
  code: CountryCode;
  name: string;
  flagEmoji: string;
}
