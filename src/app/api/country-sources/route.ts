import { NextResponse } from "next/server";
import { getCountryByCode, getEventById } from "@/lib/data";
import { CATEGORY_QUERIES } from "@/lib/external/gnews";
import { recordGNewsCall } from "@/lib/external/gnewsUsage";
import type { CountryCode } from "@/types";

const GNEWS_ENDPOINT = "https://gnews.io/api/v4/search";

const VALID_COUNTRY_CODES: CountryCode[] = ["NL", "US", "RU", "CN", "IN", "IR", "UA", "DE"];

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

async function fetchRawArticles(
  params: URLSearchParams,
  apiKey: string,
  context: string
): Promise<RawGNewsArticle[]> {
  params.set("apikey", apiKey);
  try {
    recordGNewsCall(context);
    const response = await fetch(`${GNEWS_ENDPOINT}?${params.toString()}`, {
      next: { revalidate: 86400, tags: ["country-sources"] },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { articles?: RawGNewsArticle[] };
    return data.articles ?? [];
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const countryParam = searchParams.get("country");

  if (!eventId || !countryParam || !VALID_COUNTRY_CODES.includes(countryParam as CountryCode)) {
    return NextResponse.json({ articles: [] }, { status: 400 });
  }
  const country = countryParam as CountryCode;

  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return NextResponse.json({ articles: [] });

  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ articles: [] }, { status: 404 });

  // Reuse the same category phrase query that reliably surfaced the main
  // event in the first place, rather than the exact article headline —
  // the full headline combined with a country filter is narrow enough
  // that it frequently matched zero articles in testing.
  const query = CATEGORY_QUERIES[event.category];

  let rawArticles = await fetchRawArticles(
    buildStrictParams(query, country),
    apiKey,
    `country-sources:${country}:strict`
  );
  let tier: CoverageTier = "from-country";

  if (rawArticles.length === 0) {
    const countryRecord = await getCountryByCode(country);
    if (countryRecord) {
      const fallbackArticles = await fetchRawArticles(
        buildFallbackParams(query, countryRecord.name),
        apiKey,
        `country-sources:${country}:fallback`
      );
      rawArticles = fallbackArticles.filter((article) =>
        matchesFallbackTier(article, countryRecord.name)
      );
      tier = "mentioning-country";
    }
  }

  const articles = rawArticles.map(toCountrySourceArticle);
  return NextResponse.json({ articles, tier });
}
