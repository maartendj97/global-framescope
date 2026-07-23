import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getGNewsCallCountToday } from "@/lib/external/gnewsUsage";
import { getNewsDataCallCountToday } from "@/lib/external/newsdataUsage";
import { getCurrentsCallCountToday } from "@/lib/external/currentsUsage";
import {
  dailyFramingCap,
  dailySummaryCap,
  getFramingCallCountToday,
  getSummaryCallCountToday,
} from "@/lib/external/anthropicUsage";
import { getUniqueVisitCountToday, getVisitCountToday } from "@/lib/external/visitUsage";

// Read-only snapshot of every daily counter already tracked across the
// pipeline (GNews/NewsData/Anthropic budget guards, plus the new visit
// counters) — the data source for the standalone observability
// dashboard. No caching: callers hit this at most a few times a minute,
// far below what a bare handful of Redis reads warrants caching.
export type MetricsResponse = {
  visits: { total: number; unique: number };
  gnews: { count: number; cap: number };
  newsdata: { count: number; cap: number };
  currents: { count: number; cap: number };
  anthropic: {
    summaries: { count: number; cap: number };
    framing: { count: number; cap: number };
  };
};

const GNEWS_SAFE_DAILY_BUDGET = 85;
const NEWSDATA_SAFE_DAILY_BUDGET = 150;
const CURRENTS_SAFE_DAILY_BUDGET = 900;

// process.env values are ordinary strings, not Buffers — timingSafeEqual
// needs equal-length Buffers, so a length mismatch is checked first
// (mismatched lengths would otherwise throw instead of just failing).
export function tokenMatches(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export async function GET(request: Request) {
  const expectedToken = process.env.METRICS_API_TOKEN;
  // Unconfigured means "off", the same convention as ANTHROPIC_API_KEY
  // elsewhere — never serve real counters without an explicit token set.
  if (!expectedToken) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!provided || !tokenMatches(provided, expectedToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [visits, uniqueVisits, gnews, newsdata, currents, summaries, framing] = await Promise.all([
    getVisitCountToday(),
    getUniqueVisitCountToday(),
    getGNewsCallCountToday(),
    getNewsDataCallCountToday(),
    getCurrentsCallCountToday(),
    getSummaryCallCountToday(),
    getFramingCallCountToday(),
  ]);

  return NextResponse.json({
    visits: { total: visits, unique: uniqueVisits },
    gnews: { count: gnews, cap: GNEWS_SAFE_DAILY_BUDGET },
    newsdata: { count: newsdata, cap: NEWSDATA_SAFE_DAILY_BUDGET },
    currents: { count: currents, cap: CURRENTS_SAFE_DAILY_BUDGET },
    anthropic: {
      summaries: { count: summaries, cap: dailySummaryCap() },
      framing: { count: framing, cap: dailyFramingCap() },
    },
  } satisfies MetricsResponse);
}
