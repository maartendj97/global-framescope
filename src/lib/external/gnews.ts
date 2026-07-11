import type { CountryCode, Event, EventCategory } from "@/types";

const GNEWS_ENDPOINT = "https://gnews.io/api/v4/search";

const MAX_TOTAL_EVENTS = 10;

const ALL_COUNTRIES: CountryCode[] = ["NL", "US", "RU", "CN", "IN", "IR", "UA", "DE"];

// One curated query per fixed app category. GNews has no concept of these
// categories, so category assignment happens at query time rather than by
// classifying an unfiltered feed after the fact. Only quoted multi-word
// phrases are used (no bare single words like "war" or "sanctions") since
// those false-positive heavily on unrelated content — e.g. entertainment
// articles that merely mention a historical war.
export const CATEGORY_QUERIES: Record<EventCategory, string> = {
  conflict: "\"ceasefire\" OR \"peace talks\" OR \"peace negotiations\"",
  climate: "\"climate summit\" OR \"emissions agreement\" OR \"climate talks\"",
  diplomacy: "\"nuclear talks\" OR \"diplomatic negotiations\" OR \"nuclear negotiations\"",
};

type GNewsArticle = {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string; url: string };
};

type GNewsFetchOptions = {
  next?: { revalidate?: number; tags?: string[] };
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapArticleToEvent(article: GNewsArticle, category: EventCategory): Event {
  // GNews doesn't report the source's country, so availability can't be
  // narrowed from the article the way GDELT's sourcecountry allowed —
  // falls back to all 7, same as the mock data. Harmless since Sources
  // and CountryFraming remain mock/curated regardless.
  return {
    id: `${category}-${slugify(article.source.name)}-${article.publishedAt.slice(0, 10)}`,
    title: article.title,
    category,
    date: article.publishedAt.slice(0, 10),
    summary: article.description || article.title,
    context: `Reported by ${article.source.name}. Full coverage available via the original source.`,
    availableCountries: ALL_COUNTRIES,
  };
}

async function fetchGNewsCategory(
  category: EventCategory,
  apiKey: string,
  options?: GNewsFetchOptions
): Promise<GNewsArticle[]> {
  const params = new URLSearchParams({
    q: CATEGORY_QUERIES[category],
    lang: "en",
    max: "4",
    // The free GNews plan strips articles older than 30 days from the
    // response ("historical data"). Sorting by relevance can surface an
    // old article that gets silently removed, leaving an empty result —
    // sorting by recency keeps results inside the free-tier window.
    sortby: "publishedAt",
    apikey: apiKey,
  });

  try {
    const response = await fetch(`${GNEWS_ENDPOINT}?${params.toString()}`, {
      next: options?.next,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { articles?: GNewsArticle[] };
    return data.articles ?? [];
  } catch {
    return [];
  }
}

export async function fetchLiveEvents(options?: GNewsFetchOptions): Promise<Event[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const categories: EventCategory[] = ["conflict", "climate", "diplomacy"];
  const events: Event[] = [];
  const seenIds = new Set<string>();

  // Sequential with a spacing delay, not Promise.all: GNews's free-tier
  // rate limit blocks requests fired within the same short window
  // regardless of concurrency — even back-to-back sequential calls
  // (~20ms apart) were rejected with 429 "too many requests... in a
  // short period of time" in testing. A ~1.1s gap between calls stays
  // under that limit; this whole loop only runs once per hour anyway
  // (see the revalidate option passed in from src/lib/data/events.ts).
  for (const [index, category] of categories.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const articles = await fetchGNewsCategory(category, apiKey, options);
    for (const article of articles) {
      const event = mapArticleToEvent(article, category);
      if (seenIds.has(event.id)) continue;
      seenIds.add(event.id);
      events.push(event);
    }
  }

  // Most recent first, capped to the pool both Home (top 5) and Events
  // (up to 10) draw from — a single fetch cycle serves both pages, so
  // this doesn't add any extra GNews requests.
  return events
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_TOTAL_EVENTS);
}
