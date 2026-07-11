import type { CountryCode, Event, EventCategory } from "@/types";

const GNEWS_ENDPOINT = "https://gnews.io/api/v4/search";

const ALL_COUNTRIES: CountryCode[] = ["NL", "US", "RU", "CN", "IN", "IR", "UA"];

// Phrases used to classify a fetched article into one of the app's fixed
// categories. Only quoted multi-word phrases are used (no bare single
// words like "war" or "sanctions") since those false-positive heavily on
// unrelated content — e.g. entertainment articles that merely mention a
// historical war.
const CATEGORY_PHRASES: Record<EventCategory, string[]> = {
  conflict: ["ceasefire", "peace talks", "peace negotiations"],
  climate: ["climate summit", "emissions agreement", "climate talks"],
  diplomacy: ["nuclear talks", "diplomatic negotiations", "nuclear negotiations"],
};

// A single combined query covering every category's phrases. GNews's free
// plan rate-limits concurrent requests (firing one request per category in
// parallel returned 429s in testing), so all categories are resolved from
// one API call and then bucketed client-side by matching phrase.
const COMBINED_QUERY = Object.values(CATEGORY_PHRASES)
  .flat()
  .map((phrase) => `"${phrase}"`)
  .join(" OR ");

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

function categoryForArticle(article: GNewsArticle): EventCategory | undefined {
  const haystack = `${article.title} ${article.description}`.toLowerCase();
  const category = (Object.keys(CATEGORY_PHRASES) as EventCategory[]).find((candidate) =>
    CATEGORY_PHRASES[candidate].some((phrase) => haystack.includes(phrase))
  );
  return category;
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

async function fetchGNewsArticles(
  apiKey: string,
  options?: GNewsFetchOptions
): Promise<GNewsArticle[]> {
  const params = new URLSearchParams({
    q: COMBINED_QUERY,
    lang: "en",
    max: "10",
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

  const articles = await fetchGNewsArticles(apiKey, options);

  const events: Event[] = [];
  const seenCategories = new Set<EventCategory>();

  for (const article of articles) {
    const category = categoryForArticle(article);
    if (!category || seenCategories.has(category)) continue;

    seenCategories.add(category);
    events.push(mapArticleToEvent(article, category));
  }

  return events;
}
