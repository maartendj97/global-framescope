import type { CountryCode, Event, EventCategory } from "@/types";

const GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";

const ALL_COUNTRIES: CountryCode[] = ["NL", "US", "RU", "CN", "IN", "IR", "UA"];

// One curated query per fixed app category. GDELT's DOC 2.0 API has no
// concept of these categories, so category assignment happens at query
// time rather than by classifying an unfiltered feed after the fact.
const CATEGORY_QUERIES: Record<EventCategory, string> = {
  conflict: "sourcelang:english (war OR ceasefire OR \"peace talks\" OR conflict)",
  climate: "sourcelang:english (\"climate summit\" OR \"emissions agreement\" OR \"climate talks\")",
  diplomacy: "sourcelang:english (\"nuclear talks\" OR \"diplomatic negotiations\" OR sanctions)",
};

// GDELT reports source country as a full name (CAMEO-style), not an ISO
// code. Only the app's fixed 7 countries need mapping; anything else is
// simply not one of the 7 and is ignored for availability purposes.
const GDELT_COUNTRY_TO_CODE: Record<string, CountryCode> = {
  Netherlands: "NL",
  "United States": "US",
  Russia: "RU",
  China: "CN",
  India: "IN",
  Iran: "IR",
  Ukraine: "UA",
};

type GdeltArticle = {
  title: string;
  url: string;
  seendate: string;
  domain: string;
  sourcecountry: string;
};

type GdeltFetchOptions = {
  next?: { revalidate?: number; tags?: string[] };
};

function parseGdeltDate(seendate: string): string {
  // GDELT format: "20250712T153000Z" -> "2025-07-12"
  const match = /^(\d{4})(\d{2})(\d{2})T/.exec(seendate);
  if (!match) return new Date().toISOString().slice(0, 10);
  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapArticleToEvent(article: GdeltArticle, category: EventCategory): Event {
  const availableCountries = GDELT_COUNTRY_TO_CODE[article.sourcecountry]
    ? [GDELT_COUNTRY_TO_CODE[article.sourcecountry]]
    : ALL_COUNTRIES;

  return {
    id: `${category}-${slugify(article.domain)}-${parseGdeltDate(article.seendate)}`,
    title: article.title,
    category,
    date: parseGdeltDate(article.seendate),
    // GDELT's DOC API returns no snippet/summary field, only a headline —
    // summary and context are necessarily rougher than hand-written mock
    // copy until a real summarization step exists.
    summary: article.title,
    context: `Reported by ${article.domain}. Full coverage available via the original source.`,
    availableCountries,
  };
}

async function fetchGdeltCategory(
  category: EventCategory,
  options?: GdeltFetchOptions
): Promise<GdeltArticle[]> {
  const params = new URLSearchParams({
    query: CATEGORY_QUERIES[category],
    mode: "artlist",
    maxrecords: "10",
    format: "json",
    sort: "hybridrel",
  });

  try {
    const response = await fetch(`${GDELT_ENDPOINT}?${params.toString()}`, {
      next: options?.next,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { articles?: GdeltArticle[] };
    return data.articles ?? [];
  } catch {
    return [];
  }
}

export async function fetchLiveEvents(options?: GdeltFetchOptions): Promise<Event[]> {
  const categories: EventCategory[] = ["conflict", "climate", "diplomacy"];
  const results = await Promise.all(
    categories.map((category) => fetchGdeltCategory(category, options))
  );

  const events: Event[] = [];
  const seenIds = new Set<string>();

  results.forEach((articles, index) => {
    const category = categories[index];
    const topArticle = articles[0];
    if (!topArticle) return;

    const event = mapArticleToEvent(topArticle, category);
    if (seenIds.has(event.id)) return;
    seenIds.add(event.id);
    events.push(event);
  });

  return events;
}
