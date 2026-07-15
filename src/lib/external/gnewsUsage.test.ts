import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The budget guard is what stops an enhancement feature from silently
// exhausting the free-tier GNews cap the baseline events-pool refresh
// depends on — worth covering both the shared-Redis path and the
// local-fallback path it degrades to when Redis is unavailable or
// throws.
async function mockCacheAndImport(redis: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/cache", () => ({ redis }));
  return import("./gnewsUsage");
}

describe("gnewsUsage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recordGNewsCall increments the shared Redis counter and returns the global count", async () => {
    const incr = vi.fn().mockResolvedValue(5);
    const expire = vi.fn();
    const { recordGNewsCall } = await mockCacheAndImport({ incr, expire });

    const count = await recordGNewsCall("test");

    expect(count).toBe(5);
    expect(incr).toHaveBeenCalledWith("gnews-usage:2026-07-15");
    expect(expire).not.toHaveBeenCalled();
  });

  it("sets a TTL on the day-counter key only on its first increment", async () => {
    const incr = vi.fn().mockResolvedValue(1);
    const expire = vi.fn();
    const { recordGNewsCall } = await mockCacheAndImport({ incr, expire });

    await recordGNewsCall("test");

    expect(expire).toHaveBeenCalledWith("gnews-usage:2026-07-15", 60 * 60 * 48);
  });

  it("falls back to a local in-memory tally when Redis is unavailable", async () => {
    const { recordGNewsCall } = await mockCacheAndImport(null);

    expect(await recordGNewsCall("a")).toBe(1);
    expect(await recordGNewsCall("b")).toBe(2);
    expect(await recordGNewsCall("c")).toBe(3);
  });

  it("falls back to the local tally when Redis throws", async () => {
    const incr = vi.fn().mockRejectedValue(new Error("redis unreachable"));
    const { recordGNewsCall } = await mockCacheAndImport({ incr, expire: vi.fn() });

    const count = await recordGNewsCall("test");

    expect(count).toBe(1);
  });

  it("isOverDailyBudget is false below the safe daily budget", async () => {
    const get = vi.fn().mockResolvedValue(84);
    const { isOverDailyBudget } = await mockCacheAndImport({ get });

    expect(await isOverDailyBudget()).toBe(false);
  });

  it("isOverDailyBudget is true at or above the safe daily budget (85)", async () => {
    const get = vi.fn().mockResolvedValue(85);
    const { isOverDailyBudget } = await mockCacheAndImport({ get });

    expect(await isOverDailyBudget()).toBe(true);
  });

  it("getGNewsCallCountToday falls back to the local tally when the Redis read throws", async () => {
    const get = vi.fn().mockRejectedValue(new Error("redis unreachable"));
    const incr = vi.fn().mockRejectedValue(new Error("redis unreachable"));
    const { recordGNewsCall, getGNewsCallCountToday } = await mockCacheAndImport({ get, incr });

    await recordGNewsCall("test"); // local tally now at 1, since incr also throws
    expect(await getGNewsCallCountToday()).toBe(1);
  });

  it("resets the local tally when the day rolls over", async () => {
    const { recordGNewsCall, getGNewsCallCountToday } = await mockCacheAndImport(null);

    await recordGNewsCall("a");
    await recordGNewsCall("b");
    expect(await getGNewsCallCountToday()).toBe(2);

    vi.setSystemTime(new Date("2026-07-16T00:00:01Z"));

    expect(await getGNewsCallCountToday()).toBe(0);
    expect(await recordGNewsCall("c")).toBe(1);
  });
});
