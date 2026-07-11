import { NextResponse } from "next/server";
import { getCountryByCode, getEventById } from "@/lib/data";
import { CATEGORY_QUERIES } from "@/lib/external/gnews";
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

async function fetchGNewsArticles(
  params: URLSearchParams,
  apiKey: string
): Promise<CountrySourceArticle[]> {
  params.set("apikey", apiKey);
  try {
    const response = await fetch(`${GNEWS_ENDPOINT}?${params.toString()}`, {
      next: { revalidate: 86400, tags: ["country-sources"] },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      articles?: Array<{ title: string; url: string; publishedAt: string; source: { name: string } }>;
    };
    return (data.articles ?? []).map((article) => ({
      title: article.title,
      url: article.url,
      publisher: article.source.name,
      publishedAt: article.publishedAt.slice(0, 10),
    }));
  } catch {
    return [];
  }
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

  let articles = await fetchGNewsArticles(buildStrictParams(query, country), apiKey);
  let tier: CoverageTier = "from-country";

  if (articles.length === 0) {
    const countryRecord = await getCountryByCode(country);
    if (countryRecord) {
      articles = await fetchGNewsArticles(buildFallbackParams(query, countryRecord.name), apiKey);
      tier = "mentioning-country";
    }
  }

  return NextResponse.json({ articles, tier });
}
