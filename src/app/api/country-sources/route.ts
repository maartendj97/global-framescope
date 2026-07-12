import { NextResponse } from "next/server";
import { getCountries, getCountryByCode, getEventById } from "@/lib/data";
import { CATEGORY_QUERIES } from "@/lib/external/gnews";
import { recordGNewsCall } from "@/lib/external/gnewsUsage";
import type { CountryCode, Event } from "@/types";

const GNEWS_ENDPOINT = "https://gnews.io/api/v4/search";

// GNews's ISO country codes are lowercase and don't always match our
// 2-letter codes 1:1 (e.g. Iran's ccTLD/ISO code differs from a naive
// lowercase of "IR" in some providers) — GNews specifically uses "ir"
// for Iran, so a direct lowercase mapping works for all 8 of our codes.
function toGNewsCountry(code: CountryCode): string {
  return code.toLowerCase();
}

export type CountrySourceArticle = {
  title: string;
  url: string;
  publisher: string;
  publishedAt: string;
};

// "from-country": outlets headquartered in that country (GNews country=
// filter) — the strong signal. "mentioning-country": a broader fallback
// when that filter finds nothing, searching for the country's name
// instead — a weaker but still honest signal, labeled differently in
// the UI so it's never confused with real local press coverage.
export type CoverageTier = "from-country" | "mentioning-country";

type RawGNewsArticle = {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
};

type CachedCoverage = { articles: RawGNewsArticle[]; expiresAt: number };

// Route Handlers in this Next.js version are not cached by default (see
// node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md),
// and `force-static` isn't usable here since the response must vary per
// eventId/country — so the `next: { revalidate }` this used to pass never
// actually cached anything (confirmed: two back-to-back requests for the
// same event both took the full ~18s, meaning both hit GNews for real).
// This in-memory Map is an explicit replacement — same "best-effort,
// single-instance" caveat as gnewsUsage.ts (resets on cold start, not
// shared across concurrent instances), but it actually works.
const coverageCache = new Map<string, CachedCoverage>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchRawArticles(
  params: URLSearchParams,
  apiKey: string,
  context: string,
  throttle: () => Promise<void>
): Promise<RawGNewsArticle[]> {
  params.set("apikey", apiKey);
  const url = `${GNEWS_ENDPOINT}?${params.toString()}`;

  const cached = coverageCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.articles;
  }

  try {
    // Only throttle (and count) real network calls — a cache hit above
    // already returned, so it never pays the inter-call delay or shows
    // up in the GNews usage log.
    await throttle();
    recordGNewsCall(context);
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];
    const data = (await response.json()) as { articles?: RawGNewsArticle[] };
    const articles = data.articles ?? [];
    coverageCache.set(url, { articles, expiresAt: Date.now() + CACHE_TTL_MS });
    return articles;
  } catch {
    return [];
  }
}

function toCountrySourceArticle(article: RawGNewsArticle): CountrySourceArticle {
  return {
    title: article.title,
    url: article.url,
    publisher: article.source.name,
    publishedAt: article.publishedAt.slice(0, 10),
  };
}

function buildStrictParams(query: string, country: CountryCode): URLSearchParams {
  return new URLSearchParams({
    q: query,
    lang: "en",
    country: toGNewsCountry(country),
    max: "5",
    sortby: "publishedAt",
  });
}

function buildFallbackParams(query: string, countryName: string): URLSearchParams {
  return new URLSearchParams({
    q: `${query} AND "${countryName}"`,
    lang: "en",
    max: "5",
    sortby: "publishedAt",
  });
}

// GNews's full-text search matches the country name anywhere in the
// article (including body text), which surfaced weak, tangential hits in
// testing — e.g. an Australian outlet's Iran story that mentioned
// "Netherlands" once in passing, shown as if it were Dutch-relevant
// coverage. Requiring the name in the title or description (not just the
// indexed body) keeps only genuinely on-topic matches. `description` is
// `null`/optional on some articles — the `?? ""` guard is load-bearing,
// not defensive filler (see the e54b1c2 regression this fixes).
export function matchesFallbackTier(
  article: { title: string; description: string | null },
  countryName: string
): boolean {
  const nameLower = countryName.toLowerCase();
  return (
    article.title.toLowerCase().includes(nameLower) ||
    (article.description ?? "").toLowerCase().includes(nameLower)
  );
}

export type CountryCoverageResult = { articles: CountrySourceArticle[]; tier: CoverageTier };

// Reusable per-country strict-then-fallback lookup, shared by this route's
// single-country GET handler and /api/event-sources' 8-country aggregation.
// `throttle` lets callers space out GNews calls when making several in one
// request (GNews's free tier rejects calls fired within ~1.1s of each
// other, even sequential ones) — the default no-op preserves this route's
// original zero-added-latency single-tap behavior.
export async function fetchCountryCoverage(
  event: Event,
  country: CountryCode,
  apiKey: string,
  contextPrefix: string,
  throttle: () => Promise<void> = async () => {}
): Promise<CountryCoverageResult> {
  // Reuse the same category phrase query that reliably surfaced the main
  // event in the first place, rather than the exact article headline —
  // the full headline combined with a country filter is narrow enough
  // that it frequently matched zero articles in testing.
  const query = CATEGORY_QUERIES[event.category];

  // throttle is passed down into fetchRawArticles rather than awaited
  // here, so it only delays actual cache-miss network calls — a cached
  // country's lookup returns immediately, with no artificial wait.
  let rawArticles = await fetchRawArticles(
    buildStrictParams(query, country),
    apiKey,
    `${contextPrefix}:${country}:strict`,
    throttle
  );
  let tier: CoverageTier = "from-country";

  if (rawArticles.length === 0) {
    const countryRecord = await getCountryByCode(country);
    if (countryRecord) {
      const fallbackArticles = await fetchRawArticles(
        buildFallbackParams(query, countryRecord.name),
        apiKey,
        `${contextPrefix}:${country}:fallback`,
        throttle
      );
      rawArticles = fallbackArticles.filter((article) =>
        matchesFallbackTier(article, countryRecord.name)
      );
      tier = "mentioning-country";
    }
  }

  return { articles: rawArticles.map(toCountrySourceArticle), tier };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const countryParam = searchParams.get("country");

  const validCodes = new Set((await getCountries()).map((c) => c.code));
  if (!eventId || !countryParam || !validCodes.has(countryParam as CountryCode)) {
    return NextResponse.json({ articles: [] }, { status: 400 });
  }
  const country = countryParam as CountryCode;

  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return NextResponse.json({ articles: [] });

  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ articles: [] }, { status: 404 });

  const { articles, tier } = await fetchCountryCoverage(event, country, apiKey, "country-sources");
  return NextResponse.json({ articles, tier });
}
