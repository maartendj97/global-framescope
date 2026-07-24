import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCountries, getEventById } from "@/lib/data";
import { acquireLock, getCached, setCached } from "@/lib/cache";
import { fetchCountryCoverage } from "@/app/api/country-sources/route";
import { createThrottle } from "@/app/api/event-sources/route";
import { extractManyWithBudget } from "@/lib/external/articleExtractor";
import { isOverDailyFramingCap, recordFramingGeneration } from "@/lib/external/anthropicUsage";
import { describeError, recordError } from "@/lib/external/errorLog";
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
// (below) plus one Anthropic call. Raised from 90 on 2026-07-24 alongside
// the max_tokens increase below — a successful dense-event call already
// took 74-81s at the old 8000-token ceiling, so a higher ceiling needs
// more headroom to avoid the function itself timing out before a genuine
// (non-truncated) response finishes. Still comfortably under Vercel's
// 300s Fluid Compute default (also documented there).
export const maxDuration = 150;

const FRAMING_CACHE_VERSION = "v1";
const FRAMING_TTL_SECONDS = 24 * 60 * 60;
const EXTRACTION_PHASE_BUDGET_MS = 20000;
const EXTRACTION_CONCURRENCY = 5;
// Keeps worst-case prompt size (and cost) predictable at up to ~40
// articles per event — roughly the lead plus a few paragraphs.
const MAX_BODY_CHARS_PER_ARTICLE = 1500;
// Aggregate cap across the whole event, on top of the per-article cap
// above. Dense categories (e.g. conflict) can have many full-text
// extractions succeed at once — even at 1500 chars each that adds up to
// a prompt large enough that Sonnet 5's adaptive thinking exhausts
// max_tokens before finishing the structured JSON output, truncating it
// mid-parse (see the 2026-07-23 "Unexpected end of JSON input" incident,
// confirmed via the admin logs endpoint). Once this budget is spent,
// remaining articles fall back to the shorter description tier even when
// extraction succeeded — the same honest-tier mechanism the prompt
// already explains to the model, just capped in aggregate rather than
// only per-article. Lowered from 20000 on 2026-07-24 after the 3-tier
// effort retry still failed 3/3 on every conflict-category event in
// production — the retry alone wasn't enough, so cutting input further.
const MAX_TOTAL_BODY_CHARS = 12000;
// Below this, slicing a full-text extraction down to fit the remaining
// budget would produce a fragment too short to honestly call "full-text".
const MIN_FULLTEXT_CHARS = 200;

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

  let remainingBodyBudget = MAX_TOTAL_BODY_CHARS;
  const result = new Map<CountryCode, ArticleWithTier[]>();
  for (const { country, articles } of coverageByCountry) {
    const withTiers = articles.map((article): ArticleWithTier => {
      const fullText = extracted.get(article.url);
      if (fullText && remainingBodyBudget >= MIN_FULLTEXT_CHARS) {
        const text = fullText.slice(0, Math.min(MAX_BODY_CHARS_PER_ARTICLE, remainingBodyBudget));
        remainingBodyBudget -= text.length;
        return { article, text, tier: "full-text" };
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
    ``,
    `Some source articles above may be in a language other than English (e.g. Dutch). Always write your response in English regardless of the source language.`,
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

type FramingAttempt =
  | { success: true; result: Omit<EventFramingResult, "notCoveredBy"> }
  // apiError means the call itself rejected (bad key, rate limit, outage)
  // — never worth retrying at another effort level. refusal means the
  // call succeeded but the model declined the content (stop_reason
  // "refusal"), which effort also can't fix, but which the Opus fallback
  // might. Anything else (apiError: false, refusal: false) is a genuine
  // JSON parse failure, the one case the effort ladder actually helps.
  | { success: false; apiError: boolean; refusal: boolean };

async function attemptFraming(
  client: Anthropic,
  event: Event,
  prompt: string,
  model: "claude-sonnet-5" | "claude-opus-4-8",
  effort: "high" | "medium" | "low"
): Promise<FramingAttempt> {
  let text: string;
  let stopReason: string | null = null;
  let stopDetails = "none";
  try {
    await recordFramingGeneration(`event-framing:${event.id}`);
    const response = await client.messages.create({
      model,
      // Sonnet 5 runs adaptive thinking by default, and those thinking
      // tokens count against max_tokens. 2000 left no headroom for the
      // 8-country structured JSON after thinking, truncating the output
      // mid-JSON and failing the parse below — confirmed locally against
      // this exact prompt shape. Raised from 8000 to 16000 on 2026-07-24:
      // the densest conflict-category events still failed at 8000 even
      // after cutting the input prompt by 40%, pointing at output length
      // (not input volume) as the real ceiling for events with genuine
      // full coverage across all 8 countries.
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: EVENT_FRAMING_JSON_SCHEMA }, effort },
      messages: [{ role: "user", content: prompt }],
    });
    stopReason = response.stop_reason;
    // Only populated when stop_reason is "refusal" — carries the safety
    // classifier's category/explanation. Logged unconditionally (cheap,
    // no extra call) since stop_reason=refusal turned out to be the real
    // cause behind what looked like a truncation bug (see 2026-07-24).
    stopDetails = JSON.stringify(response.stop_details ?? null);
    text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  } catch (error) {
    console.error(`[anthropic] framing generation failed for ${event.id} (model=${model}):`, error);
    await recordError("anthropic-framing", `${event.id} failed (model=${model}): ${describeError(error)}`);
    return { success: false, apiError: true, refusal: false };
  }

  try {
    const parsed = JSON.parse(text) as { framings: RawFraming[]; differences: RawDifference[] };
    return {
      success: true,
      result: {
        framings: parsed.framings.map((framing) => ({ ...framing, eventId: event.id })),
        differences: parsed.differences.map((difference) => ({ ...difference, eventId: event.id })),
      },
    };
  } catch (error) {
    // A model outage, malformed JSON, or bad key must never break the
    // Differences tab — the client renders the honest empty state.
    // stop_reason distinguishes a genuine max_tokens truncation from the
    // model ending its turn early with malformed output — the two point
    // at different fixes (a higher ceiling vs. a schema/prompt issue).
    console.error(
      `[anthropic] framing JSON parse failed for ${event.id} (model=${model}, effort=${effort}, stop_reason=${stopReason}, stop_details=${stopDetails}):`,
      error
    );
    await recordError(
      "anthropic-framing",
      `${event.id} JSON parse failed (model=${model}, effort=${effort}, stop_reason=${stopReason}, stop_details=${stopDetails}): ${describeError(error)}`
    );
    return { success: false, apiError: false, refusal: stopReason === "refusal" };
  }
}

async function generateEventFraming(
  event: Event,
  countries: Country[],
  contentByCountry: Map<CountryCode, ArticleWithTier[]>,
  apiKey: string
): Promise<Omit<EventFramingResult, "notCoveredBy"> | null> {
  const client = new Anthropic({ apiKey });
  const prompt = buildEventFramingPrompt(event, countries, contentByCountry);

  // "high" (the API default) first, then progressively lower effort if —
  // and only if — the previous attempt's failure was a genuine JSON parse
  // error (thinking eating the max_tokens budget before the structured
  // JSON finishes — see the 2026-07-23 "Unexpected end of JSON input"
  // incident). A refusal is different: it's Sonnet 5's safety classifier
  // declining the content outright (category "bio" on dense conflict
  // events, confirmed 2026-07-24 via stop_reason/stop_details) — a lower
  // effort level doesn't change that, so cycling through the ladder on a
  // refusal would just waste two more calls. Break out to the Opus
  // fallback below the moment a refusal is seen instead.
  const efforts = ["high", "medium", "low"] as const;
  let sawRefusal = false;
  for (const effort of efforts) {
    const attempt = await attemptFraming(client, event, prompt, "claude-sonnet-5", effort);
    if (attempt.success) return attempt.result;
    // A genuine API failure (bad key, rate limit, outage) isn't retried at
    // another effort level — that wouldn't fix it, so a second real call
    // isn't worth the spend.
    if (attempt.apiError) return null;
    if (attempt.refusal) {
      sawRefusal = true;
      break;
    }
  }

  if (sawRefusal) {
    // The API's own refusal message points integrators at the `fallbacks`
    // request parameter, but that parameter 400s outright on Sonnet 5
    // ("does not support the `fallbacks` parameter" — confirmed directly
    // against production 2026-07-24). This is the manual equivalent: one
    // extra call to Opus 4.8, only spent when Sonnet actually refused.
    const fallback = await attemptFraming(client, event, prompt, "claude-opus-4-8", "high");
    if (fallback.success) return fallback.result;
  }

  return null;
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

const EMPTY_RESULT: EventFramingResult = { framings: [], differences: [], notCoveredBy: [] };

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

  // Computed directly from coverage data rather than left to the AI to
  // notice and mention — exact, and available even when there isn't
  // enough coverage anywhere to generate framing at all.
  const notCoveredBy = coverageByCountry
    .filter(({ articles }) => articles.length === 0)
    .map(({ country }) => country.code);

  const totalArticles = coverageByCountry.reduce((sum, c) => sum + c.articles.length, 0);
  if (totalArticles === 0) {
    return NextResponse.json({ ...EMPTY_RESULT, notCoveredBy } satisfies EventFramingResponse);
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
  // Coverage existed and generation was actually attempted here (unlike
  // the zero-coverage short-circuit above) — a null result means it tried
  // and failed, not that there was nothing to compare. Surfaced so the
  // client can show an honest "failed" state instead of the same empty
  // arrays a real no-coverage event produces.
  const finalResult: EventFramingResult = result
    ? { ...result, notCoveredBy }
    : { ...EMPTY_RESULT, notCoveredBy, generationFailed: true };
  if (result) {
    await setCached(key, finalResult, FRAMING_TTL_SECONDS);
  }
  return NextResponse.json(finalResult satisfies EventFramingResponse);
}
