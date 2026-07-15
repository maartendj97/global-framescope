import { ALL_CATEGORIES, ALL_COUNTRY_CODES } from "@/types";
import type { Event, EventCategory } from "@/types";
import { isSanctionedPublisher } from "./blockedPublishers";

// Currents API is a backup news source for the events pool: it only runs
// when GNews returns nothing (an outage or the daily cap), so the event
// list has a second, independent source and never collapses to stale or
// mock data. Free tier is 1,000 requests/day (10x GNews) and allows
// commercial use. Dormant until CURRENTS_API_KEY is set — without it
// every function here returns [] and nothing changes.
const CURRENTS_ENDPOINT = "https://api.currentsapi.services/v1/search";

const MAX_TOTAL_EVENTS = 10;

// Currents' keyword search doesn't use GNews's quoted-OR query language,
// so each category maps to one distinctive phrase. These are a starting
// point tuned by hand once a real key lets us see live results — treat
// them as adjustable, not final.
const CATEGORY_KEYWORDS: Record<EventCategory, string> = {
  conflict: "ceasefire",
  climate: "climate summit",
  diplomacy: "nuclear talks",
  elections: "election results",
  trade: "trade agreement",
  humanitarian: "humanitarian crisis",
};

type CurrentsArticle = {
  title: string;
  description: string;
  url: string;
  author: string;
  image: string;
  published: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapArticleToEvent(article: CurrentsArticle, category: EventCategory): Event {
  const publisher = article.author || "Unknown source";
  // Currents returns the literal string "None" when an article has no
  // image — treat that as no image so it falls back to the category art.
  const imageUrl = article.image && article.image !== "None" ? article.image : undefined;

  return {
    id: `${category}-${slugify(publisher)}-${article.published.slice(0, 10)}`,
    title: article.title,
    category,
    date: article.published.slice(0, 10),
    summary: article.description || article.title,
    context: `Reported by ${publisher}. Full coverage available via the original source.`,
    availableCountries: [...ALL_COUNTRY_CODES],
    imageUrl,
  };
}

// Currents' /search has no documented page-size parameter (unlike
// GNews's max=4), so one category's query can return dozens of same-day
// articles and flood the whole pool before other categories get a
// look-in — confirmed live: an unbounded "conflict" query alone filled
// all 10 pool slots. Capping client-side keeps categories balanced, the
// same role GNews's max=4 already plays.
const MAX_PER_CATEGORY = 3;

async function fetchCurrentsCategory(
  category: EventCategory,
  apiKey: string
): Promise<CurrentsArticle[]> {
  const params = new URLSearchParams({
    keywords: CATEGORY_KEYWORDS[category],
    language: "en",
  });

  try {
    console.log(`[currents] call (events:${category})`);
    const response = await fetch(`${CURRENTS_ENDPOINT}?${params.toString()}`, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`[currents] events:${category} responded ${response.status}`);
      return [];
    }
    const data = (await response.json()) as { news?: CurrentsArticle[] };
    return (data.news ?? []).slice(0, MAX_PER_CATEGORY);
  } catch (error) {
    console.error(`[currents] events:${category} fetch failed:`, error);
    return [];
  }
}

export async function fetchCurrentsEvents(): Promise<Event[]> {
  const apiKey = process.env.CURRENTS_API_KEY;
  if (!apiKey) return [];

  const events: Event[] = [];
  const seenIds = new Set<string>();

  // Sequential with a small spacing delay to stay polite to the free
  // tier. Only runs when GNews came back empty, so this is a rare path.
  for (const [index, category] of ALL_CATEGORIES.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 300));
    const articles = await fetchCurrentsCategory(category, apiKey);
    for (const article of articles) {
      // EU-sanctioned outlets (RT, Sputnik, etc.) never enter the pool.
      if (isSanctionedPublisher(article.author)) continue;
      const event = mapArticleToEvent(article, category);
      if (seenIds.has(event.id)) continue;
      seenIds.add(event.id);
      events.push(event);
    }
  }

  return events
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_TOTAL_EVENTS);
}
