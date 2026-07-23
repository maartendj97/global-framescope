import { redis } from "@/lib/cache";

// Same role as gnewsUsage.ts: counts NewsData.io calls per day and stops
// them before the free-tier daily cap (200 credits/day, 1 credit per
// request) turns into 422 errors users would see as broken coverage.
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
  return `newsdata-usage:${todayKey()}`;
}

export async function recordNewsDataCall(context: string): Promise<number> {
  rolloverIfNewDay();
  count += 1;

  if (redis) {
    try {
      const globalCount = await redis.incr(usageKey());
      // 90 days so the observability dashboard's history view has data.
      if (globalCount === 1) await redis.expire(usageKey(), 60 * 60 * 24 * 90);
      count = globalCount;
    } catch (error) {
      console.warn("[newsdata] usage counter increment failed:", error);
    }
  }

  console.log(`[newsdata] call #${count} today (${context})`);
  return count;
}

export async function getNewsDataCallCountToday(): Promise<number> {
  rolloverIfNewDay();
  if (redis) {
    try {
      const globalCount = await redis.get<number>(usageKey());
      if (globalCount !== null) return globalCount;
    } catch (error) {
      console.warn("[newsdata] usage counter read failed:", error);
    }
  }
  return count;
}

// Conservative safety margin below the 200/day free-tier cap — leaves
// headroom for calls made before a fresh instance started counting.
const SAFE_DAILY_BUDGET = 150;

export async function isOverDailyBudget(): Promise<boolean> {
  return (await getNewsDataCallCountToday()) >= SAFE_DAILY_BUDGET;
}
