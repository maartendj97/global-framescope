import { NextResponse } from "next/server";
import { redis } from "@/lib/cache";
import { dailyFramingCap, dailySummaryCap } from "@/lib/external/anthropicUsage";
import { tokenMatches } from "../route";

// Per-day breakdown of the same counters /api/admin/metrics reports for
// "today" — powers the observability dashboard's history tabs. Reads the
// same Redis day-keys the usage modules already write (gnews-usage:YYYY-MM-DD
// etc.), which now live for 90 days instead of 48h specifically so this
// endpoint has something to show.
export type HistoryDay = {
  date: string;
  visits: number;
  uniqueVisits: number;
  gnews: number;
  newsdata: number;
  currents: number;
  summaries: number;
  framing: number;
  estimatedCostUsd: number;
};

export type MetricsHistoryResponse = {
  days: HistoryDay[];
  caps: {
    gnews: number;
    newsdata: number;
    currents: number;
    summaries: number;
    framing: number;
  };
};

const GNEWS_SAFE_DAILY_BUDGET = 85;
const NEWSDATA_SAFE_DAILY_BUDGET = 150;
const CURRENTS_SAFE_DAILY_BUDGET = 900;

const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// GNews/Currents/NewsData are free-tier — no $ cost. Only Anthropic calls
// carry a real cost. HAIKU_SUMMARY_COST_USD is an empirically confirmed
// average (~$0.002/summary, see project notes). SONNET_FRAMING_COST_USD is
// a reasoned estimate — up to 8 countries' worth of articles as input
// (~4k tokens) and a structured JSON response (~2k tokens) at Sonnet 5's
// intro pricing ($2/$10 per MTok) — not measured from real usage, since
// the app doesn't currently log per-call token counts. Tighten this
// constant if/when real usage gets logged.
const HAIKU_SUMMARY_COST_USD = 0.002;
const SONNET_FRAMING_COST_USD = 0.03;

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function lastNDates(days: number): string[] {
  const now = Date.now();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(utcDateKey(new Date(now - i * DAY_MS)));
  }
  return dates;
}

async function countsForPrefix(prefix: string, dates: string[]): Promise<number[]> {
  if (!redis) return dates.map(() => 0);
  try {
    const keys = dates.map((date) => `${prefix}:${date}`);
    const values = await redis.mget<(number | null)[]>(...keys);
    return values.map((value) => value ?? 0);
  } catch (error) {
    console.warn(`[admin/metrics/history] mget failed for ${prefix}:`, error);
    return dates.map(() => 0);
  }
}

async function uniqueVisitCounts(dates: string[]): Promise<number[]> {
  if (!redis) return dates.map(() => 0);
  return Promise.all(
    dates.map(async (date) => {
      try {
        return await redis!.scard(`visits-unique:${date}`);
      } catch (error) {
        console.warn(`[admin/metrics/history] scard failed for visits-unique:${date}:`, error);
        return 0;
      }
    })
  );
}

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
  const requestedDays = Number(searchParams.get("days"));
  const days = Number.isFinite(requestedDays) && requestedDays > 0
    ? Math.min(MAX_DAYS, Math.floor(requestedDays))
    : DEFAULT_DAYS;

  const dates = lastNDates(days);

  const [visits, uniqueVisits, gnews, newsdata, currents, summaries, framing] = await Promise.all([
    countsForPrefix("visits-usage", dates),
    uniqueVisitCounts(dates),
    countsForPrefix("gnews-usage", dates),
    countsForPrefix("newsdata-usage", dates),
    countsForPrefix("currents-usage", dates),
    countsForPrefix("anthropic-usage", dates),
    countsForPrefix("anthropic-framing-usage", dates),
  ]);

  const result: HistoryDay[] = dates.map((date, i) => ({
    date,
    visits: visits[i],
    uniqueVisits: uniqueVisits[i],
    gnews: gnews[i],
    newsdata: newsdata[i],
    currents: currents[i],
    summaries: summaries[i],
    framing: framing[i],
    estimatedCostUsd:
      summaries[i] * HAIKU_SUMMARY_COST_USD + framing[i] * SONNET_FRAMING_COST_USD,
  }));

  return NextResponse.json({
    days: result,
    caps: {
      gnews: GNEWS_SAFE_DAILY_BUDGET,
      newsdata: NEWSDATA_SAFE_DAILY_BUDGET,
      currents: CURRENTS_SAFE_DAILY_BUDGET,
      summaries: dailySummaryCap(),
      framing: dailyFramingCap(),
    },
  } satisfies MetricsHistoryResponse);
}
