import { isOverDailyBudget, recordNewsDataCall } from "./newsdataUsage";
import { isSanctionedPublisher } from "./blockedPublishers";
import type { CountryCode, CountrySourceArticle } from "@/types";

// Second aggregator for per-country coverage (see fetchCountryCoverage in
// src/app/api/country-sources/route.ts), tried when GNews's strict
// country filter comes back empty. Added specifically because GNews's
// India coverage was thin — NewsData.io indexes more Indian outlets — but
// it slots in as a general extra "from-country" tier for every country,
// same backup role Currents plays for the events pool. Dormant until
// NEWSDATA_API_KEY is set.
const NEWSDATA_ENDPOINT = "https://newsdata.io/api/1/latest";

// NewsData.io uses the same lowercase ISO-3166 country codes as GNews for
// all 8 of our countries (verified against their country-code list).
function toNewsDataCountry(code: CountryCode): string {
  return code.toLowerCase();
}

type NewsDataArticle = {
  title: string;
  link: string;
  description: string | null;
  pubDate: string;
  source_id: string;
  source_name?: string;
};

function toCountrySourceArticle(article: NewsDataArticle): CountrySourceArticle {
  return {
    title: article.title,
    url: article.link,
    publisher: article.source_name || article.source_id,
    // pubDate is "YYYY-MM-DD HH:mm:ss" (UTC, space-separated, no "T") —
    // slicing the first 10 chars still yields the plain date.
    publishedAt: article.pubDate.slice(0, 10),
    description: article.description || undefined,
  };
}

export async function fetchNewsDataCountryCoverage(
  country: CountryCode,
  query: string,
  context: string
): Promise<CountrySourceArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  if (await isOverDailyBudget()) {
    console.log(`[newsdata] skipped (daily budget guard) — ${context}`);
    return [];
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    q: query,
    country: toNewsDataCountry(country),
    language: "en",
  });

  try {
    await recordNewsDataCall(context);
    const response = await fetch(`${NEWSDATA_ENDPOINT}?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`[newsdata] ${context} responded ${response.status}`);
      return [];
    }
    const data = (await response.json()) as { results?: NewsDataArticle[] };
    const articles = (data.results ?? []).filter(
      (article) => !isSanctionedPublisher(article.source_name || article.source_id)
    );
    return articles.slice(0, 5).map(toCountrySourceArticle);
  } catch (error) {
    console.error(`[newsdata] ${context} fetch failed:`, error);
    return [];
  }
}
