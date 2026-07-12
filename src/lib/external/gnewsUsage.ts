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

export function recordGNewsCall(context: string): number {
  const today = todayKey();
  if (today !== dayKey) {
    dayKey = today;
    count = 0;
  }
  count += 1;
  console.log(`[gnews] call #${count} today (${context})`);
  return count;
}
