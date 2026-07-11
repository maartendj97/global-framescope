import { NextResponse } from "next/server";

// Temporary diagnostic route. Remove once the live event feed is
// confirmed working.
export async function GET() {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ keyPresent: false });
  }

  const url =
    "https://gnews.io/api/v4/search?" +
    new URLSearchParams({
      q: "\"ceasefire\" OR \"peace talks\" OR \"peace negotiations\"",
      lang: "en",
      max: "3",
      sortby: "publishedAt",
      apikey: apiKey,
    });

  try {
    const start = Date.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const elapsedMs = Date.now() - start;
    const bodyText = await response.text();
    const redactedBody = bodyText.split(apiKey).join("[REDACTED]");
    return NextResponse.json({
      keyPresent: true,
      keyLength: apiKey.length,
      ok: response.ok,
      status: response.status,
      elapsedMs,
      bodyPreview: redactedBody.slice(0, 1000),
    });
  } catch (error) {
    return NextResponse.json({
      keyPresent: true,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
