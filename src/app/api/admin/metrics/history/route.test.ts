import { afterEach, describe, expect, it, vi } from "vitest";

const mget = vi.fn();
const scard = vi.fn();

vi.mock("@/lib/cache", () => ({
  redis: { mget, scard },
}));
vi.mock("@/lib/external/anthropicUsage", () => ({
  dailySummaryCap: vi.fn().mockReturnValue(300),
  dailyFramingCap: vi.fn().mockReturnValue(50),
}));

function request(url: string, token?: string): Request {
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  return new Request(url, { headers });
}

describe("GET /api/admin/metrics/history", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mget.mockReset();
    scard.mockReset();
  });

  it("returns 404 when METRICS_API_TOKEN is not configured", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "");
    const { GET } = await import("./route");

    const response = await GET(request("https://example.com/api/admin/metrics/history", "anything"));

    expect(response.status).toBe(404);
  });

  it("returns 401 when the bearer token doesn't match", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    const { GET } = await import("./route");

    const response = await GET(
      request("https://example.com/api/admin/metrics/history", "wrong-token")
    );

    expect(response.status).toBe(401);
  });

  it("returns one entry per requested day, oldest first, with an estimated cost", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    // 3 dates requested → every per-metric mget call gets 3 values back.
    mget.mockResolvedValue([1, 2, 3]);
    scard.mockResolvedValue(0);
    const { GET } = await import("./route");

    const response = await GET(
      request("https://example.com/api/admin/metrics/history?days=3", "secret-token")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.days).toHaveLength(3);
    expect(body.days[0].date < body.days[2].date).toBe(true);
    // summaries=1, framing=1 on the first day → 0.002 + 0.03
    expect(body.days[0].summaries).toBe(1);
    expect(body.days[0].framing).toBe(1);
    expect(body.days[0].estimatedCostUsd).toBeCloseTo(0.032, 5);
    expect(body.caps).toEqual({ gnews: 85, newsdata: 150, currents: 900, summaries: 300, framing: 50 });
  });

  it("clamps days to the 1–90 range", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    mget.mockResolvedValue([]);
    scard.mockResolvedValue(0);
    const { GET } = await import("./route");

    const response = await GET(
      request("https://example.com/api/admin/metrics/history?days=9000", "secret-token")
    );
    const body = await response.json();

    expect(body.days).toHaveLength(90);
  });

  it("degrades to all-zero days when Redis is unavailable", async () => {
    vi.stubEnv("METRICS_API_TOKEN", "secret-token");
    vi.doMock("@/lib/cache", () => ({ redis: null }));
    vi.resetModules();
    const { GET } = await import("./route");

    const response = await GET(
      request("https://example.com/api/admin/metrics/history?days=2", "secret-token")
    );
    const body = await response.json();

    expect(body.days).toHaveLength(2);
    expect(body.days[0]).toMatchObject({
      visits: 0,
      uniqueVisits: 0,
      gnews: 0,
      estimatedCostUsd: 0,
    });
  });
});
