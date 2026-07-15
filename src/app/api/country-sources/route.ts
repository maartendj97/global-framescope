import { NextResponse } from "next/server";
import { getCountries, getCountryByCode, getEventById } from "@/lib/data";
import { CATEGORY_QUERIES } from "@/lib/external/gnews";
import { getCached, setCached } from "@/lib/cache";
import { isSanctionedPublisher } from "@/lib/external/blockedPublishers";
import { isOverDailyBudget, recordGNewsCall } from "@/lib/external/gnewsUsage";
import { fetchStateMediaCoverage, STATE_MEDIA_COUNTRIES } from "@/lib/external/stateFeeds";
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

type RawGNewsArticle = {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
};

type CachedCoverage = { articles: RawGNewsArticle[]; expiresAt: number };

// Two cache layers. The in-memory Map is the fast per-instance layer
// (and the only one in local dev); Redis is the durable layer shared by
// every server instance, so a coverage lookup anyone triggered within
// the last 24h costs zero GNews calls for everyone. Next's own fetch
// cache was confirmed not to work on this setup, so these are the real
// caches.
const coverageCache = new Map<string, CachedCoverage>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_SECONDS = 24 * 60 * 60;

async function fetchRawArticles(
  params: URLSearchParams,
  apiKey: string,
  context: string,
  throttle: () => Promise<void>
): Promise<RawGNewsArticle[]> {
  // The cache key is built before the API key is added to the request,
  // so the secret never ends up inside cache keys.
  const cacheKey = `coverage:v1:${params.toString()}`;
  params.set("apikey", apiKey);
  const url = `${GNEWS_ENDPOINT}?${params.toString()}`;

  const memoryCached = coverageCache.get(cacheKey);
  if (memoryCached && memoryCached.expiresAt > Date.now()) {
    return memoryCached.articles;
  }

  const redisCached = await getCached<RawGNewsArticle[]>(cacheKey);
  if (redisCached) {
    coverageCache.set(cacheKey, {
      articles: redisCached,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return redisCached;
  }

  // Hard safety backstop: refuse further real GNews calls once today's
  // count nears the free-tier cap, so an enhancement feature can't
  // silently exhaust the budget the baseline events-pool refresh
  // depends on. Degrades to an empty result rather than erroring, same
  // as an actual GNews outage.
  if (await isOverDailyBudget()) {
    console.log(`[gnews] skipped (daily budget guard) — ${context}`);
    return [];
  }

  try {
    // Only throttle (and count) real network calls — a cache hit above
    // already returned, so it never pays the inter-call delay or shows
    // up in the GNews usage log.
    await throttle();
    await recordGNewsCall(context);
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      console.error(`[gnews] ${context} responded ${response.status}`);
      return [];
    }
    const data = (await response.json()) as { articles?: RawGNewsArticle[] };
    // EU-sanctioned outlets (RT, Sputnik) are dropped before caching, so
    // they can't reach the Countries tab or the aggregated Sources tab.
    const articles = (data.articles ?? []).filter(
      (article) => !isSanctionedPublisher(article.source.name)
    );
    coverageCache.set(cacheKey, { articles, expiresAt: Date.now() + CACHE_TTL_MS });
    await setCached(cacheKey, articles, CACHE_TTL_SECONDS);
    return articles;
  } catch (error) {
    console.error(`[gnews] ${context} fetch failed:`, error);
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

// Reusable per-country lookup, shared by this route's single-country GET
// handler and /api/event-sources' 8-country aggregation. Order of
// preference:
//   1. Direct state-outlet RSS feeds (Russia/China/Iran only) — free,
//      no GNews budget, and the honest "state media" signal the product
//      is built around.
//   2. GNews strict country search (needs an API key).
//   3. GNews broader "mentions the country" fallback, when enabled.
// `throttle` lets callers space out GNews calls when making several in one
// request (GNews's free tier rejects calls fired within ~1.1s of each
// other, even sequential ones) — the default no-op preserves this route's
// original zero-added-latency single-tap behavior. `includeFallbackTier`
// defaults to true (this route's original single-tap behavior, where one
// extra call for one country is cheap); /api/event-sources passes false
// to halve its worst-case per-event call count (8 vs 16), since a single
// aggregated view multiplies this cost across all 8 countries at once.
export async function fetchCountryCoverage(
  event: Event,
  country: CountryCode,
  apiKey: string | null,
  contextPrefix: string,
  throttle: () => Promise<void> = async () => {},
  includeFallbackTier: boolean = true
): Promise<CountryCoverageResult> {
  if (STATE_MEDIA_COUNTRIES.has(country)) {
    const stateArticles = await fetchStateMediaCoverage(country, event);
    if (stateArticles.length > 0) {
      return { articles: stateArticles, tier: "from-country" };
    }
  }

  if (!apiKey) return { articles: [], tier: "from-country" };

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

  if (rawArticles.length === 0 && includeFallbackTier) {
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

  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ articles: [] }, { status: 404 });

  // No early-return when the GNews key is missing: state-outlet feeds
  // (Russia/China/Iran) don't need it, so those countries still get
  // real coverage; the others degrade to an empty list inside
  // fetchCountryCoverage.
  const apiKey = process.env.GNEWS_API_KEY ?? null;

  const { articles, tier } = await fetchCountryCoverage(event, country, apiKey, "country-sources");
  return NextResponse.json({ articles, tier });
}
