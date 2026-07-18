import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCountries, getEventById } from "@/lib/data";
import { acquireLock, getCached, setCached } from "@/lib/cache";
import { fetchCountryCoverage } from "@/app/api/country-sources/route";
import { createThrottle } from "@/app/api/event-sources/route";
import { extractManyWithBudget } from "@/lib/external/articleExtractor";
import { isOverDailyFramingCap, recordFramingGeneration } from "@/lib/external/anthropicUsage";
import { ALL_COUNTRY_CODES } from "@/types/country";
import type {
  ContentTier,
  Country,
  CountryCode,
  CountrySourceArticle,
  Event,
  EventCountryFraming,
  EventFramingResult,
  EventKeyDifference,
} from "@/types";

// Worst case: the throttled 8-country coverage loop alone documents
// ~15-25s (see event-sources/route.ts), plus the extraction phase budget
// (below) plus one Anthropic call — 90s is comfortable headroom under
// Vercel's 300s Fluid Compute default (also documented there), not an
// assumption of unlimited time.
export const maxDuration = 90;

const FRAMING_CACHE_VERSION = "v1";
const FRAMING_TTL_SECONDS = 24 * 60 * 60;
const EXTRACTION_PHASE_BUDGET_MS = 20000;
const EXTRACTION_CONCURRENCY = 5;
// Keeps worst-case prompt size (and cost) predictable at up to ~40
// articles per event — roughly the lead plus a few paragraphs.
const MAX_BODY_CHARS_PER_ARTICLE = 1500;

export type EventFramingResponse = EventFramingResult & { pending?: boolean };

function cacheKey(eventId: string): string {
  return `event-framing:${FRAMING_CACHE_VERSION}:${eventId}`;
}

export type ArticleWithTier = { article: CountrySourceArticle; text: string; tier: ContentTier };
type CountryCoverage = { country: Country; articles: CountrySourceArticle[] };

// Gathers full text (best-effort, shared budget across every article in
// the event) and assigns each article the honest tier its content
// actually supports — full-text on a successful extraction, description
// as the fallback, headline-only when neither is available. Pure aside
// from the extraction call, and exported for tests.
export async function buildEventFramingContent(
  coverageByCountry: CountryCoverage[]
): Promise<Map<CountryCode, ArticleWithTier[]>> {
  const allUrls = coverageByCountry.flatMap(({ articles }) => articles.map((a) => a.url));
  const extracted = await extractManyWithBudget(
    allUrls,
    EXTRACTION_PHASE_BUDGET_MS,
    EXTRACTION_CONCURRENCY
  );

  const result = new Map<CountryCode, ArticleWithTier[]>();
  for (const { country, articles } of coverageByCountry) {
    const withTiers = articles.map((article): ArticleWithTier => {
      const fullText = extracted.get(article.url);
      if (fullText) {
        return { article, text: fullText.slice(0, MAX_BODY_CHARS_PER_ARTICLE), tier: "full-text" };
      }
      if (article.description) {
        return {
          article,
          text: article.description.slice(0, MAX_BODY_CHARS_PER_ARTICLE),
          tier: "description",
        };
      }
      return { article, text: "", tier: "headline-only" };
    });
    result.set(country.code, withTiers);
  }
  return result;
}

// Pure and exported for tests. Same tier-honesty discipline as
// buildSummaryPrompt's from-country/mentioning-country split (see
// country-summary/route.ts), extended to three content tiers instead of
// two: the model is explicitly told which countries it can describe with
// real nuance (full-text available) versus which it must describe more
// conservatively (only a snippet or a bare headline) — never invent
// details the source text doesn't support, and never guess about a
// country with zero coverage.
export function buildEventFramingPrompt(
  event: Event,
  countries: Country[],
  contentByCountry: Map<CountryCode, ArticleWithTier[]>
): string {
  const countrySections = countries
    .map((country) => {
      const items = contentByCountry.get(country.code) ?? [];
      if (items.length === 0) return null;
      const lines = items
        .map(({ article, text, tier }) => {
          const base = `  - "${article.title}" (${article.publisher}, ${article.publishedAt}) [${tier}]`;
          return text ? `${base}: ${text}` : base;
        })
        .join("\n");
      return `${country.name}:\n${lines}`;
    })
    .filter((section): section is string => section !== null);

  return [
    `International event: "${event.title}"`,
    `Event summary: ${event.summary}`,
    ``,
    `Below is real news coverage of this event from ${countrySections.length} ${countrySections.length === 1 ? "country" : "countries"}. Each article is labeled with a content tier:`,
    `- "full-text": the article's actual body text was retrieved`,
    `- "description": only a short provider-supplied snippet was available, not the full body`,
    `- "headline-only": only the headline was available, no snippet or body text`,
    ``,
    countrySections.join("\n\n"),
    ``,
    `For each country listed above, describe how its media frames this event: the main frame/angle, the tone, what it emphasizes, and a short narrative summary. Scale the depth and confidence of what you claim to the content tier actually available for that country — where every article is "full-text", you may describe nuanced framing and emphasis in real detail. Where articles are only "description" or "headline-only", describe the framing much more conservatively and generally, since you do not have the actual article text to base finer claims on. Report each country's contentTier as the weakest tier used among its articles. Do not invent details the source text doesn't support.`,
    ``,
    `Then identify 2-4 key differences in how these countries frame the event differently from each other — specific, concrete contrasts, not vague generalities.`,
    ``,
    `Only include countries that have coverage listed above. Do not guess about the framing of a country with no coverage.`,
  ].join("\n");
}

const EVENT_FRAMING_JSON_SCHEMA = {
  type: "object",
  properties: {
    framings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          countryCode: { type: "string", enum: [...ALL_COUNTRY_CODES] },
          mainFrame: { type: "string" },
          toneCategory: {
            type: "string",
            enum: ["concerned", "cautious", "critical", "neutral", "balanced", "supportive"],
          },
          keyEmphasis: { type: "array", items: { type: "string" } },
          mainNarrative: { type: "string" },
          contentTier: { type: "string", enum: ["full-text", "description", "headline-only"] },
        },
        required: [
          "countryCode",
          "mainFrame",
          "toneCategory",
          "keyEmphasis",
          "mainNarrative",
          "contentTier",
        ],
        additionalProperties: false,
      },
    },
    differences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          countryCodes: { type: "array", items: { type: "string", enum: [...ALL_COUNTRY_CODES] } },
        },
        required: ["title", "description", "countryCodes"],
        additionalProperties: false,
      },
    },
  },
  required: ["framings", "differences"],
  additionalProperties: false,
} as const;

type RawFraming = Omit<EventCountryFraming, "eventId">;
type RawDifference = Omit<EventKeyDifference, "eventId">;

async function generateEventFraming(
  event: Event,
  countries: Country[],
  contentByCountry: Map<CountryCode, ArticleWithTier[]>,
  apiKey: string
): Promise<EventFramingResult | null> {
  const client = new Anthropic({ apiKey });
  try {
    await recordFramingGeneration(`event-framing:${event.id}`);
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      // Sonnet 5 runs adaptive thinking by default, and those thinking
      // tokens count against max_tokens. 2000 left no headroom for the
      // 8-country structured JSON after thinking, truncating the output
      // mid-JSON and failing the parse below — confirmed locally against
      // this exact prompt shape. 8000 gives both phases comfortable room.
      max_tokens: 8000,
      output_config: { format: { type: "json_schema", schema: EVENT_FRAMING_JSON_SCHEMA } },
      messages: [
        { role: "user", content: buildEventFramingPrompt(event, countries, contentByCountry) },
      ],
    });
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    const parsed = JSON.parse(text) as { framings: RawFraming[]; differences: RawDifference[] };
    return {
      framings: parsed.framings.map((framing) => ({ ...framing, eventId: event.id })),
      differences: parsed.differences.map((difference) => ({ ...difference, eventId: event.id })),
    };
  } catch (error) {
    // A model outage, malformed JSON, or bad key must never break the
    // Differences tab — the client renders the honest empty state.
    console.error(`[anthropic] framing generation failed for ${event.id}:`, error);
    return null;
  }
}

// Mirrors country-summary/route.ts's waitForCachedSummary: a brief poll
// for callers that lost the generation lock, so most of them return the
// fresh result instead of an empty "pending" state.
async function waitForCachedFraming(
  key: string,
  attempts: number,
  delayMs: number
): Promise<EventFramingResult | null> {
  for (let i = 0; i < attempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const cached = await getCached<EventFramingResult>(key);
    if (cached) return cached;
  }
  return null;
}

const EMPTY_RESULT: EventFramingResult = { framings: [], differences: [] };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json(EMPTY_RESULT satisfies EventFramingResponse, { status: 400 });
  }

  const event = await getEventById(eventId);
  if (!event) {
    return NextResponse.json(EMPTY_RESULT satisfies EventFramingResponse, { status: 404 });
  }

  const key = cacheKey(eventId);
  const cached = await getCached<EventFramingResult>(key);
  if (cached) {
    return NextResponse.json(cached satisfies EventFramingResponse);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? null;
  if (!apiKey) {
    return NextResponse.json(EMPTY_RESULT satisfies EventFramingResponse);
  }
  if (await isOverDailyFramingCap()) {
    console.log(`[anthropic] skipped framing (daily cap) — ${eventId}`);
    return NextResponse.json(EMPTY_RESULT satisfies EventFramingResponse);
  }

  const gnewsApiKey = process.env.GNEWS_API_KEY ?? null;
  const countries = (await getCountries()).filter((country) =>
    event.availableCountries.includes(country.code)
  );
  const throttle = createThrottle();
  const coverageByCountry: CountryCoverage[] = [];
  for (const country of countries) {
    // Skip the weaker fallback tier here, same reasoning as
    // /api/event-sources: an 8-country aggregate shouldn't double its
    // worst-case cost on a tier that's cheap for a single country tap.
    const { articles } = await fetchCountryCoverage(
      event,
      country.code,
      gnewsApiKey,
      "event-framing",
      throttle,
      false
    );
    coverageByCountry.push({ country, articles });
  }

  const totalArticles = coverageByCountry.reduce((sum, c) => sum + c.articles.length, 0);
  if (totalArticles === 0) {
    return NextResponse.json(EMPTY_RESULT satisfies EventFramingResponse);
  }

  // Single-flight across all instances, same pattern as country-summary:
  // only the lock winner spends the extraction time + Anthropic call;
  // everyone else briefly polls the cache for the winner's result.
  const gotLock = await acquireLock(`lock:${key}`, 60);
  if (!gotLock) {
    const result = await waitForCachedFraming(key, 8, 1000);
    return NextResponse.json({
      ...(result ?? EMPTY_RESULT),
      ...(result ? {} : { pending: true }),
    } satisfies EventFramingResponse);
  }

  const contentByCountry = await buildEventFramingContent(coverageByCountry);
  const result = await generateEventFraming(event, countries, contentByCountry, apiKey);
  if (result) {
    await setCached(key, result, FRAMING_TTL_SECONDS);
  }
  return NextResponse.json((result ?? EMPTY_RESULT) satisfies EventFramingResponse);
}
