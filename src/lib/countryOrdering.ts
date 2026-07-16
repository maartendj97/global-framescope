import type { Country, CountryCode, Event } from "@/types";

// "Most interesting first" ordering for the Countries tab, computed
// entirely from the event's own text so the list renders instantly —
// no coverage fetch, no network wait (the whole point of replacing the
// old aggregate /api/event-sources call).
//
// Rank groups, most interesting first:
//   0. Countries directly involved in the story — their name, demonym,
//      or capital appears in the headline or summary.
//   1. The state-media perspectives (Russia, China, Iran) — the most
//      contrasting framing vs. Western coverage, which is the product's
//      core comparison.
//   2. The Netherlands — the home lens.
//   3. Everyone else, in their existing catalog order.
// Within a group the original countries[] order is preserved (sort is
// stable), so results are deterministic.

// Word-boundary-matched keywords per country. Deliberately short lists:
// name + demonym + capital/seat-of-power covers how headlines actually
// reference a country. All matching is lowercase.
const COUNTRY_KEYWORDS: Record<CountryCode, string[]> = {
  NL: ["netherlands", "dutch", "the hague", "amsterdam"],
  US: ["united states", "u.s.", "us", "american", "america", "washington", "pentagon", "white house"],
  RU: ["russia", "russian", "moscow", "kremlin", "putin"],
  CN: ["china", "chinese", "beijing"],
  IN: ["india", "indian", "new delhi", "modi"],
  IR: ["iran", "iranian", "tehran"],
  UA: ["ukraine", "ukrainian", "kyiv", "zelensky", "zelenskyy"],
  DE: ["germany", "german", "berlin"],
};

const CONTRAST_COUNTRIES = new Set<CountryCode>(["RU", "CN", "IR"]);
const HOME_COUNTRY: CountryCode = "NL";

function escapeRegExp(keyword: string): string {
  return keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary match so "us" never fires inside "focus" or "using".
// "u.s." needs the escaped-dot form, which the escape above handles.
function textMentions(text: string, keyword: string): boolean {
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(keyword)}(?:[^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

export function isInvolvedInEvent(code: CountryCode, event: Event): boolean {
  const text = `${event.title} ${event.summary}`.toLowerCase();
  return COUNTRY_KEYWORDS[code].some((keyword) => textMentions(text, keyword));
}

function rank(code: CountryCode, event: Event): number {
  if (isInvolvedInEvent(code, event)) return 0;
  if (CONTRAST_COUNTRIES.has(code)) return 1;
  if (code === HOME_COUNTRY) return 2;
  return 3;
}

export function orderCountriesByInterest(countries: Country[], event: Event): Country[] {
  return [...countries].sort((a, b) => rank(a.code, event) - rank(b.code, event));
}
