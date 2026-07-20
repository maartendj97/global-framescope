import { redis } from "@/lib/cache";

// Counts AI summary generations per day and enforces a hard daily cap,
// mirroring the GNews budget guard (gnewsUsage.ts). Summaries are cheap
// (~$0.002 each on Haiku), but the cap makes the worst case bounded no
// matter how much traffic arrives: once the cap is hit, the summary
// endpoint degrades to "no summary yet" instead of spending money.
//
// With Redis configured (production) the count is shared across all
// server instances; the in-memory tally is the local-dev fallback.
const DEFAULT_DAILY_CAP = 300; // ~$0.60/day worst case on Haiku
// A differences generation covers up to 8 countries' worth of articles in
// one call (vs. 5 headlines for one country), so it's a separate, smaller
// budget rather than sharing the summary cap — a burst of activity on one
// feature can't starve the other's daily allowance.
const DEFAULT_DAILY_FRAMING_CAP = 50;

let dayKey = "";
let count = 0;
let framingDayKey = "";
let framingCount = 0;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function rolloverIfNewDay(): void {
  const today = todayKey();
  if (today !== dayKey) {
    dayKey = today;
    count = 0;
  }
}

function rolloverFramingIfNewDay(): void {
  const today = todayKey();
  if (today !== framingDayKey) {
    framingDayKey = today;
    framingCount = 0;
  }
}

function usageKey(): string {
  return `anthropic-usage:${todayKey()}`;
}

function framingUsageKey(): string {
  return `anthropic-framing-usage:${todayKey()}`;
}

export function dailySummaryCap(): number {
  const fromEnv = Number(process.env.ANTHROPIC_DAILY_SUMMARY_CAP);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_DAILY_CAP;
}

export function dailyFramingCap(): number {
  const fromEnv = Number(process.env.ANTHROPIC_DAILY_FRAMING_CAP);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_DAILY_FRAMING_CAP;
}

export async function recordSummaryGeneration(context: string): Promise<number> {
  rolloverIfNewDay();
  count += 1;

  if (redis) {
    try {
      const globalCount = await redis.incr(usageKey());
      if (globalCount === 1) await redis.expire(usageKey(), 60 * 60 * 48);
      count = globalCount;
    } catch (error) {
      console.warn("[anthropic] usage counter increment failed:", error);
    }
  }

  console.log(`[anthropic] summary #${count} today (${context})`);
  return count;
}

export async function getSummaryCallCountToday(): Promise<number> {
  rolloverIfNewDay();
  if (redis) {
    try {
      const globalCount = await redis.get<number>(usageKey());
      if (globalCount !== null) return globalCount;
    } catch (error) {
      console.warn("[anthropic] usage counter read failed:", error);
    }
  }
  return count;
}

export async function isOverDailySummaryCap(): Promise<boolean> {
  return (await getSummaryCallCountToday()) >= dailySummaryCap();
}

export async function recordFramingGeneration(context: string): Promise<number> {
  rolloverFramingIfNewDay();
  framingCount += 1;

  if (redis) {
    try {
      const globalCount = await redis.incr(framingUsageKey());
      if (globalCount === 1) await redis.expire(framingUsageKey(), 60 * 60 * 48);
      framingCount = globalCount;
    } catch (error) {
      console.warn("[anthropic] framing usage counter increment failed:", error);
    }
  }

  console.log(`[anthropic] framing #${framingCount} today (${context})`);
  return framingCount;
}

export async function getFramingCallCountToday(): Promise<number> {
  rolloverFramingIfNewDay();
  if (redis) {
    try {
      const globalCount = await redis.get<number>(framingUsageKey());
      if (globalCount !== null) return globalCount;
    } catch (error) {
      console.warn("[anthropic] framing usage counter read failed:", error);
    }
  }
  return framingCount;
}

export async function isOverDailyFramingCap(): Promise<boolean> {
  return (await getFramingCallCountToday()) >= dailyFramingCap();
}
