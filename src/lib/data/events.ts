import { events as mockEvents } from "@/data/events";
import { fetchLiveEvents } from "@/lib/external/gnews";
import { fetchCurrentsEvents } from "@/lib/external/currents";
import { acquireLock, getCached, setCached } from "@/lib/cache";
import type { Event } from "@/types";

// "live"    — GNews primary, Currents backup when GNews is empty (default)
// "mock"    — the hardcoded fixtures, for local dev / instant rollback
// "currents"— force Currents only, to verify that source in isolation
const EVENTS_SOURCE = process.env.EVENTS_SOURCE ?? "live";

// The events pool lives in the shared Redis cache so every server
// instance serves the exact same list. Before this, each instance
// fetched its own pool at its own moment — so a link on the list page
// could point at an event the next instance didn't know, giving 404s
// (the "pool drift" bug). Next's own fetch cache was confirmed not to
// work on this setup, so Redis is the real cache here.
//
// 3h TTL keeps GNews usage where it was designed to be: 6 categories
// x 8 refreshes/day = 48 calls/day.
//
// v2 (2026-07-20): bumped to force one immediate pool refresh so the
// new clustering logic (gnews.ts) applies to the current pool right
// away, instead of waiting up to 3h for the natural TTL expiry — the
// cached v1 pool predates that deploy and still had near-duplicate
// events split into separate cards. One-off cache bust, not a
// recurring cost: costs exactly the one refresh cycle that would have
// happened naturally anyway.
// v3/v4 (2026-07-21): same one-off bust, twice in one day — v3 verified
// the strong-shared-keyword rule, which surfaced a second clustering bug
// (frozen cluster.keywords) fixed right after; v4 verifies that fix.
const EVENTS_POOL_KEY = "events-pool:v4";
const EVENTS_POOL_TTL_SECONDS = 3 * 60 * 60;

// Each event is also stored under its own key with a longer lifetime,
// so shared or bookmarked links keep working for a week after the
// event has rotated out of the pool.
const EVENT_KEY_PREFIX = "event:v1:";
const EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

// When the pool cache is empty, every instance that receives a request
// in that gap would otherwise run its own 6-category GNews refresh
// simultaneously — burning several days' worth of the free-tier budget
// in one thundering herd. This lock lets exactly one instance refresh;
// the rest wait briefly for it to finish and read its result instead of
// fetching redundantly. TTL covers the realistic worst case (GNews then
// Currents, both hitting their 5s per-call timeouts across 6
// categories) with headroom, so a stuck holder self-heals well before
// legitimate refreshes would need the lock again.
const EVENTS_POOL_LOCK_KEY = "events-pool-lock:v1";
const LOCK_TTL_SECONDS = 60;
const LOCK_WAIT_MS = 400;
const LOCK_WAIT_ATTEMPTS = 5;

// Last pool this instance served successfully — the safety net when
// both Redis and the news sources are unavailable. Better than dropping
// to mock events, whose links wouldn't match anything users see.
let lastKnownPool: Event[] | null = null;

// Fetch a fresh pool from the live news sources. GNews is primary;
// Currents is a backup that only runs when GNews came back empty (an
// outage or the daily cap), so the list has a second independent source.
async function fetchFreshPool(): Promise<Event[]> {
  if (EVENTS_SOURCE === "currents") return fetchCurrentsEvents();

  const liveEvents = await fetchLiveEvents();
  if (liveEvents.length > 0) return liveEvents;

  return fetchCurrentsEvents();
}

export async function getEvents(): Promise<Event[]> {
  if (EVENTS_SOURCE === "mock") return mockEvents;

  const cached = await getCached<Event[]>(EVENTS_POOL_KEY);
  if (cached && cached.length > 0) {
    lastKnownPool = cached;
    return cached;
  }

  const gotLock = await acquireLock(EVENTS_POOL_LOCK_KEY, LOCK_TTL_SECONDS);
  if (!gotLock) {
    // Another instance is already refreshing — wait for it to publish
    // the new pool rather than starting a redundant fetch of our own.
    for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_MS));
      const settled = await getCached<Event[]>(EVENTS_POOL_KEY);
      if (settled && settled.length > 0) {
        lastKnownPool = settled;
        return settled;
      }
    }
    // The winner hasn't published yet (still fetching, or its fetch
    // came back empty) — serve the best available fallback rather than
    // piling on with another fetch or blocking indefinitely.
    return lastKnownPool ?? mockEvents;
  }

  const freshPool = await fetchFreshPool();
  if (freshPool.length > 0) {
    lastKnownPool = freshPool;
    await setCached(EVENTS_POOL_KEY, freshPool, EVENTS_POOL_TTL_SECONDS);
    await Promise.all(
      freshPool.map((event) =>
        setCached(`${EVENT_KEY_PREFIX}${event.id}`, event, EVENT_TTL_SECONDS)
      )
    );
    return freshPool;
  }

  // Both sources came back empty (or no keys set) — fall back to the last
  // good pool, then to mock events, rather than showing an empty state.
  return lastKnownPool ?? mockEvents;
}

export async function getEventById(id: string): Promise<Event | undefined> {
  const allEvents = await getEvents();
  const fromPool = allEvents.find((event) => event.id === id);
  if (fromPool) return fromPool;

  // Not in the current pool — possibly an older shared or bookmarked
  // link. The per-event record keeps those alive for a week.
  return (await getCached<Event>(`${EVENT_KEY_PREFIX}${id}`)) ?? undefined;
}
