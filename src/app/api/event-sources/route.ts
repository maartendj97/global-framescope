import { NextResponse } from "next/server";
import { getCountries, getEventById } from "@/lib/data";
import {
  fetchCountryCoverage,
  type CountrySourceArticle,
  type CoverageTier,
} from "@/app/api/country-sources/route";
import type { CountryCode } from "@/types";

// Worst case (uncached, 8 countries x up to 2 calls each, ~1.1s apart) is
// ~18-20s. Current Vercel Hobby default (Fluid Compute) is 300s, so this
// is defensive headroom, not a workaround for a known limit.
export const maxDuration = 30;

export type EventSourceArticle = CountrySourceArticle & {
  countryCode: CountryCode;
  tier: CoverageTier;
};

type CountryResult = { countryCode: CountryCode; tier: CoverageTier; articles: CountrySourceArticle[] };

// Pure — unit-testable without touching the network.
export function mergeCountryArticles(results: CountryResult[]): EventSourceArticle[] {
  return results
    .flatMap(({ countryCode, tier, articles }) =>
      articles.map((article) => ({ ...article, countryCode, tier }))
    )
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));
}

// Shared across the whole request so every GNews call this loop makes is
// spaced ~1.1s apart, not just every country — a country that falls back
// makes 2 calls back-to-back, and without this shared counter that second
// call wouldn't be throttled relative to the first. Mirrors the same
// pattern applied per-category in fetchLiveEvents (src/lib/external/gnews.ts).
function createThrottle() {
  let calledBefore = false;
  return async () => {
    if (calledBefore) await new Promise((resolve) => setTimeout(resolve, 1100));
    calledBefore = true;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ articles: [] }, { status: 400 });

  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return NextResponse.json({ articles: [] });

  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ articles: [] }, { status: 404 });

  // Filter to the event's own availableCountries (not blindly all 8) —
  // matches the filtering EventDetailView already does for the Countries/
  // Overview tabs, and keeps this future-proof for events that cover
  // fewer than all 8 countries (see docs/ARCHITECTURE.md's country model).
  const countries = (await getCountries()).filter((country) =>
    event.availableCountries.includes(country.code)
  );
  const throttle = createThrottle();
  const results: CountryResult[] = [];

  for (const country of countries) {
    const { articles, tier } = await fetchCountryCoverage(
      event,
      country.code,
      apiKey,
      "event-sources",
      throttle
    );
    results.push({ countryCode: country.code, tier, articles });
  }

  return NextResponse.json({ articles: mergeCountryArticles(results) });
}
