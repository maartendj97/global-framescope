import { NextResponse } from "next/server";

// Temporary diagnostic route to confirm whether GDELT is reachable from
// the deployed environment and what it returns. Remove once the live
// event feed is confirmed working.

async function tryFetch(label: string, url: string, headers?: Record<string, string>) {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers,
    });
    const elapsedMs = Date.now() - start;
    const bodyText = await response.text();
    return {
      label,
      ok: response.ok,
      status: response.status,
      elapsedMs,
      bodyPreview: bodyText.slice(0, 500),
    };
  } catch (error) {
    return {
      label,
      ok: false,
      elapsedMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET() {
  const results = await Promise.all([
    tryFetch(
      "current-query-with-user-agent",
      "https://api.gdeltproject.org/api/v2/doc/doc?" +
        new URLSearchParams({
          query: "sourcelang:english (war OR ceasefire)",
          mode: "artlist",
          maxrecords: "5",
          format: "json",
          sort: "hybridrel",
        }),
      { "User-Agent": "Mozilla/5.0 (compatible; GlobalFrameScope/1.0)" }
    ),
    tryFetch(
      "minimal-query-no-headers",
      "https://api.gdeltproject.org/api/v2/doc/doc?query=climate&mode=artlist&maxrecords=1&format=json"
    ),
    tryFetch("bare-host-reachability", "https://api.gdeltproject.org/"),
  ]);

  return NextResponse.json({ results });
}
