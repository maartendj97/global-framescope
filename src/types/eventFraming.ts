import type { CountryCode } from "./country";
import type { ToneCategory } from "./framing";

// How confident the underlying article data actually was, for a given
// country's framing — the weakest tier used across the articles it's
// based on. Never let the AI claim full-text-level nuance for a country
// whose only input was a headline; the model must scale what it claims
// to what it was actually shown. See src/lib/external/articleExtractor.ts.
export type ContentTier = "full-text" | "description" | "headline-only";

// AI-generated (not hand-curated) — a deliberately leaner shape than
// CountryFraming (src/types/framing.ts), which is mock-demo-only and
// includes fields (terminology, highlighted, omitted) that headline/
// description/extracted-text input can't honestly support. Keeping this
// as its own type avoids coupling the real-data path to CountryPerspective,
// which expects the fuller mock shape.
export type EventCountryFraming = {
  eventId: string;
  countryCode: CountryCode;
  mainFrame: string;
  toneCategory: ToneCategory;
  keyEmphasis: string[];
  mainNarrative: string;
  contentTier: ContentTier;
};

export type EventKeyDifference = {
  eventId: string;
  title: string;
  description: string;
  countryCodes: CountryCode[];
};

export type EventFramingResult = {
  framings: EventCountryFraming[];
  differences: EventKeyDifference[];
};
