import type { CountryCode } from "./country";

// Shared between the API routes and the news-source integrations
// (src/lib/external/) that produce these articles — lives here rather
// than inside an app/api route file so lib modules don't depend on app
// routes.
export type CountrySourceArticle = {
  title: string;
  url: string;
  publisher: string;
  publishedAt: string;
  // A short (usually 1-2 sentence) snippet from the source provider —
  // GNews's `description` or an RSS item's `contentSnippet`. Not always
  // present. Richer than the title alone, but still not full article text.
  description?: string;
  // Set at ingestion for articles that came directly from a state-run
  // outlet's own feed (see stateFeeds.ts); aggregator articles omit it.
  sourceType?: "state-media";
};

// "from-country": outlets headquartered in that country (GNews country=
// filter) — the strong signal. "mentioning-country": a broader fallback
// when that filter finds nothing, searching for the country's name
// instead — a weaker but still honest signal, labeled differently in
// the UI so it's never confused with real local press coverage.
export type CoverageTier = "from-country" | "mentioning-country";

export type CountryCoverageResult = { articles: CountrySourceArticle[]; tier: CoverageTier };

export type EventSourceArticle = CountrySourceArticle & {
  countryCode: CountryCode;
  tier: CoverageTier;
};
