// Best-effort, single-instance visibility into GNews call volume so a
// budget problem (we intentionally run close to the free-tier daily cap)
// shows up in logs before users see broken/empty states. This is an
// in-memory counter, not a durable store — it resets on cold start or
// redeploy, and won't aggregate across multiple server instances. A real
// cross-instance counter would need persistent storage, which is a
// Phase 3 concern (see docs/ARCHITECTURE.md).
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

export function recordGNewsCall(context: string): number {
  rolloverIfNewDay();
  count += 1;
  console.log(`[gnews] call #${count} today (${context})`);
  return count;
}

export function getGNewsCallCountToday(): number {
  rolloverIfNewDay();
  return count;
}

// Conservative safety margin below GNews's published 100/day free-tier
// cap — leaves headroom for the fixed ~48/day baseline events-pool
// refresh and any other traffic this same instance is serving.
// Best-effort only: since the underlying counter is per-instance, not a
// true global daily total, this guards against runaway usage within one
// warm instance but can't guarantee a hard global cap on its own — see
// the caveat above.
const SAFE_DAILY_BUDGET = 85;

export function isOverDailyBudget(): boolean {
  return getGNewsCallCountToday() >= SAFE_DAILY_BUDGET;
}
