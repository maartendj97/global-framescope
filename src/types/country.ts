export type CountryCode = "NL" | "US" | "RU" | "CN" | "IN" | "IR" | "UA" | "DE";

export interface Country {
  code: CountryCode;
  name: string;
  flagEmoji: string;
}
