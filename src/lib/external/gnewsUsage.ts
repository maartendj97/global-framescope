import { redis } from "@/lib/cache";

// Counts GNews calls per day so a budget problem (we intentionally run
// close to the free-tier daily cap of 100) shows up in logs — and gets
// stopped by the guard below — before users see broken states.
//
// With Redis configured (production), the count is a single shared
// number across all server instances, so it's genuinely accurate. The
// in-memory tally remains as the fallback when Redis is unreachable or
// not configured (e.g. local development).
let dayKey = "";
let count = 0;

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

function usageKey(): string {
  return `gnews-usage:${todayKey()}`;
}

export async function recordGNewsCall(context: string): Promise<number> {
  rolloverIfNewDay();
  count += 1;

  if (redis) {
    try {
      const globalCount = await redis.incr(usageKey());
      // First increment of the day creates the key — give it a lifetime
      // so old day-counters clean themselves up.
      if (globalCount === 1) await redis.expire(usageKey(), 60 * 60 * 48);
      count = globalCount;
    } catch (error) {
      // Redis hiccup — the local tally above still counts this call.
      console.warn("[gnews] usage counter increment failed:", error);
    }
  }

  console.log(`[gnews] call #${count} today (${context})`);
  return count;
}

export async function getGNewsCallCountToday(): Promise<number> {
  rolloverIfNewDay();
  if (redis) {
    try {
      const globalCount = await redis.get<number>(usageKey());
      if (globalCount !== null) return globalCount;
    } catch (error) {
      // Fall through to the local tally.
      console.warn("[gnews] usage counter read failed:", error);
    }
  }
  return count;
}

// Conservative safety margin below GNews's published 100/day free-tier
// cap — leaves headroom for the fixed ~48/day baseline events-pool
// refresh and any calls made before a fresh instance started counting.
const SAFE_DAILY_BUDGET = 85;

export async function isOverDailyBudget(): Promise<boolean> {
  return (await getGNewsCallCountToday()) >= SAFE_DAILY_BUDGET;
}
