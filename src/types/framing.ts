import type { CountryCode } from "./country";

export type ToneCategory =
  | "concerned"
  | "cautious"
  | "critical"
  | "neutral"
  | "balanced"
  | "supportive";

export interface CountryFraming {
  eventId: string;
  countryCode: CountryCode;
  mainFrame: string;
  toneCategory: ToneCategory;
  mainNarrative: string;
  keyEmphasis: string[];
  tone: string;
  terminology: string[];
  highlighted: string[];
  omitted: string[];
  sourceIds: string[];
}
