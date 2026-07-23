import { NextResponse } from "next/server";
import { getRecentErrors } from "@/lib/external/errorLog";
import { tokenMatches } from "../metrics/route";

// Read-only view of the last N real pipeline errors (GNews/Currents/
// NewsData/state-feeds/Anthropic), for the observability dashboard's logs
// tab. Same bearer-token auth as /api/admin/metrics. Deliberately excludes
// cache.ts warnings and article-extractor failures — both are
// known/expected noise (see errorLog.ts), not actionable signal.
export type LogsResponse = {
  entries: { timestamp: string; source: string; message: string }[];
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  const expectedToken = process.env.METRICS_API_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!provided || !tokenMatches(provided, expectedToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(MAX_LIMIT, Math.floor(requestedLimit))
    : DEFAULT_LIMIT;

  const entries = await getRecentErrors(limit);

  return NextResponse.json({ entries } satisfies LogsResponse);
}
