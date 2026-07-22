import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mirrors gnewsUsage.test.ts/newsdataUsage.test.ts — same budget-guard
// shape, separate daily counter and cap (900) since Currents' free tier
// (1,000/day) is independent of the other two sources.
async function mockCacheAndImport(redis: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/cache", () => ({ redis }));
  return import("./currentsUsage");
}

describe("currentsUsage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recordCurrentsCall increments the shared Redis counter and returns the global count", async () => {
    const incr = vi.fn().mockResolvedValue(5);
    const expire = vi.fn();
    const { recordCurrentsCall } = await mockCacheAndImport({ incr, expire });

    const count = await recordCurrentsCall("test");

    expect(count).toBe(5);
    expect(incr).toHaveBeenCalledWith("currents-usage:2026-07-15");
    expect(expire).not.toHaveBeenCalled();
  });

  it("falls back to a local in-memory tally when Redis is unavailable", async () => {
    const { recordCurrentsCall } = await mockCacheAndImport(null);

    expect(await recordCurrentsCall("a")).toBe(1);
    expect(await recordCurrentsCall("b")).toBe(2);
  });

  it("isOverDailyBudget is false below the safe daily budget", async () => {
    const get = vi.fn().mockResolvedValue(899);
    const { isOverDailyBudget } = await mockCacheAndImport({ get });

    expect(await isOverDailyBudget()).toBe(false);
  });

  it("isOverDailyBudget is true at or above the safe daily budget (900)", async () => {
    const get = vi.fn().mockResolvedValue(900);
    const { isOverDailyBudget } = await mockCacheAndImport({ get });

    expect(await isOverDailyBudget()).toBe(true);
  });

  it("resets the local tally when the day rolls over", async () => {
    const { recordCurrentsCall, getCurrentsCallCountToday } = await mockCacheAndImport(null);

    await recordCurrentsCall("a");
    await recordCurrentsCall("b");
    expect(await getCurrentsCallCountToday()).toBe(2);

    vi.setSystemTime(new Date("2026-07-16T00:00:01Z"));

    expect(await getCurrentsCallCountToday()).toBe(0);
  });
});
