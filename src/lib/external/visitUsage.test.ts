import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function mockCacheAndImport(redis: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/cache", () => ({ redis }));
  return import("./visitUsage");
}

describe("visitUsage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recordVisit increments the shared Redis visit counter and adds to the unique set", async () => {
    const incr = vi.fn().mockResolvedValue(5);
    const sadd = vi.fn();
    const expire = vi.fn();
    const { recordVisit } = await mockCacheAndImport({ incr, sadd, expire });

    await recordVisit("hash-a");

    expect(incr).toHaveBeenCalledWith("visits-usage:2026-07-15");
    expect(sadd).toHaveBeenCalledWith("visits-unique:2026-07-15", "hash-a");
  });

  it("sets a TTL on the day-counter key only on its first increment", async () => {
    const incr = vi.fn().mockResolvedValue(1);
    const sadd = vi.fn();
    const expire = vi.fn();
    const { recordVisit } = await mockCacheAndImport({ incr, sadd, expire });

    await recordVisit("hash-a");

    expect(expire).toHaveBeenCalledWith("visits-usage:2026-07-15", 60 * 60 * 24 * 90);
    expect(expire).toHaveBeenCalledWith("visits-unique:2026-07-15", 60 * 60 * 24 * 90);
  });

  it("falls back to a local in-memory tally when Redis is unavailable", async () => {
    const { recordVisit, getVisitCountToday, getUniqueVisitCountToday } =
      await mockCacheAndImport(null);

    await recordVisit("hash-a");
    await recordVisit("hash-b");
    await recordVisit("hash-a"); // repeat visitor — visit count grows, unique doesn't

    expect(await getVisitCountToday()).toBe(3);
    expect(await getUniqueVisitCountToday()).toBe(2);
  });

  it("falls back to the local tally when Redis throws", async () => {
    const incr = vi.fn().mockRejectedValue(new Error("redis unreachable"));
    const sadd = vi.fn().mockRejectedValue(new Error("redis unreachable"));
    const { recordVisit, getVisitCountToday } = await mockCacheAndImport({
      incr,
      sadd,
      expire: vi.fn(),
    });

    await recordVisit("hash-a");

    expect(await getVisitCountToday()).toBe(1);
  });

  it("getUniqueVisitCountToday reads SCARD from Redis when available", async () => {
    const scard = vi.fn().mockResolvedValue(42);
    const { getUniqueVisitCountToday } = await mockCacheAndImport({ scard });

    expect(await getUniqueVisitCountToday()).toBe(42);
  });

  it("getUniqueVisitCountToday falls back to the local set when the Redis read throws", async () => {
    const scard = vi.fn().mockRejectedValue(new Error("redis unreachable"));
    const sadd = vi.fn().mockRejectedValue(new Error("redis unreachable"));
    const { recordVisit, getUniqueVisitCountToday } = await mockCacheAndImport({
      scard,
      sadd,
      incr: vi.fn().mockRejectedValue(new Error("redis unreachable")),
      expire: vi.fn(),
    });

    await recordVisit("hash-a");

    expect(await getUniqueVisitCountToday()).toBe(1);
  });

  it("resets both counters when the day rolls over", async () => {
    const { recordVisit, getVisitCountToday, getUniqueVisitCountToday } =
      await mockCacheAndImport(null);

    await recordVisit("hash-a");
    await recordVisit("hash-b");
    expect(await getVisitCountToday()).toBe(2);
    expect(await getUniqueVisitCountToday()).toBe(2);

    vi.setSystemTime(new Date("2026-07-16T00:00:01Z"));

    expect(await getVisitCountToday()).toBe(0);
    expect(await getUniqueVisitCountToday()).toBe(0);

    await recordVisit("hash-c");
    expect(await getVisitCountToday()).toBe(1);
  });
});
