import { redis } from "@/lib/cache";

// Same role as gnewsUsage.ts/newsdataUsage.ts: counts Currents API calls
// per day and stops them before the free-tier daily cap (1,000
// requests/day) turns into errors. Currents is a rare backup path (only
// runs when GNews returns empty), so this budget has far more headroom
// than the other sources, but it was the one external call site with no
// counter or admin-metrics visibility at all.
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
  return `currents-usage:${todayKey()}`;
}

export async function recordCurrentsCall(context: string): Promise<number> {
  rolloverIfNewDay();
  count += 1;

  if (redis) {
    try {
      const globalCount = await redis.incr(usageKey());
      // 90 days so the observability dashboard's history view has data.
      if (globalCount === 1) await redis.expire(usageKey(), 60 * 60 * 24 * 90);
      count = globalCount;
    } catch (error) {
      console.warn("[currents] usage counter increment failed:", error);
    }
  }

  console.log(`[currents] call #${count} today (${context})`);
  return count;
}

export async function getCurrentsCallCountToday(): Promise<number> {
  rolloverIfNewDay();
  if (redis) {
    try {
      const globalCount = await redis.get<number>(usageKey());
      if (globalCount !== null) return globalCount;
    } catch (error) {
      console.warn("[currents] usage counter read failed:", error);
    }
  }
  return count;
}

// Conservative safety margin below the 1,000/day free-tier cap.
const SAFE_DAILY_BUDGET = 900;

export async function isOverDailyBudget(): Promise<boolean> {
  return (await getCurrentsCallCountToday()) >= SAFE_DAILY_BUDGET;
}
