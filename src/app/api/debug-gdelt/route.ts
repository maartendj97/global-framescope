import { NextResponse } from "next/server";

// Temporary diagnostic route to confirm whether GDELT is reachable from
// the deployed environment and what it returns. Remove once the live
// event feed is confirmed working.
export async function GET() {
  const url =
    "https://api.gdeltproject.org/api/v2/doc/doc?" +
    new URLSearchParams({
      query: "sourcelang:english (war OR ceasefire)",
      mode: "artlist",
      maxrecords: "5",
      format: "json",
      sort: "hybridrel",
    });

  try {
    const start = Date.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const elapsedMs = Date.now() - start;
    const bodyText = await response.text();
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      elapsedMs,
      bodyPreview: bodyText.slice(0, 1500),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
