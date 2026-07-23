import { redis } from "@/lib/cache";

// Traffic counters for the observability dashboard: total page views and
// unique visitors per day. Mirrors gnewsUsage.ts's Redis-shared-counter
// pattern, but tracks two numbers instead of one budget guard — there's
// no cap to enforce here, just visibility.
//
// "Unique" is approximated by a per-day Redis Set of hashed visitor IDs
// (see proxy.ts for the hash) — SCARD gives the count without ever
// storing a raw IP.
let dayKey = "";
let count = 0;
let uniqueIds = new Set<string>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function rolloverIfNewDay(): void {
  const today = todayKey();
  if (today !== dayKey) {
    dayKey = today;
    count = 0;
    uniqueIds = new Set();
  }
}

function visitsKey(): string {
  return `visits-usage:${todayKey()}`;
}

function uniqueKey(): string {
  return `visits-unique:${todayKey()}`;
}

export async function recordVisit(hashedVisitorId: string): Promise<void> {
  rolloverIfNewDay();
  count += 1;
  uniqueIds.add(hashedVisitorId);

  if (redis) {
    try {
      const globalCount = await redis.incr(visitsKey());
      // 90 days so the observability dashboard's history view has data.
      if (globalCount === 1) await redis.expire(visitsKey(), 60 * 60 * 24 * 90);
      await redis.sadd(uniqueKey(), hashedVisitorId);
      // SADD doesn't return "was this the first key write" the way INCR's
      // result of 1 does, so the TTL is set unconditionally — EXPIRE on an
      // already-expiring key is a harmless no-op refresh.
      await redis.expire(uniqueKey(), 60 * 60 * 24 * 90);
    } catch (error) {
      console.warn("[visits] counter update failed:", error);
    }
  }
}

export async function getVisitCountToday(): Promise<number> {
  rolloverIfNewDay();
  if (redis) {
    try {
      const globalCount = await redis.get<number>(visitsKey());
      if (globalCount !== null) return globalCount;
    } catch (error) {
      console.warn("[visits] counter read failed:", error);
    }
  }
  return count;
}

export async function getUniqueVisitCountToday(): Promise<number> {
  rolloverIfNewDay();
  if (redis) {
    try {
      return await redis.scard(uniqueKey());
    } catch (error) {
      console.warn("[visits] unique counter read failed:", error);
    }
  }
  return uniqueIds.size;
}
