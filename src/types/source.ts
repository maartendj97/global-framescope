import type { CountryCode } from "./country";

export type SourceType =
  | "newspaper"
  | "broadcast"
  | "wire-service"
  | "state-media"
  | "online";

export interface Source {
  id: string;
  eventId: string;
  title: string;
  publisher: string;
  countryCode: CountryCode;
  sourceType: SourceType;
  publishedAt: string;
  url?: string;
}
