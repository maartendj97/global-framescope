import { NextResponse } from "next/server";

// Temporary diagnostic route. Remove once the live event feed is
// confirmed working.

const CATEGORY_QUERIES: Record<string, string> = {
  conflict: "\"ceasefire\" OR \"peace talks\" OR \"peace negotiations\"",
  climate: "\"climate summit\" OR \"emissions agreement\" OR \"climate talks\"",
  diplomacy: "\"nuclear talks\" OR \"diplomatic negotiations\" OR \"nuclear negotiations\"",
};

async function testCategory(category: string, query: string, apiKey: string) {
  const url =
    "https://gnews.io/api/v4/search?" +
    new URLSearchParams({
      q: query,
      lang: "en",
      max: "3",
      sortby: "publishedAt",
      apikey: apiKey,
    });

  const start = Date.now();
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const elapsedMs = Date.now() - start;
    const bodyText = await response.text();
    const redactedBody = bodyText.split(apiKey).join("[REDACTED]");
    return { category, status: response.status, elapsedMs, bodyPreview: redactedBody.slice(0, 300) };
  } catch (error) {
    return {
      category,
      elapsedMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET() {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return NextResponse.json({ keyPresent: false });

  const results = [];
  for (const [category, query] of Object.entries(CATEGORY_QUERIES)) {
    results.push(await testCategory(category, query, apiKey));
  }

  return NextResponse.json({ keyPresent: true, results });
}
