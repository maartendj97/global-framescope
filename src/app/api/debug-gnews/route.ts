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

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const bodyText = await response.text();
    const redactedBody = bodyText.split(apiKey).join("[REDACTED]");
    const parsed = JSON.parse(redactedBody) as { totalArticles?: number; articles?: unknown[] };
    return {
      category,
      status: response.status,
      totalArticles: parsed.totalArticles,
      articleCount: parsed.articles?.length ?? 0,
      titles: (parsed.articles as Array<{ title: string }> | undefined)?.map((a) => a.title),
    };
  } catch (error) {
    return { category, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET() {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ keyPresent: false });
  }

  const results = await Promise.all(
    Object.entries(CATEGORY_QUERIES).map(([category, query]) =>
      testCategory(category, query, apiKey)
    )
  );

  return NextResponse.json({ keyPresent: true, results });
}
