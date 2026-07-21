import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@/types";
import { events as mockEvents } from "@/data/events";

const fetchLiveEventsMock = vi.fn<() => Promise<Event[]>>();
const fetchCurrentsEventsMock = vi.fn<() => Promise<Event[]>>();
const getCachedMock = vi.fn();
const setCachedMock = vi.fn();
const acquireLockMock = vi.fn();

vi.mock("@/lib/external/gnews", () => ({
  fetchLiveEvents: fetchLiveEventsMock,
}));
vi.mock("@/lib/external/currents", () => ({
  fetchCurrentsEvents: fetchCurrentsEventsMock,
}));
vi.mock("@/lib/cache", () => ({
  getCached: getCachedMock,
  setCached: setCachedMock,
  acquireLock: acquireLockMock,
}));

const livePool: Event[] = [
  {
    id: "live-event-1",
    title: "Live Event",
    category: "conflict",
    date: "2026-07-15",
    summary: "A live event summary.",
    context: "Live event context.",
    availableCountries: ["NL", "US"],
  },
];

const currentsPool: Event[] = [
  {
    id: "currents-event-1",
    title: "Currents Event",
    category: "trade",
    date: "2026-07-14",
    summary: "A currents event summary.",
    context: "Currents event context.",
    availableCountries: ["DE"],
  },
];

// Fresh module instance per test — getEvents() keeps a module-level
// `lastKnownPool` fallback, so tests that shouldn't see a previous
// test's state need a clean import.
async function importGetEvents() {
  const mod = await import("./events");
  return mod.getEvents;
}

describe("getEvents", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchLiveEventsMock.mockReset();
    fetchCurrentsEventsMock.mockReset();
    getCachedMock.mockReset();
    setCachedMock.mockReset();
    acquireLockMock.mockReset();
    delete process.env.EVENTS_SOURCE;
  });

  it("returns the cached pool without touching any news source or lock", async () => {
    getCachedMock.mockResolvedValueOnce(livePool);
    const getEvents = await importGetEvents();

    const result = await getEvents();

    expect(result).toEqual(livePool);
    expect(acquireLockMock).not.toHaveBeenCalled();
    expect(fetchLiveEventsMock).not.toHaveBeenCalled();
  });

  it("falls back to Currents when GNews returns nothing, and caches the result", async () => {
    getCachedMock.mockResolvedValueOnce(null);
    acquireLockMock.mockResolvedValueOnce(true);
    fetchLiveEventsMock.mockResolvedValueOnce([]);
    fetchCurrentsEventsMock.mockResolvedValueOnce(currentsPool);
    const getEvents = await importGetEvents();

    const result = await getEvents();

    expect(result).toEqual(currentsPool);
    expect(setCachedMock).toHaveBeenCalledWith(
      "events-pool:v3",
      currentsPool,
      expect.any(Number)
    );
  });

  it("skips the news sources entirely when EVENTS_SOURCE=mock", async () => {
    process.env.EVENTS_SOURCE = "mock";
    const getEvents = await importGetEvents();

    const result = await getEvents();

    expect(result).toEqual(mockEvents);
    expect(getCachedMock).not.toHaveBeenCalled();
    expect(fetchLiveEventsMock).not.toHaveBeenCalled();
  });

  it("falls back to mock events when both sources and the cache are empty", async () => {
    getCachedMock.mockResolvedValue(null);
    acquireLockMock.mockResolvedValueOnce(true);
    fetchLiveEventsMock.mockResolvedValueOnce([]);
    fetchCurrentsEventsMock.mockResolvedValueOnce([]);
    const getEvents = await importGetEvents();

    const result = await getEvents();

    expect(result).toEqual(mockEvents);
  });

  it("does not fetch when another instance holds the refresh lock, and reads the pool once it appears", async () => {
    // First check (pre-lock): empty. Lock not acquired. First wait-loop
    // check: still empty (the winner hasn't published yet). Second
    // wait-loop check: the winner has published.
    getCachedMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(livePool);
    acquireLockMock.mockResolvedValueOnce(false);
    const getEvents = await importGetEvents();

    const result = await getEvents();

    expect(result).toEqual(livePool);
    expect(fetchLiveEventsMock).not.toHaveBeenCalled();
    expect(fetchCurrentsEventsMock).not.toHaveBeenCalled();
  }, 10000);

  it("serves the last known good pool if the lock holder never publishes one", async () => {
    getCachedMock.mockResolvedValue(null);
    acquireLockMock
      .mockResolvedValueOnce(true) // first call: this instance refreshes and succeeds
      .mockResolvedValueOnce(false); // second call: another instance now holds the lock
    fetchLiveEventsMock.mockResolvedValueOnce(livePool);
    fetchCurrentsEventsMock.mockResolvedValue([]);
    const getEvents = await importGetEvents();

    const first = await getEvents();
    expect(first).toEqual(livePool);

    // Second call: cache still reads as empty (simulating a not-yet-
    // visible write on another instance) and the lock is held elsewhere
    // — this instance's in-memory lastKnownPool should be served instead
    // of dropping all the way to mock events.
    const second = await getEvents();
    expect(second).toEqual(livePool);
  }, 10000);
});
