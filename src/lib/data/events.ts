import { events as mockEvents } from "@/data/events";
import { fetchLiveEvents } from "@/lib/external/gnews";
import { fetchCurrentsEvents } from "@/lib/external/currents";
import { getCached, setCached } from "@/lib/cache";
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
const EVENTS_POOL_KEY = "events-pool:v1";
const EVENTS_POOL_TTL_SECONDS = 3 * 60 * 60;

// Each event is also stored under its own key with a longer lifetime,
// so shared or bookmarked links keep working for a week after the
// event has rotated out of the pool.
const EVENT_KEY_PREFIX = "event:v1:";
const EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

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
