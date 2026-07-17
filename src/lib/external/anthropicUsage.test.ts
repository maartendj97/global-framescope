import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mirrors gnewsUsage.test.ts's mocking pattern. Scoped to the framing cap
// (new in this change) — the existing summary cap functions are already
// covered by production usage and country-summary/route.test.ts's use of
// this module's behavior indirectly.
async function mockCacheAndImport(redis: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/cache", () => ({ redis }));
  return import("./anthropicUsage");
}

describe("anthropicUsage — framing cap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recordFramingGeneration increments the shared Redis counter under its own key", async () => {
    const incr = vi.fn().mockResolvedValue(3);
    const expire = vi.fn();
    const { recordFramingGeneration } = await mockCacheAndImport({ incr, expire });

    const count = await recordFramingGeneration("test");

    expect(count).toBe(3);
    expect(incr).toHaveBeenCalledWith("anthropic-framing-usage:2026-07-17");
  });

  it("is independent from the summary cap's counter key", async () => {
    const incr = vi.fn().mockResolvedValue(1);
    const { recordFramingGeneration } = await mockCacheAndImport({ incr, expire: vi.fn() });

    await recordFramingGeneration("test");

    expect(incr).not.toHaveBeenCalledWith("anthropic-usage:2026-07-17");
  });

  it("falls back to a local in-memory tally when Redis is unavailable", async () => {
    const { recordFramingGeneration } = await mockCacheAndImport(null);

    expect(await recordFramingGeneration("a")).toBe(1);
    expect(await recordFramingGeneration("b")).toBe(2);
  });

  it("isOverDailyFramingCap is false below the default cap (50)", async () => {
    const get = vi.fn().mockResolvedValue(49);
    const { isOverDailyFramingCap } = await mockCacheAndImport({ get });

    expect(await isOverDailyFramingCap()).toBe(false);
  });

  it("isOverDailyFramingCap is true at or above the default cap (50)", async () => {
    const get = vi.fn().mockResolvedValue(50);
    const { isOverDailyFramingCap } = await mockCacheAndImport({ get });

    expect(await isOverDailyFramingCap()).toBe(true);
  });

  it("dailyFramingCap reads the ANTHROPIC_DAILY_FRAMING_CAP env override", async () => {
    vi.stubEnv("ANTHROPIC_DAILY_FRAMING_CAP", "10");
    const { dailyFramingCap } = await mockCacheAndImport(null);

    expect(dailyFramingCap()).toBe(10);

    vi.unstubAllEnvs();
  });

  it("resets the local tally when the day rolls over", async () => {
    const { recordFramingGeneration, isOverDailyFramingCap } = await mockCacheAndImport(null);

    for (let i = 0; i < 50; i++) await recordFramingGeneration("x");
    expect(await isOverDailyFramingCap()).toBe(true);

    vi.setSystemTime(new Date("2026-07-18T00:00:01Z"));

    expect(await isOverDailyFramingCap()).toBe(false);
  });
});
