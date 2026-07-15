import Parser from "rss-parser";
import type { CountryCode, CountrySourceArticle, Event } from "@/types";
import { getCached, setCached } from "@/lib/cache";
import { CATEGORY_QUERIES } from "./gnews";

// Direct RSS feeds from state-run outlets in Russia, China and Iran.
// Aggregators like GNews index these poorly, and the "who is speaking"
// signal is the core of the perspective feature — so we read them at the
// source and label every article "state-media" at ingestion.
//
// Outlet choice is constrained by EU sanctions (see blockedPublishers.ts):
// RT, Sputnik and — since June 2024 — RIA Novosti are banned from
// distribution in the EU. TASS is explicitly not on the EU list, so it
// carries the Russian state perspective here. All five feed URLs below
// were fetched and verified working on 2026-07-13; outlets move their
// feeds occasionally, so a failing feed degrades to an empty result
// rather than an error (Iranian sites in particular can be flaky due to
// connectivity disruptions in-country).
export const STATE_FEEDS: { country: CountryCode; outlet: string; url: string }[] = [
  { country: "RU", outlet: "TASS", url: "https://tass.com/rss/v2.xml" },
  { country: "CN", outlet: "Xinhua", url: "https://english.news.cn/rss/worldrss.xml" },
  { country: "CN", outlet: "CGTN", url: "https://www.cgtn.com/subscribe/rss/section/world.xml" },
  { country: "CN", outlet: "China Daily", url: "https://www.chinadaily.com.cn/rss/world_rss.xml" },
  { country: "IR", outlet: "IRNA", url: "https://en.irna.ir/rss" },
];

export const STATE_MEDIA_COUNTRIES: Set<CountryCode> = new Set(
  STATE_FEEDS.map((feed) => feed.country)
);

export type StateFeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
};

// Pulls the quoted phrases out of a CATEGORY_QUERIES value, e.g.
// '"ceasefire" OR "peace talks"' -> ["ceasefire", "peace talks"].
export function extractCategoryPhrases(query: string): string[] {
  return Array.from(query.matchAll(/"([^"]+)"/g), (match) => match[1]);
}

// Common words that would make event-title matching meaningless — a feed
// item containing only "after" or "claims" says nothing about relevance.
const TITLE_STOPWORDS = new Set([
  "about", "after", "again", "against", "amid", "among", "as", "at",
  "back", "been", "before", "between", "claims", "could", "does", "for",
  "fresh", "from", "have", "here", "his", "her", "into", "its", "live",
  "major", "more", "new", "news", "over", "report", "says", "than",
  "that", "the", "their", "them", "there", "these", "they", "this",
  "under", "updates", "was", "were", "what", "when", "where", "which",
  "while", "will", "with", "would", "your",
]);

// Meaningful words from an event title, e.g. "US and Iran trade Strait
// of Hormuz control claims" -> ["iran", "trade", "strait", "hormuz",
// "control"]. GNews's exact search phrases rarely appear verbatim in
// feed headlines (a search engine matches full article text; a feed
// only exposes the title and a short snippet), so the event's own title
// words are the main relevance signal here.
export function extractTitleKeywords(title: string): string[] {
  return Array.from(
    new Set(
      title
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((word) => word.length >= 4 && !TITLE_STOPWORDS.has(word))
    )
  );
}

// How many distinct keywords appear in the text — used both as the
// relevance filter (at least one hit) and to rank multi-hit items first.
export function countKeywordHits(text: string, keywords: string[]): number {
  const textLower = text.toLowerCase();
  return keywords.filter((keyword) => textLower.includes(keyword.toLowerCase())).length;
}

export function mapFeedItem(item: StateFeedItem, outlet: string): CountrySourceArticle | null {
  if (!item.title || !item.link) return null;

  const date = new Date(item.isoDate ?? item.pubDate ?? "");
  if (isNaN(date.getTime())) return null;

  return {
    title: item.title,
    url: item.link,
    publisher: outlet,
    publishedAt: date.toISOString().slice(0, 10),
    sourceType: "state-media",
  };
}

type CachedFeed = { items: StateFeedItem[]; expiresAt: number };

// Two cache layers, same setup as the coverage cache in the
// country-sources route: a fast per-instance Map plus the shared Redis
// store. 20 minutes matches the "don't poll state outlets faster than
// every 15-30 min" guidance.
const feedCache = new Map<string, CachedFeed>();
const FEED_CACHE_TTL_MS = 20 * 60 * 1000;
const FEED_CACHE_TTL_SECONDS = 20 * 60;

const parser = new Parser();

async function fetchFeedItems(url: string): Promise<StateFeedItem[]> {
  const memoryCached = feedCache.get(url);
  if (memoryCached && memoryCached.expiresAt > Date.now()) {
    return memoryCached.items;
  }

  const cacheKey = `statefeed:v1:${url}`;
  const redisCached = await getCached<StateFeedItem[]>(cacheKey);
  if (redisCached) {
    feedCache.set(url, { items: redisCached, expiresAt: Date.now() + FEED_CACHE_TTL_MS });
    return redisCached;
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; FrameScope/1.0)" },
    });
    if (!response.ok) {
      console.error(`[statefeeds] ${url} responded ${response.status}`);
      return [];
    }
    const xml = await response.text();
    const feed = await parser.parseString(xml);
    const items: StateFeedItem[] = feed.items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      isoDate: item.isoDate,
      contentSnippet: item.contentSnippet,
    }));
    feedCache.set(url, { items, expiresAt: Date.now() + FEED_CACHE_TTL_MS });
    await setCached(cacheKey, items, FEED_CACHE_TTL_SECONDS);
    return items;
  } catch (error) {
    console.error(`[statefeeds] ${url} fetch failed:`, error);
    return [];
  }
}

const MAX_STATE_ARTICLES = 5;

export async function fetchStateMediaCoverage(
  country: CountryCode,
  event: Event
): Promise<CountrySourceArticle[]> {
  const feeds = STATE_FEEDS.filter((feed) => feed.country === country);
  if (feeds.length === 0) return [];

  // The event's own title words are the primary relevance signal; the
  // category's search phrases are kept as an extra match source.
  const keywords = [
    ...extractTitleKeywords(event.title),
    ...extractCategoryPhrases(CATEGORY_QUERIES[event.category]),
  ];

  const perFeedScored = await Promise.all(
    feeds.map(async (feed) => {
      const items = await fetchFeedItems(feed.url);
      return items
        .map((item) => ({
          item,
          score: countKeywordHits(`${item.title ?? ""} ${item.contentSnippet ?? ""}`, keywords),
        }))
        .filter(({ score }) => score > 0)
        .map(({ item, score }) => ({ article: mapFeedItem(item, feed.outlet), score }))
        .filter(
          (entry): entry is { article: CountrySourceArticle; score: number } =>
            entry.article !== null
        );
    })
  );

  // Items matching more keywords rank first (they're most likely about
  // this exact story); ties break on recency.
  return perFeedScored
    .flat()
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.article.publishedAt < b.article.publishedAt ? 1 : -1;
    })
    .slice(0, MAX_STATE_ARTICLES)
    .map(({ article }) => article);
}
