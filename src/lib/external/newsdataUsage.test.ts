import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mirrors gnewsUsage.test.ts — same budget-guard shape, separate daily
// counter and cap (150) since NewsData.io's free tier (200/day) is
// independent of GNews's.
async function mockCacheAndImport(redis: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/cache", () => ({ redis }));
  return import("./newsdataUsage");
}

describe("newsdataUsage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recordNewsDataCall increments the shared Redis counter and returns the global count", async () => {
    const incr = vi.fn().mockResolvedValue(5);
    const expire = vi.fn();
    const { recordNewsDataCall } = await mockCacheAndImport({ incr, expire });

    const count = await recordNewsDataCall("test");

    expect(count).toBe(5);
    expect(incr).toHaveBeenCalledWith("newsdata-usage:2026-07-15");
    expect(expire).not.toHaveBeenCalled();
  });

  it("falls back to a local in-memory tally when Redis is unavailable", async () => {
    const { recordNewsDataCall } = await mockCacheAndImport(null);

    expect(await recordNewsDataCall("a")).toBe(1);
    expect(await recordNewsDataCall("b")).toBe(2);
  });

  it("isOverDailyBudget is false below the safe daily budget", async () => {
    const get = vi.fn().mockResolvedValue(149);
    const { isOverDailyBudget } = await mockCacheAndImport({ get });

    expect(await isOverDailyBudget()).toBe(false);
  });

  it("isOverDailyBudget is true at or above the safe daily budget (150)", async () => {
    const get = vi.fn().mockResolvedValue(150);
    const { isOverDailyBudget } = await mockCacheAndImport({ get });

    expect(await isOverDailyBudget()).toBe(true);
  });

  it("resets the local tally when the day rolls over", async () => {
    const { recordNewsDataCall, getNewsDataCallCountToday } = await mockCacheAndImport(null);

    await recordNewsDataCall("a");
    await recordNewsDataCall("b");
    expect(await getNewsDataCallCountToday()).toBe(2);

    vi.setSystemTime(new Date("2026-07-16T00:00:01Z"));

    expect(await getNewsDataCallCountToday()).toBe(0);
  });
});
