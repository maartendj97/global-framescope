import { describe, expect, it, vi } from "vitest";

async function mockCacheAndImport(redis: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/cache", () => ({ redis }));
  return import("./errorLog");
}

describe("errorLog", () => {
  it("recordError pushes an entry and trims the list to the cap", async () => {
    const lpush = vi.fn().mockResolvedValue(1);
    const ltrim = vi.fn().mockResolvedValue("OK");
    const { recordError } = await mockCacheAndImport({ lpush, ltrim });

    await recordError("gnews", "fetch failed");

    expect(lpush).toHaveBeenCalledWith(
      "error-log",
      expect.objectContaining({ source: "gnews", message: "fetch failed" })
    );
    expect(ltrim).toHaveBeenCalledWith("error-log", 0, 199);
  });

  it("truncates overly long messages", async () => {
    const lpush = vi.fn().mockResolvedValue(1);
    const ltrim = vi.fn().mockResolvedValue("OK");
    const { recordError } = await mockCacheAndImport({ lpush, ltrim });

    await recordError("gnews", "x".repeat(1000));

    const entry = lpush.mock.calls[0][1] as { message: string };
    expect(entry.message).toHaveLength(500);
  });

  it("is a no-op when Redis is unavailable", async () => {
    const { recordError } = await mockCacheAndImport(null);

    await expect(recordError("gnews", "fetch failed")).resolves.toBeUndefined();
  });

  it("getRecentErrors returns entries from Redis", async () => {
    const entries = [
      { timestamp: "2026-07-23T00:00:00.000Z", source: "gnews", message: "boom" },
    ];
    const lrange = vi.fn().mockResolvedValue(entries);
    const { getRecentErrors } = await mockCacheAndImport({ lrange });

    const result = await getRecentErrors(50);

    expect(result).toEqual(entries);
    expect(lrange).toHaveBeenCalledWith("error-log", 0, 49);
  });

  it("getRecentErrors clamps the limit to the 200-entry cap", async () => {
    const lrange = vi.fn().mockResolvedValue([]);
    const { getRecentErrors } = await mockCacheAndImport({ lrange });

    await getRecentErrors(9000);

    expect(lrange).toHaveBeenCalledWith("error-log", 0, 199);
  });

  it("getRecentErrors returns an empty array when Redis is unavailable", async () => {
    const { getRecentErrors } = await mockCacheAndImport(null);

    expect(await getRecentErrors()).toEqual([]);
  });
});

describe("describeError", () => {
  it("uses the Error message when given an Error", async () => {
    const { describeError } = await import("./errorLog");
    expect(describeError(new Error("boom"))).toBe("boom");
  });

  it("stringifies non-Error values", async () => {
    const { describeError } = await import("./errorLog");
    expect(describeError("plain string")).toBe("plain string");
  });
});
