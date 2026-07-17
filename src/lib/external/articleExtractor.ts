import { extract } from "@extractus/article-extractor";
import { getCached, setCached } from "@/lib/cache";

// Best-effort full-article-text extraction, used only when generating AI
// framing analysis (never from the coverage/sources-list path — that would
// scrape every article ever shown, most of which nobody reads). Every
// failure mode (network error, paywall, bot-block, malformed HTML, no
// article-like content found) degrades to `null` so callers can fall back
// to the article's description, then its headline — the same
// never-throw, always-degrade discipline as every other external call in
// this codebase (gnews.ts, stateFeeds.ts, currents.ts).

const CONTENT_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // published text doesn't change
const FETCH_TIMEOUT_MS = 6000;
// A too-short "extraction" is more likely a paywall/cookie-wall stub or an
// error page than real article text — treat it the same as a failure.
const MIN_TEXT_LENGTH = 200;

function contentCacheKey(url: string): string {
  return `article-content:v1:${url}`;
}

// The library returns sanitized article HTML, not plain text — this repo
// feeds article content into AI prompts as plain text, so strip markup
// before caching/returning. Regex-based, not a full HTML parser: good
// enough for already-sanitized extractor output, not for arbitrary HTML.
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractArticleText(url: string): Promise<string | null> {
  const cached = await getCached<string>(contentCacheKey(url));
  if (cached) return cached;

  try {
    const article = await extract(
      url,
      undefined,
      {
        headers: { "user-agent": "Mozilla/5.0 (compatible; FrameScope/1.0)" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }
    );
    const text = article?.content ? stripHtmlToText(article.content) : "";
    if (text.length < MIN_TEXT_LENGTH) return null;

    await setCached(contentCacheKey(url), text, CONTENT_CACHE_TTL_SECONDS);
    return text;
  } catch (error) {
    console.error(`[article-extractor] extraction failed for ${url}:`, error);
    return null;
  }
}

// Fetches many articles' full text under a shared concurrency cap and
// overall time budget, so a handful of slow or hanging publisher URLs
// can't blow the caller's own request timeout. Once the phase deadline
// passes, workers stop *starting* new extractions — anything already
// in flight keeps its own per-request timeout, so total wall-clock stays
// bounded near `phaseBudgetMs + FETCH_TIMEOUT_MS`. URLs whose extraction
// didn't run or didn't finish in time are simply absent from the
// returned map; callers should treat a missing entry the same as `null`.
export async function extractManyWithBudget(
  urls: string[],
  phaseBudgetMs = 20000,
  concurrency = 5
): Promise<Map<string, string | null>> {
  const uniqueUrls = Array.from(new Set(urls));
  const results = new Map<string, string | null>();
  const deadline = Date.now() + phaseBudgetMs;
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < uniqueUrls.length && Date.now() < deadline) {
      const url = uniqueUrls[nextIndex++];
      results.set(url, await extractArticleText(url));
    }
  }

  const workerCount = Math.min(concurrency, uniqueUrls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
