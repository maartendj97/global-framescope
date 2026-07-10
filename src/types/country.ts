export type CountryCode = "NL" | "US" | "RU" | "CN" | "IN" | "IR" | "UA";

export interface Country {
  code: CountryCode;
  name: string;
  flagEmoji: string;
}
