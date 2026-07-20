import { ALL_CATEGORIES, ALL_COUNTRY_CODES } from "@/types";
import type { Event, EventCategory } from "@/types";
import { isSanctionedPublisher } from "./blockedPublishers";
import { recordGNewsCall } from "./gnewsUsage";

const GNEWS_ENDPOINT = "https://gnews.io/api/v4/search";

const MAX_TOTAL_EVENTS = 10;

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
  elections: "\"election results\" OR \"national election\" OR \"presidential election\"",
  trade: "\"trade agreement\" OR \"trade deal\" OR \"tariff agreement\"",
  humanitarian: "\"humanitarian crisis\" OR \"humanitarian aid\" OR \"refugee crisis\"",
};

// Dutch translations of the same curated phrases, used only for NL's
// per-country coverage search (see fetchCountryCoverage in
// src/app/api/country-sources/route.ts). GNews's `lang` filter narrows
// results to that language, but doesn't translate `q` — searching Dutch
// outlets with the English phrases above matches almost nothing, since
// Dutch coverage is written in Dutch. Same curation rule as the English
// set: quoted multi-word phrases only, to avoid single-word false
// positives.
export const CATEGORY_QUERIES_NL: Record<EventCategory, string> = {
  conflict: "\"staakt-het-vuren\" OR \"vredesoverleg\" OR \"vredesonderhandelingen\"",
  climate: "\"klimaattop\" OR \"emissieakkoord\" OR \"klimaatoverleg\"",
  diplomacy: "\"kernonderhandelingen\" OR \"diplomatiek overleg\" OR \"nucleair overleg\"",
  elections: "\"verkiezingsuitslag\" OR \"nationale verkiezingen\" OR \"presidentsverkiezingen\"",
  trade: "\"handelsakkoord\" OR \"handelsovereenkomst\" OR \"tariefakkoord\"",
  humanitarian: "\"humanitaire crisis\" OR \"humanitaire hulp\" OR \"vluchtelingencrisis\"",
};

type GNewsArticle = {
  title: string;
  description: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Words too generic to signal that two headlines are about the same
// story — kept short since GNews titles are terse compared to state-feed
// article bodies.
const CLUSTER_STOPWORDS = new Set([
  "about", "after", "again", "against", "amid", "among", "announces",
  "before", "between", "could", "does", "from", "have", "into", "over",
  "report", "reports", "says", "than", "that", "their", "there", "these",
  "they", "this", "under", "updates", "were", "what", "when", "where",
  "which", "while", "will", "with", "would", "your",
]);

// Same >=4-char / stopword-filtered approach as stateFeeds.ts's keyword
// extraction, applied here to compare two headlines against each other
// rather than a headline against a fixed event title.
function extractClusterKeywords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && !CLUSTER_STOPWORDS.has(word))
  );
}

// Overlap coefficient (shared / smaller set's size) rather than Jaccard —
// a short, punchy headline and a longer, more descriptive one about the
// same story should still cluster even though the longer one has more
// total keywords diluting a Jaccard ratio.
function keywordOverlapRatio(a: Set<string>, b: Set<string>): number {
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  if (smaller.size === 0) return 0;
  let shared = 0;
  for (const word of smaller) if (larger.has(word)) shared++;
  return shared / smaller.size;
}

const CLUSTER_SIMILARITY_THRESHOLD = 0.5;
const CLUSTER_MIN_SHARED_KEYWORDS = 2;

// Groups articles that are almost certainly the same underlying story
// (e.g. 4 publishers all covering the same ceasefire announcement) so
// they become one Event with multiple sources instead of 4 near-duplicate
// cards — GNews has no story-grouping of its own, and each article
// otherwise becomes an independent event keyed by publisher+date. Runs
// per-category, since categories are already topically distinct enough
// that cross-category false merges aren't a real risk, and a single
// category's article count is small (max 4) so this stays O(n^2)-cheap.
export function clusterArticles(articles: GNewsArticle[]): GNewsArticle[][] {
  const clusters: { keywords: Set<string>; items: GNewsArticle[] }[] = [];

  for (const article of articles) {
    const keywords = extractClusterKeywords(article.title);
    const match = clusters.find((cluster) => {
      const shared = keywordOverlapRatio(keywords, cluster.keywords);
      const sharedCount = [...keywords].filter((word) => cluster.keywords.has(word)).length;
      return shared >= CLUSTER_SIMILARITY_THRESHOLD && sharedCount >= CLUSTER_MIN_SHARED_KEYWORDS;
    });

    if (match) {
      match.items.push(article);
    } else {
      clusters.push({ keywords, items: [article] });
    }
  }

  return clusters.map((cluster) => cluster.items);
}

function mapClusterToEvent(cluster: GNewsArticle[], category: EventCategory): Event {
  // The article with the longest description leads the merged event —
  // richer source content makes a better summary/context than picking
  // whichever article happened to be fetched first.
  const primary = cluster.reduce((best, article) =>
    article.description.length > best.description.length ? article : best
  );

  // One entry per distinct publisher (case-insensitive) — GNews can
  // return the same outlet twice for a story (e.g. a live-updated wire
  // piece re-indexed), which shouldn't count as two sources.
  const seenPublishers = new Set<string>();
  const sources = cluster
    .filter((article) => {
      const key = article.source.name.toLowerCase();
      if (seenPublishers.has(key)) return false;
      seenPublishers.add(key);
      return true;
    })
    .map((article) => ({ publisher: article.source.name, url: article.url }));

  // GNews doesn't report the source's country, so availability can't be
  // narrowed from the article the way GDELT's sourcecountry allowed —
  // falls back to every covered country, same as the mock data. Harmless
  // since CountryFraming remains mock/curated regardless.
  return {
    id: `${category}-${slugify(primary.source.name)}-${primary.publishedAt.slice(0, 10)}`,
    title: primary.title,
    category,
    date: primary.publishedAt.slice(0, 10),
    summary: primary.description || primary.title,
    context:
      sources.length > 1
        ? `Reported by ${sources.length} outlets, including ${primary.source.name}. Full coverage available via the original sources.`
        : `Reported by ${primary.source.name}. Full coverage available via the original source.`,
    availableCountries: [...ALL_COUNTRY_CODES],
    imageUrl: primary.image || undefined,
    sources,
  };
}

async function fetchGNewsCategory(
  category: EventCategory,
  apiKey: string
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
    await recordGNewsCall(`events:${category}`);
    const response = await fetch(`${GNEWS_ENDPOINT}?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`[gnews] events:${category} responded ${response.status}`);
      return [];
    }
    const data = (await response.json()) as { articles?: GNewsArticle[] };
    return data.articles ?? [];
  } catch (error) {
    console.error(`[gnews] events:${category} fetch failed:`, error);
    return [];
  }
}

export async function fetchLiveEvents(): Promise<Event[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const events: Event[] = [];
  const seenIds = new Set<string>();

  // Sequential with a spacing delay, not Promise.all: GNews's free-tier
  // rate limit blocks requests fired within the same short window
  // regardless of concurrency — even back-to-back sequential calls
  // (~20ms apart) were rejected with 429 "too many requests... in a
  // short period of time" in testing. A ~1.1s gap between calls stays
  // under that limit; this loop only runs when the shared 3h Redis
  // cache of the events pool has expired (see src/lib/data/events.ts),
  // keeping total daily GNews calls for the events pool roughly flat.
  for (const [index, category] of ALL_CATEGORIES.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const fetched = await fetchGNewsCategory(category, apiKey);
    // EU-sanctioned outlets (RT, Sputnik) never enter the events pool.
    const articles = fetched.filter((article) => !isSanctionedPublisher(article.source.name));
    // Cluster same-story articles (e.g. 4 publishers covering the same
    // ceasefire) into one event with multiple sources, rather than one
    // near-duplicate card per publisher.
    for (const cluster of clusterArticles(articles)) {
      const event = mapClusterToEvent(cluster, category);
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
